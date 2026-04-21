# Executor Service — Refactoring: Worker Pool Orchestrator

> **Status: COMPLETED** — All phases (0–5) implemented. Executor now owns job/task/worker
> state in its own PostgreSQL database, manages a worker pool via `WorkerClient` abstraction,
> and runs alongside notifications (pure event fan-out) in a Docker Compose full-stack setup.

> **Related:** See [`services/notifications/REFACTORING.md`](../notifications/REFACTORING.md)
> for the notifications side of this split. The two documents are coupled — read both before
> starting implementation.

## Context

The executor service currently runs as a single-node worker: it receives one job at a time,
checks out the branch, and spawns `claude -p --dangerously-skip-permissions` as a local
subprocess for each task. This works but has three limitations:

1. **No parallelism** — one job at a time, one task at a time.
2. **No isolation** — Claude Code runs in the same filesystem and process space as the
   executor service itself. `--dangerously-skip-permissions` is only safe because we accept
   the blast radius.
3. **No orchestration** — job state and dispatch live in `notifications`, not here. The
   executor is a passive recipient of work, not a coordinator.

The goal of this refactoring is to turn the executor into an **orchestrator** that manages
a pool of Claude-as-container workers, while also absorbing the job/task state that
currently lives in `services/notifications`.

---

## Target architecture

```text
services/executor
  ├── Worker pool manager        — tracks available workers, assigns jobs
  ├── Job & task store (DB)      — owns jobs/tasks tables (moved from notifications)
  ├── Dispatch endpoint          — POST /dispatch (moved from notifications)
  ├── Job read endpoints         — GET /jobs, GET /jobs/:id, GET /jobs/:id/current-task
  └── Loop runner (unchanged)    — per-task claude invocation, now via WorkerClient
```

Workers are external processes — Docker containers or K8s pods — that accept work via a
`WorkerClient` abstraction. The loop runner (`src/loop/runner.ts`) is largely unchanged;
only the spawn call is replaced by a `WorkerClient.exec()` call.

---

## Worker abstraction

All worker backends implement the same `WorkerClient` interface:

```ts
interface WorkerClient {
  /** Unique identifier for this worker (container ID, pod name, etc.) */
  readonly workerId: string;

  /**
   * Prepare the workspace for a job. Called once per job before the task loop.
   * Returns the absolute path inside the worker where the repo is checked out.
   */
  prepareWorkspace(branch: string): Promise<string>;

  /**
   * Execute one claude invocation. Returns a process-like handle with piped
   * stdout/stderr and an exited promise — same shape as Bun.spawn output so
   * runner.ts stays unchanged.
   */
  exec(prompt: string, workDir: string): Promise<WorkerProcess>;

  /** Clean up workspace after a job completes or fails. */
  cleanWorkspace(): Promise<void>;

  /** Returns false if the worker is unreachable or unhealthy. */
  isHealthy(): Promise<boolean>;
}

interface WorkerProcess {
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number>;
  kill(): void;
}
```

### Implementations

| Class | Backend | When to use |
|-------|---------|-------------|
| `DockerExecWorkerClient` | `docker exec` via local CLI or Docker Engine HTTP API | Local development, single-machine |
| `HttpWorkerClient` | HTTP API exposed by the worker container/pod | K8s cluster (local network or cloud) |

The factory is injected at startup based on configuration, keeping `runner.ts` and
`dependency.ts` unaware of which backend is in use.

---

## Deployment scenarios

### Scenario A — Local executor + local Docker workers

**Setup:** Executor runs on the developer's machine. Workers are Docker containers on
the same machine, managed by the executor via the Docker Engine API or CLI.

**Worker lifecycle:**
- Executor maintains a pool of N pre-pulled containers (e.g., `ghcr.io/anthropics/claude-code:latest`).
- On job dispatch, executor claims an idle container.
- After job completion, executor wipes the workspace and returns the container to the pool.
- Containers are long-lived across jobs (no `docker run` per task — only `docker exec`).

**Workspace sync:**
- Bind-mount a per-job temp directory from the host into the container at `/workspace`.
- Executor does `git clone` + `git checkout` on the host-side dir before starting the loop.
- Because it is a bind mount, the executor can read PLAN_TRACKER.md changes made inside
  the container in real time.

**Worker client:** `DockerExecWorkerClient`

```sh
docker exec -i <containerId> claude -p --dangerously-skip-permissions
  stdin: prompt
  stdout/stderr: piped back to executor
  cwd: /workspace (bind-mounted)
```

**Auth:** Pass `ANTHROPIC_API_KEY` via `docker run -e ANTHROPIC_API_KEY` at container
start time (not per-exec).

**Isolation benefit:** Claude Code can only touch the bind-mounted workspace directory.
The executor's own filesystem and credentials are not accessible inside the container.

---

### Scenario B — Local executor + Kubernetes cluster workers (local network)

**Setup:** Executor runs on the developer's machine. Workers are pods in a Kubernetes
cluster reachable on the local network (e.g., a home lab or office cluster).

**Worker lifecycle:**
- Worker pods run a small HTTP server (a thin wrapper around `claude`) alongside the
  Claude Code image. They expose a stable API (see below).
- Pods register themselves with the executor on startup via `PUT /workers/:workerId`.
- The executor maintains the worker pool in its DB (`workers` table).
- On job dispatch, executor marks a worker `busy` and calls its HTTP API to start the loop.
- After job completion, the worker resets its workspace and notifies the executor it is idle.

**Worker HTTP API (exposed by each pod):**

```text
POST /exec          — run one claude invocation (body: { prompt, workDir })
                      returns: SSE stream of stdout/stderr lines + exit code
POST /workspace     — git clone + checkout branch (body: { repoUrl, branch })
                      returns: { workDir }
DELETE /workspace   — clean up workspace
GET  /health        — { status: 'idle' | 'busy', workerId }
```

This is the "very similar API" the user controls — it wraps the same `docker exec`
pattern but over HTTP so the executor doesn't need access to the Docker daemon.

**Workspace sync:**
- Worker pod does `git clone` + `git checkout` into a local directory on its own
  ephemeral volume.
- If multiple tasks in the same job need shared workspace state (PLAN_TRACKER.md),
  the workspace persists inside the pod for the duration of the job.
- Optional: mount a shared NFS/PVC so that the executor can also read tracker files
  directly (useful for status reporting without an extra HTTP round-trip).

**Worker client:** `HttpWorkerClient`

```ts
// executor → worker pod
POST http://<podIP>:8080/exec
{ prompt, workDir: '/workspace/repo' }

// response: SSE stream
data: {"stream":"stdout","line":"..."}
data: {"stream":"stderr","line":"..."}
data: {"exit":0}
```

**Auth:** `ANTHROPIC_API_KEY` is injected as a K8s Secret mounted into the pod env.
The executor does not need to pass it per-request.

---

### Scenario C — Cloud executor + cloud Docker workers

**Setup:** Executor runs as a cloud service (e.g., Cloud Run, ECS, or a K8s deployment).
Workers are containers in the same cloud environment.

**Worker lifecycle:**
- Same HTTP API as Scenario B — the worker exposes `POST /exec`, `POST /workspace`, etc.
- Cloud-specific differences:
  - Workers register via the same `PUT /workers/:workerId` API, but the executor's DB
    is a managed PostgreSQL instance (not local).
  - Worker containers may be managed by the cloud scheduler (ECS tasks, K8s pods in
    the same cluster) rather than self-registering from a fixed pool.
  - The executor can optionally call the cloud API (ECS RunTask, K8s Jobs) to scale
    workers on demand instead of maintaining a fixed pool.

**Workspace sync:**
- Shared volume (EFS, GCS Filestore, Azure Files) mounted into both executor and worker
  containers, or workers use git clone per job (simpler, no shared volume dependency).
- Git clone per job is the recommended default for cloud — it avoids cross-AZ volume
  latency and works with serverless/ephemeral workers.

**Worker client:** `HttpWorkerClient` (same as Scenario B — the cloud networking
difference is in configuration, not code).

**Auth:** `ANTHROPIC_API_KEY` injected via cloud secrets manager (AWS Secrets Manager,
GCP Secret Manager, etc.) into the worker container env. Same pattern as Scenario B.

---

## Summary: what changes per scenario

| | Scenario A (local + Docker) | Scenario B (local + K8s) | Scenario C (cloud + cloud) |
|---|---|---|---|
| Worker client | `DockerExecWorkerClient` | `HttpWorkerClient` | `HttpWorkerClient` |
| Worker registration | Executor manages pool directly | Pod calls `PUT /workers/:workerId` | Pod calls `PUT /workers/:workerId` |
| Workspace sync | Host bind-mount | git clone inside pod | git clone inside container |
| Worker auth | `docker run -e API_KEY` | K8s Secret | Cloud secrets manager |
| Worker scaling | Fixed pool (pre-started containers) | Fixed pool or manual scale | Fixed pool or cloud API scale |
| Exec mechanism | `docker exec -i` | HTTP POST `/exec` | HTTP POST `/exec` |

---

## What migrates from `notifications`

The following move into the executor. See
[`services/notifications/REFACTORING.md`](../notifications/REFACTORING.md) for the
notifications-side view.

| Source (notifications) | Destination (executor) | Notes |
|------------------------|------------------------|-------|
| `src/db/schema.ts` — `nodesTable` | executor DB — `workersTable` | Renamed; `address` becomes worker HTTP base URL |
| `src/db/schema.ts` — `jobsTable` | executor DB — `jobsTable` | Unchanged schema |
| `src/db/schema.ts` — `tasksTable` | executor DB — `tasksTable` | Unchanged schema |
| `src/store/nodes.ts` | `src/store/workers.ts` | Renamed + adapted for worker pool semantics |
| `src/store/tasks.ts` | `src/store/tasks.ts` | Moved as-is |
| `src/routes/nodes.ts` | merged into `src/routes/jobs.ts` | `/workers` registry + existing job dispatch |
| `src/routes/dispatch.ts` | merged into `src/routes/jobs.ts` | `POST /dispatch` now auto-selects from executor's own pool |
| `src/entity/plugins/executor.ts` | **deleted** | Job state is now tracked directly by the executor; not event-driven |

---

## Dispatch flow after refactoring

```text
Old:
  client
    → POST notifications/dispatch
    → notifications picks idle executor node
    → POST executor/jobs
    → executor spawns claude subprocess locally

New:
  client
    → POST executor/dispatch
    → executor picks idle worker from its pool
    → WorkerClient.prepareWorkspace(branch)  (once per job)
    → for each task: WorkerClient.exec(prompt, workDir)
    → executor updates job/task state directly in its own DB
    → executor emits events to notifications for SSE fan-out
```

---

## State tracking

Currently, job and task state in notifications is updated as a **side-effect of receiving
events** (`src/entity/plugins/executor.ts`). After this refactoring:

- The executor updates `jobs` and `tasks` rows **directly** at each state transition,
  inside the loop runner and dependency lifecycle hooks.
- Events are still emitted to `notifications` for SSE/webhook delivery, but notifications
  no longer writes back to any job/task tables.
- The executor's existing in-memory state (`activeLoopDep`, `activeJobId` in
  `src/routes/jobs.ts`) is replaced by the persistent DB — jobs survive executor restarts.

### Job restart behaviour on executor restart

With persistent state, a job that was `running` when the executor died becomes `blocked`
on restart (it cannot resume safely without knowing the worker's state). The executor
should on startup scan for jobs in `running` or `paused` state and transition them to
`blocked` with a reason of `executor restarted`.

---

## Files added to executor

| New file | Purpose |
|----------|---------|
| `src/workers/client.ts` | `WorkerClient` interface + `WorkerProcess` type |
| `src/workers/docker-exec.ts` | `DockerExecWorkerClient` implementation |
| `src/workers/http.ts` | `HttpWorkerClient` implementation |
| `src/workers/pool.ts` | `WorkerPool` — assignment, health checks, idle/busy state |
| `src/db/schema.ts` | Drizzle schema for `workers`, `jobs`, `tasks` (moved from notifications) |
| `src/store/workers.ts` | Worker CRUD (from `notifications/src/store/nodes.ts`) |
| `src/store/tasks.ts` | Task CRUD (moved from notifications) |

---

## When to do this

This refactoring is **not blocking** any current feature work. Natural triggers:

- You want to run more than one job in parallel, or
- You want isolation between Claude Code and the executor process, or
- You are doing the notifications split (the two go together — executor needs a DB
  before notifications can drop its job/task tables)

Start with **Scenario A** (local Docker) as it requires no cluster and validates the
`WorkerClient` abstraction before introducing HTTP-based workers.
