# services/executor — Headless Ralph Loop Service

Managed HTTP service that wraps the ralph loop for remote execution on cluster nodes (Raspberry Pis). Receives a job dispatch (branch + plan), validates prerequisites, and runs the loop headlessly — emitting structured activity events to the notification hub instead of printing to stdio.

## Architecture

```text
notifications service (services/notifications)
  → POST /jobs                       dispatch a job to this node
  ← POST /events/executor            this node streams loop events back
  ← POST /approvals                  this node registers approval requests
  ← GET  /approvals/:id/wait (SSE)   this node blocks until human decides

operator / CLI
  → GET  /jobs                       list jobs (with ?status= filter)
  → GET  /jobs/:jobId                inspect current job state
  → GET  /jobs/:jobId/current-task   get the currently running task
  → POST /jobs/:jobId/pause          pause after current task completes
  → POST /jobs/:jobId/resume         resume paused loop
  → POST /jobs/:jobId/cancel         kill active child process

worker management
  → GET    /workers                  list registered workers with status
  → PUT    /workers/:workerId        register a worker (local/docker/http)
  → DELETE /workers/:workerId        unregister a worker from the pool
```

The executor acts as an **orchestrator** with a **worker pool**. Jobs are dispatched to idle workers from the pool. `POST /jobs` returns `503` if no idle workers are available.

### Worker backends

| Mode | Class | Description |
|------|-------|-------------|
| `local` | `FallbackChainWorkerClient` | Default dev mode. Spawns AI CLI processes directly via the multi-backend fallback chain |
| `docker` | `DockerExecWorkerClient` | Runs AI CLI inside a pre-started Docker container via `docker exec -i` |
| `http` | `HttpWorkerClient` | Communicates with a remote worker over HTTP (stub — for K8s/cloud) |
| `stub` | `StubWorkerClient` | No-op client for simulation / dry-run mode |

A default worker is auto-registered at startup based on `WORKER_MODE` (defaults to `local`). Additional workers can be registered at runtime via `PUT /workers/:workerId`.

### Multi-backend fallback chain

In `local` mode, the executor uses a `FallbackChainWorkerClient` that supports multiple AI CLI backends (Claude, Gemini, Codex) behind a single `WorkerClient` interface. The runner, pool, and dependency layers are unaware of backend identity.

**Supported backends:**

| Backend | Command | Output format | Auto-approve flag |
|---------|---------|---------------|-------------------|
| Claude | `claude` | `stream-json` | `--dangerously-skip-permissions` |
| Gemini | `gemini` | `text` | `--yolo` |
| Codex | `codex` | `text` | _(none)_ |

**How it works:**

1. At startup, `BackendDetector` scans PATH for available CLI binaries and logs them
2. `BackendFactory` creates `BackendDescriptor` configs for each detected backend
3. `FallbackChainWorkerClient` wraps them in priority order (Claude first, then Gemini, then Codex)
4. On each invocation, the chain selects the first backend with a closed circuit breaker
5. On retryable failures (`rate_limit`, `unknown`), the chain falls back to the next backend with exponential backoff
6. On non-retryable failures (`auth_failure`, `task_error`), the error propagates immediately

**Error classification** (`classifyExitError`):

| Class | Detection | Fallback behavior |
|-------|-----------|-------------------|
| `auth_failure` | Exit code 41 or stderr matches auth/401 pattern | Propagate immediately |
| `rate_limit` | Stderr matches 429/rate-limit/quota/resource-exhausted pattern | Retry next backend |
| `task_error` | Stderr matches 400/invalid-request/context-length pattern | Propagate immediately |
| `unknown` | Default fallthrough | Retry next backend |

**Circuit breaker** — per-backend, opens after 3 consecutive failures, cool-down 60s, then half-open probe.

**Observability** — `FallbackEventSink` emits structured events (`backend_selected`, `backend_failed`, `backend_fallback`, `chain_exhausted`, `chain_success`) at each decision point. Default `ConsoleFallbackEventSink` logs to console.

**Per-hat backend override** — hat/agent configs can include a `backend` field (string name or full `BackendDescriptor`) to prepend a specific backend to the fallback chain for that hat's invocations.

**Custom backends** — operators can supply a full `BackendDescriptor` for unlisted CLIs:

```typescript
{
  name: 'my-llm',
  command: '/usr/local/bin/my-llm',
  args: ['--no-confirm'],
  promptMode: 'flag',        // 'flag' | 'stdin' | 'positional'
  outputFormat: 'text',      // 'text' | 'stream-json' | 'pi-stream-json' | 'acp'
  envVars: { MY_API_KEY: '...' }
}
```

---

## Directory structure

```text
services/executor/
├── index.ts                         # createService entry point
├── .env.example                     # Environment variable template
├── docker-compose.yml               # PostgreSQL 16 for local dev (port 5434)
├── drizzle.config.ts                # Drizzle Kit configuration
├── drizzle/                         # Auto-generated SQL migrations
├── scripts/
│   └── start-workers.sh             # Start N Docker workers and register them
└── src/
    ├── types.ts                     # JobParams, JobState, ExecutorEvent, ApprovalRequest
    ├── startup.ts                   # recoverInterruptedJobs (crash recovery)
    ├── db/
    │   ├── schema.ts                # Drizzle schema: workers, jobs, tasks tables
    │   └── index.ts                 # createDbDependency (Pool + Drizzle)
    ├── store/
    │   ├── workers.ts               # Worker CRUD (upsert, list, find idle, set status)
    │   ├── jobs.ts                  # Job CRUD (create, get, list, update status/counts)
    │   └── tasks.ts                 # Task CRUD (create, update, get current)
    ├── notifications/
    │   └── client.ts                # NotificationClient interface + Stub + Http implementations
    ├── prerequisites/
    │   ├── parser.ts                # parse PREREQUISITES.md → PrerequisiteItem[]
    │   └── checker.ts               # run [auto] probes, coordinate [human] approvals
    ├── workers/
    │   ├── client.ts                # WorkerClient interface + WorkerProcess type
    │   ├── backend-descriptor.ts    # BackendDescriptor, OutputFormat, PromptMode types
    │   ├── backend-detector.ts      # PATH scan for available CLI binaries (with TTL cache)
    │   ├── backend-factory.ts       # Named backend presets (claude/gemini/codex) + custom
    │   ├── backoff.ts               # withExponentialBackoff utility (jitter, configurable)
    │   ├── circuit-breaker.ts       # Per-backend circuit breaker (threshold, cool-down)
    │   ├── error-classifier.ts      # classifyExitError → ErrorClass (auth/rate/task/unknown)
    │   ├── fallback-chain-worker-client.ts  # Multi-backend WorkerClient with retry + fallback
    │   ├── fallback-event-sink.ts   # Observability events for fallback chain decisions
    │   ├── gemini-spawn-worker-client.ts    # Gemini-specific WorkerClient
    │   ├── resolve-backend-override.ts      # Per-hat backend override resolution
    │   ├── stream-handler.ts        # StreamHandler interface + CompletionMeta type
    │   ├── parsers/
    │   │   ├── index.ts             # selectStreamParser(format) dispatcher
    │   │   ├── claude-stream-parser.ts  # NDJSON parser for Claude stream-json output
    │   │   └── text-stream-parser.ts    # Pass-through parser for plain-text backends
    │   ├── local-spawn.ts           # LocalSpawnWorkerClient (Bun.spawn, single-backend)
    │   ├── docker-exec.ts           # DockerExecWorkerClient (docker exec -i)
    │   ├── http.ts                  # HttpWorkerClient stub (Scenarios B/C)
    │   ├── stub.ts                  # StubWorkerClient (DRY_RUN / simulator)
    │   └── pool.ts                  # WorkerPool (claim/release/health check)
    ├── loop/
    │   ├── plan.ts                  # shared plan-file helpers (findNextTask, countTasks, …)
    │   ├── runner.ts                # core loop logic — uses WorkerClient.exec()
    │   ├── dependency.ts            # createDependency wrapping the runner
    │   └── simulator.ts             # simulation mode — same interface, no claude invocation
    └── routes/
        ├── jobs.ts                  # POST /jobs, GET /jobs/:jobId, pause/resume/cancel
        └── workers.ts               # PUT/GET/DELETE /workers — pool management
```

---

## Environment variables

See `.env.example`. Copy to `.env` before running locally.

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4300` | HTTP listen port |
| `NODE_ID` | `local` | Identifier registered with the notification service via `PUT /nodes/:nodeId` |
| `REPO_PATH` | `process.cwd()` | Absolute path to the local git checkout this node will work in |
| `NOTIFICATION_URL` | _(absent)_ | Base URL of `services/notifications`. When absent, the stub client is used (console-only) |
| `DATABASE_URL` | `postgresql://executor:executor@localhost:5434/executor` | PostgreSQL connection string for job/task/worker state |
| `DRY_RUN` | `false` | Set to `true` to run the service in simulation mode (see [Simulation mode](#simulation-mode)) |
| `WORKER_MODE` | `local` | **Deprecated.** Default worker type for the legacy multi-backend path. Use `RUN_MODE` instead |

### Run mode (new)

| Variable | Default | Description |
|----------|---------|-------------|
| `RUN_MODE` | _(absent)_ | Worker management strategy: `local`, `docker`, `remote`, `serverless`. When set, overrides `WORKER_MODE`. When absent, falls back to deprecated `WORKER_MODE` path |
| `DEFAULT_MODEL` | `sonnet` | Model preset name from the approved registry (`@open-tomato/worker-protocol`). Used by `TaskWorkerCliClient` in local mode |
| `TASK_WORKER_CLI_PATH` | `../task-worker/cli.ts` | Path to the task-worker CLI entry point. Only used when `RUN_MODE=local` |
| `MAX_LOCAL_WORKERS` | `1` | Number of concurrent local CLI workers to register. Only used when `RUN_MODE=local` |

**Run modes:**

| Mode | Worker client | Description |
|------|--------------|-------------|
| `local` | `TaskWorkerCliClient` | Spawns `bun cli.ts exec` as subprocess per task. Each invocation gets an isolated temp directory |
| `docker` | `TaskWorkerHttpClient` | Workers register via `PUT /workers/:workerId { type: 'task-worker' }`. Executor can spawn/destroy containers |
| `remote` | `TaskWorkerHttpClient` | Workers self-register. No lifecycle management |
| `serverless` | _(stub)_ | Future: invoke lambda per task |

### Simulation mode

These variables are only read when simulation mode is active (see below).

| Variable | Default | Description |
|----------|---------|-------------|
| `SIMULATOR_TASK_INTERVAL_MS` | `3000` | Time to wait between tasks (ms). Ignored when `SIMULATOR_TOTAL_MS` is set |
| `SIMULATOR_TOTAL_MS` | _(absent)_ | Total simulated run-time (ms) divided equally among all tasks. Overrides `SIMULATOR_TASK_INTERVAL_MS` |
| `SIMULATOR_FAIL_AFTER` | `0` | Inject a failure after this many tasks complete successfully. `0` means no failure |
| `SIMULATOR_FAIL_REASON` | `task-exit` | What kind of failure to simulate. See [failure modes](#failure-modes) below |

---

## Dev setup

### 1. Configure environment

```sh
cp .env.example .env
# edit .env — set REPO_PATH to your local checkout, NODE_ID to match your node
```

### 2. Start PostgreSQL

```sh
bun db:start    # starts Postgres 16 on port 5434 via Docker Compose
bun db:migrate  # applies Drizzle migrations
```

Other database commands: `bun db:stop`, `bun db:reset` (destroys data), `bun db:generate` (create new migration after schema changes).

### 3. Start the service

```sh
bun run dev     # hot-reload dev server
bun run start   # production
```

The service starts on port **4300**. `GET /health` returns `{ status: 'ok' }`.

### 3. Register with notifications (optional)

If running with a live notification service, register this node before dispatching jobs:

```sh
curl -X PUT http://localhost:4400/nodes/pi-01 \
  -H 'Content-Type: application/json' \
  -d '{ "address": "http://localhost:4300", "status": "idle" }'
```

---

## Simulation mode

When simulation mode is enabled the service behaves identically from the outside — same HTTP API, same lifecycle controls, same event stream — but no `claude` process is ever spawned. Tasks are read from the real `PLAN.md` (and `PLAN_TRACKER.md`) and iterated with a configurable delay, emitting the same events and updating the tracker file as if real work had been done.

This is useful for:
- Local development without a real repo or claude binary
- Testing the notification service, frontend, or operator tooling end-to-end
- Demoing the full system without running AI workloads

### Enabling simulation mode

**Via CLI flag** (takes effect for that single process):

```sh
bun run start --dry-run
```

**Via environment variable** (persists across restarts):

```sh
DRY_RUN=true bun run start
```

Both are equivalent. The flag takes precedence if both are set.

### Configuring timing

```sh
# Fixed 5 s between each task (default is 3 s)
SIMULATOR_TASK_INTERVAL_MS=5000 DRY_RUN=true bun run start

# Complete all tasks in 60 s total, spread evenly
SIMULATOR_TOTAL_MS=60000 DRY_RUN=true bun run start
```

`SIMULATOR_TOTAL_MS` overrides `SIMULATOR_TASK_INTERVAL_MS`. If the plan has 6 tasks and `SIMULATOR_TOTAL_MS=60000`, each task takes ~10 s. Within each task interval, 4 log events are emitted at equal sub-intervals to simulate streaming output.

### Failure modes

Set `SIMULATOR_FAIL_REASON` to simulate different failure scenarios.

| `SIMULATOR_FAIL_REASON` | When it fires | Effect |
|-------------------------|--------------|--------|
| `task-exit` _(default)_ | After `SIMULATOR_FAIL_AFTER` tasks complete | Emits `task.failed` (exitCode 1) then `loop.cancelled`; status → `blocked` |
| `workspace` | At job startup (ignores `SIMULATOR_FAIL_AFTER`) | Workspace preparation throws; `onStart` rejects; status → `failed`; `POST /jobs` returns `422` |
| `prerequisites` | At job startup, after emitting pending checks (ignores `SIMULATOR_FAIL_AFTER`) | First prerequisite item fails; emits `loop.cancelled`; status → `failed` |

Examples:

```sh
# Fail the 3rd task with a non-zero exit code
SIMULATOR_FAIL_AFTER=2 SIMULATOR_FAIL_REASON=task-exit DRY_RUN=true bun run start

# Fail immediately on workspace preparation
SIMULATOR_FAIL_REASON=workspace DRY_RUN=true bun run start

# Fail during prerequisites check
SIMULATOR_FAIL_REASON=prerequisites DRY_RUN=true bun run start
```

### Pause / resume / cancel in simulation mode

All lifecycle controls work exactly as in production:

- `POST /jobs/:jobId/pause` — the simulated loop checks the pause flag between tasks and blocks on the resume signal; log output stops during the pause.
- `POST /jobs/:jobId/resume` — resumes from the next task.
- `POST /jobs/:jobId/cancel` — sets the cancelled flag and unblocks any pending pause; the simulator marks the current task as `[BLOCKED]` and emits `loop.cancelled`.

### Prerequisites in simulation mode

If `PREREQUISITES.md` is present in the repo, the simulator reads and parses it (using the same `parsePrerequisites` parser as the real runner), emits `prerequisite.check { result: 'pending' }` for each item, then emits `prerequisite.check { result: 'pass' }` for all — no probes are actually run. The `prerequisites` failure mode overrides this and fails the first item instead.

---

## API reference

### Jobs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/jobs` | Dispatch a job to this node. `409` if already busy |
| `GET` | `/jobs/:jobId` | Return current `JobState` |
| `POST` | `/jobs/:jobId/pause` | Pause after current task completes |
| `POST` | `/jobs/:jobId/resume` | Resume a paused loop |
| `POST` | `/jobs/:jobId/cancel` | Kill child process and cancel job |

#### `POST /jobs` request body

```json
{
  "jobId": "uuid",
  "branch": "feature/OPT-123",
  "planId": "OPT-123",
  "planChecksum": "sha256...",
  "confirmBeforeStart": false
}
```

All fields except `planChecksum` and `confirmBeforeStart` are required. Whether the job runs in simulation mode is determined by the service startup flag (`--dry-run` / `DRY_RUN=true`), not by the request body.

#### `GET /jobs/:jobId` response

```json
{
  "jobId": "uuid",
  "status": "running",
  "currentTask": "Implement the foo module",
  "taskIndex": 2,
  "tasksTotal": 8,
  "tasksCompleted": 1,
  "tasksFailed": 0,
  "startedAt": "2024-01-01T00:00:00.000Z",
  "completedAt": null,
  "branch": "feature/OPT-123"
}
```

---

## Job lifecycle

**Production mode:**

```text
POST /jobs received
  → pool.claimIdle() → 503 if no idle workers
  → workerClient.prepareWorkspace(branch)
  → parse PREREQUISITES.md (if present)
  → check prerequisites (auto probes + human approvals)
  → emit loop.started event
  → for each task in PLAN_TRACKER.md:
      → check isPaused() → await resume if paused
      → check isCancelled() → abort if cancelled
      → workerClient.exec(prompt, workDir) — backend-agnostic
      → stream stdout/stderr as log events
      → emit task.started / task.done / task.failed
  → emit loop.done
  → workerClient.cleanWorkspace()
  → pool.release(workerId)
```

**Simulation mode** (`--dry-run` / `DRY_RUN=true`):

```text
POST /jobs received
  → skip git operations
  → parse PREREQUISITES.md (if present) → emit pending + pass events (no probes run)
  → emit loop.started event
  → for each task in PLAN_TRACKER.md:
      → check isPaused() → await resume if paused
      → check isCancelled() → abort if cancelled
      → wait SIMULATOR_TASK_INTERVAL_MS (or SIMULATOR_TOTAL_MS / taskCount)
      → emit 4 log events spread across the interval
      → emit task.started / task.done / task.failed (if SIMULATOR_FAIL_AFTER reached)
  → emit loop.done
```

**Pause semantics** — pause takes effect *between* tasks. The current claude invocation is never interrupted; the loop checks the pause flag after each task completes.

**Cancel semantics** — the active child process is killed immediately via `proc.kill()`.

---

## PREREQUISITES.md format

The executor parses `PREREQUISITES.md` in the repo root before starting the loop. Supported tag syntax:

```markdown
## Automated Checks [auto]

- [ ] [auto] Node.js ≥ 20 is installed (`node --version`)
- [ ] [auto] Bun is installed (`bun --version`)

## Manual Steps [human]

- [ ] [human] Confirm database backup completed
- [ ] API keys configured in .env
```

**Tag resolution rules:**
1. Explicit `[auto]` or `[human]` on the checklist item takes priority.
2. Section header containing `[auto]` → items in that section default to `auto`.
3. Section header containing `Manual` or `Human` → items default to `human`.
4. No tag, no section default → conservatively treated as `human`.

**`[auto]` items** — the first backtick-wrapped string is extracted as the probe command (e.g. `` `bun --version` ``). The command is run via `Bun.spawn`. On failure, the executor attempts a single auto-fix (scoped claude invocation) then re-probes. Still failing → escalated as a `[human]` approval request.

**`[human]` items** — the executor emits a `prerequisite.check { result: 'pending' }` event and calls `requestApproval()`, blocking until the notification service delivers a decision.

---

## Notification client modes

### Stub (default — no `NOTIFICATION_URL`)

All events are logged as JSON to stdout. All approval requests are auto-granted with a console warning. Used for local dev and unit tests.

```text
[stub-approval] auto-granting: Confirm database backup completed
{"level":"info","jobId":"...","type":"loop.started","branch":"feature/OPT-123"}
```

### HTTP (real — `NOTIFICATION_URL` set)

Uses `@open-tomato/notifications-plugin-executor` under the hood:
- `emitEvent` → `POST /events/executor`
- `requestApproval` → `POST /approvals` then SSE wait on `GET /approvals/:requestId/wait`

---

## Key gotchas

- **Worker pool** — `POST /jobs` returns `503` if no idle workers are available. A default worker is auto-registered at startup based on `WORKER_MODE`.
- **Pause is between-task** — issuing pause while a claude invocation is running does not interrupt it. The pause takes effect when that task finishes.
- **Workspace preparation** — handled by `WorkerClient.prepareWorkspace()`. For local mode, this runs `git fetch/checkout/pull`. For Docker mode, it clones into a host temp dir bind-mounted into the container.
- **Crash recovery** — on startup, the executor scans for jobs in `running`/`paused` state and transitions them to `blocked` with a `loop.cancelled` event.
- **Import extensions** — all internal imports use `.js` extensions (`import { foo } from './bar.js'`) even in TypeScript files (Bun + ESM requirement).
- **`NOTIFICATION_URL` absent** — stub mode is intentional for local dev. The service works fully without a running notification service.
- **Multi-backend detection** — at startup in `local` mode, the executor auto-detects available CLI backends (claude, gemini, codex) via PATH scan. If none are found, it falls back to the Claude descriptor without an availability check. Check `[executor] detected backends:` log line to verify detection.
- **Backend exit codes** — all three CLIs (Claude, Gemini, Codex) use exit code `1` for rate-limit errors (no dedicated code). Classification relies on stderr text pattern matching, not exit codes. Exit code `41` is Gemini-specific for auth failures.
- **Circuit breaker state is in-memory** — circuit breaker state does not persist across restarts. All backends start with closed circuits on each fresh boot.
