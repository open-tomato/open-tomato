# Notifications Service — Planned Split

> **Status: COMPLETED** — Job orchestration (nodes/jobs/tasks tables, dispatch, side-effects)
> has been moved to the executor service. Notifications is now a pure event fan-out + approvals
> service. See migration `0002_nice_xavin.sql` for the schema changes.

> **Related:** See [`services/executor/REFACTORING.md`](../executor/REFACTORING.md) for the
> executor's evolution into a job orchestrator with a Docker/K8s worker pool. The two
> refactorings are coupled: responsibilities that were originally planned for `job-manager`
> now go to `executor` instead.

## Context

The `services/notifications` service has grown to own two distinct concerns:

1. **Event fan-out / notifications** — receiving events from producers (executors),
   persisting them to the `events` table, and streaming them in real-time to SSE
   subscribers. Also handles webhook delivery and approval inbox management.

2. **Job orchestration** — cluster node registry (`nodes` table), job lifecycle state
   machine (`jobs` table, status transitions), task tracking (`tasks` table), and
   job dispatch (`POST /dispatch`, `GET /jobs`, `GET /jobs/:id/current-task`).

These concerns have different scaling characteristics, different change frequencies, and
different ownership boundaries. The split is planned but not yet started.

---

## Revised target architecture

```text
services/notifications   →  pure event fan-out service  (unchanged goal)
services/executor        →  job orchestration + worker pool  (absorbs planned job-manager)
```

The originally planned `services/job-manager` is **superseded**. Once the executor manages
a pool of Claude-as-container workers, it already owns all the state that `job-manager`
would have owned. Introducing a third service adds a network hop with no benefit. The full
reasoning and executor-side plan are in `services/executor/REFACTORING.md`.

### `services/notifications` (stays, stripped down)

Responsibilities after the split:

- Receive `POST /events/:kind` — validate, persist to `events`, fan-out to SSE subscribers
- `GET /events/:kind/:jobId` — SSE subscription endpoint (history replay + live stream)
- `GET /events/:kind/:jobId/history` — REST history endpoint
- Webhook delivery (entity plugin `webhook.ts`)
- Approval inbox (`POST /approvals/:id/decide`, `GET /approvals`)
- Entity plugin registry (validation of event payloads per entity kind)

Tables retained: `events`, `approvals`

### `services/executor` (grows — see its REFACTORING.md)

Absorbs from notifications:

- Worker pool registry (replaces the `nodes` table)
- Job dispatch (`POST /dispatch`)
- Job lifecycle state machine (`jobs` table)
- Task tracking (`tasks` table)
- Job read endpoints (`GET /jobs`, `GET /jobs/:jobId`, `GET /jobs/:jobId/current-task`)

---

## Migration strategy

### Event side-effects

Currently `POST /events/:kind` in notifications does three things at once:

1. Persist the event
2. Fan-out to SSE bus
3. Update job/task state (side-effects in `src/entity/plugins/executor.ts`)

After the split, step 3 is **dropped from notifications entirely**. The executor tracks
its own job and task state directly as it orchestrates workers — it no longer relies on
events bouncing back through notifications to drive its state machine.

`src/entity/plugins/executor.ts` is deleted, not moved.

### Foreign keys

The `events.job_id` FK currently references `jobs.id` in the same DB. After the split,
`jobs` lives in the executor's DB. Options:

- Keep a shared PostgreSQL database with cross-schema FKs (simplest short-term)
- Drop the FK and treat `job_id` as a soft reference (UUID passed by convention)
- Use a separate events DB in notifications with no FK (events reference a logical job ID)

Recommended short-term: **drop the FK constraint**, keep `job_id` as a text/UUID field
validated at the application layer. Postgres FK integrity is less important than service
independence.

### SSE endpoint ownership

`GET /events/:kind/:jobId` (SSE) is consumed by:
- `apps/tech-tree` via `TechTreeNotificationClient.subscribeToFeed()`
- `apps/tech-tree` via `ActivityDrawer` / `JobStream`

These clients must continue to point at the same URL after the split. SSE stays in
`notifications`. The executor emits events via `POST /events/:kind` to notifications
exactly as it does today — this path is unchanged.

---

## Files that move to `executor`

| Current location (notifications) | Destination |
|----------------------------------|-------------|
| `src/db/schema.ts` — `nodesTable`, `jobsTable`, `tasksTable` | executor DB schema |
| `src/store/nodes.ts` | executor store (becomes worker pool store) |
| `src/store/tasks.ts` | executor store |
| `src/routes/nodes.ts` — `/nodes` and `/jobs` routers | executor routes |
| `src/routes/dispatch.ts` | executor routes (merges with existing `routes/jobs.ts`) |

## Files deleted (not moved)

| File | Reason |
|------|--------|
| `src/entity/plugins/executor.ts` | Job state side-effects move into the executor's own orchestration logic; no longer event-driven |

## Files that stay in `notifications`

| File | Stays because |
|------|---------------|
| `src/db/schema.ts` — `eventsTable`, `approvalsTable` | Core notification data |
| `src/store/events.ts` | Event persistence and history |
| `src/store/approvals.ts` | Approval inbox |
| `src/routes/events.ts` | SSE + event ingestion |
| `src/routes/approvals.ts` | Approval decisions |
| `src/sse/bus.ts` | In-process SSE fan-out |
| `src/entity/` — plugin registry + validation | Payload validation stays with ingestion |

---

## Consumer impact

`packages/notifications-plugin-tech-tree` wraps both services today under a single
`baseUrl`. After the split, the plugin needs to accept two URLs:

```ts
new TechTreeNotificationClient({
  notificationUrl: 'http://notifications:3200',
  executorUrl:     'http://executor:3100',   // replaces the planned job-manager URL
})
```

Methods that move to `executor`:
- `getActiveJobs()`
- `getJob()`
- `getJobCurrentTask()`
- `listWorkers()` (replaces `listNodes()`)
- `dispatchJob()`
- `pauseJob()` / `resumeJob()` / `cancelJob()`

Methods that stay in `notifications`:
- `subscribeToFeed()`
- `getEventHistory()`
- `getPendingApprovals()`
- `submitDecision()`

---

## When to do this

The split is **not blocking** any current feature work. Do it when:

- The notifications service becomes a bottleneck under load, or
- The executor worker-pool refactoring (see `services/executor/REFACTORING.md`) is
  underway — that is the natural trigger, since it requires a DB in the executor anyway, or
- The dual-concern ownership causes confusion in a larger team

Until then, keep the concerns co-located and clearly separated by directory
(`src/routes/nodes.ts` vs `src/routes/events.ts`, `src/store/nodes.ts` vs
`src/store/events.ts`).

Do **not** split prematurely — the current co-location is intentional and reduces
operational complexity while the system is small.
