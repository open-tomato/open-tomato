# @open-tomato/task-store

A persistent, JSONL-backed task store for tracking work items across agent iterations and loops. Supports blocking dependency chains, idempotent task creation, and loop-termination guards safe for multi-process use.

## Installation

```bash
bun add @open-tomato/task-store
```

## Quick Start

```typescript
import {
  TaskStore,
  TaskStatus,
  validateLoopComplete,
} from '@open-tomato/task-store';

const store = new TaskStore({ filePath: './tasks.jsonl' });

// Idempotently create tasks (safe to call on restart)
const t1 = await store.ensure({
  key: 'design-api-schema',
  title: 'Design API Schema',
  description: 'Define request/response shapes',
  priority: 1,
  loop_id: 'loop-001',
  blocked_by: [],
});

const t2 = await store.ensure({
  key: 'implement-endpoints',
  title: 'Implement Endpoints',
  description: 'Wire up the route handlers',
  priority: 2,
  loop_id: 'loop-001',
  blocked_by: [t1.id], // t2 is blocked until t1 is Closed
});

// Work t1 through its lifecycle
await store.transition(t1.id, 'InProgress');
await store.transition(t1.id, 'Closed');

// t2 is now unblocked
console.log(await store.ready(t2.id)); // true

// Loop termination guard
const result = await validateLoopComplete('loop-001', store);
if (!result.accepted) {
  console.log('Not done yet:', result.reason);
}
```

## State Machine

Tasks follow a strict state machine. Only the transitions shown below are legal — all others throw `InvalidTransitionError`.

```text
         ┌─────────────────────┐
         │                     │
        Open ──► InProgress ──► Closed (terminal)
         │            │
         └────────────┴──────► Failed  (terminal)
```

| From        | To          | Side effect            |
|-------------|-------------|------------------------|
| `Open`      | `InProgress`| Sets `started_at`      |
| `Open`      | `Failed`    | Sets `closed_at`       |
| `InProgress`| `Closed`    | Sets `closed_at`       |
| `InProgress`| `Failed`    | Sets `closed_at`       |

**Dependency resolution:** a blocker must reach `Closed` to unblock dependents. A `Failed` blocker does **not** unblock tasks that depend on it.

## Method Reference

### `new TaskStore(options)`

| Option        | Type     | Default | Description                                        |
|---------------|----------|---------|----------------------------------------------------|
| `filePath`    | `string` | —       | Path to the `.jsonl` file used for persistence.    |
| `lockTimeout` | `number` | `5000`  | Max milliseconds to wait for an exclusive file lock.|

---

### `store.ensure(input): Promise<Task>`

Idempotently creates or updates a task by its stable `key`.

- **First call**: creates a new task with `status: Open` and a generated `id`.
- **Subsequent calls**: updates mutable fields (`title`, `description`, `priority`, `blocked_by`, `loop_id`) while preserving `id`, `created_at`, and the current `status`.

Atomic: holds an exclusive file lock for the full read-modify-write cycle.

---

### `store.transition(id, status): Promise<Task>`

Advances a task to a new status following the state machine rules.

Throws `TaskNotFoundError` if `id` does not exist.
Throws `InvalidTransitionError` if the transition is not permitted.

---

### `store.ready(id): Promise<boolean>`

Returns `true` when the task is `Open` **and** every task in `blocked_by` has `status: Closed`. Returns `false` if the task does not exist.

Read-only — no lock acquired.

---

### `store.hasPendingTasks(loopId): Promise<boolean>`

Returns `true` when any task in the loop has `status: Open` or `InProgress`.

Use as a loop-termination guard: only accept a `LOOP_COMPLETE` signal when this returns `false`.

---

### `store.getReady(loopId): Promise<Task[]>`

Returns all tasks in the given loop that satisfy `ready()` — `Open` with all blockers `Closed`.

---

### `store.readAll(): Promise<Task[]>`

Returns all tasks in the store. Malformed JSONL lines are skipped silently. Returns `[]` when the file does not exist.

---

### `validateLoopComplete(loopId, store): Promise<{ accepted: boolean; reason?: string }>`

Top-level guard for accepting a `LOOP_COMPLETE` signal.

```typescript
import { validateLoopComplete } from '@open-tomato/task-store';

const result = await validateLoopComplete('loop-001', store);
// { accepted: true } or { accepted: false, reason: '...' }
```

Returns `accepted: true` only when no tasks for the loop are `Open` or `InProgress`.

## JSONL Format

Each line in the store file is a self-contained JSON object:

```text
{"id":"task-1718000000000-3f2a","key":"design-api-schema","title":"Design API Schema","status":"Closed","priority":1,"blocked_by":[],"loop_id":"loop-001","created_at":"2024-06-10T00:00:00.000Z","started_at":"2024-06-10T00:01:00.000Z","closed_at":"2024-06-10T00:05:00.000Z"}
{"id":"task-1718000000001-a1b2","key":"implement-endpoints","title":"Implement Endpoints","status":"InProgress","priority":2,"blocked_by":["task-1718000000000-3f2a"],"loop_id":"loop-001","created_at":"2024-06-10T00:00:00.000Z","started_at":"2024-06-10T00:06:00.000Z"}
```

Task IDs use the format `task-{timestamp}-{4-char hex}`.

## Error Types

| Class                  | When thrown                                                   |
|------------------------|---------------------------------------------------------------|
| `InvalidTransitionError`| `transition()` called with a state-machine-illegal status    |
| `TaskNotFoundError`     | `transition()` called with an `id` that does not exist       |

Both extend `Error` and expose the relevant task ID and status fields for programmatic handling.
