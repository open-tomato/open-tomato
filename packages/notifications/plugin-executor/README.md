# @open-tomato/notifications-plugin-executor

Typed HTTP client used by `services/executor` to emit events and request approvals from `services/notifications`. This is the **producer-side** plugin — it lives on the executor node and points outward at the notification hub.

## Concepts

`notifications-plugin-*` packages own the typed surface on the consumer/producer side. The notification service itself owns the wire protocol. Keeping the typed client in a package means the executor service never hard-codes fetch paths, and the type definitions are importable by any tooling that needs to understand the executor event catalogue.

---

## Installation

Already included as a workspace dependency in `services/executor/package.json`:

```json
"@open-tomato/notifications-plugin-executor": "workspace:*"
```

---

## API

### `ExecutorNotificationClient`

```ts
import { ExecutorNotificationClient } from '@open-tomato/notifications-plugin-executor'

const client = new ExecutorNotificationClient(
  'http://notifications:4400',  // NOTIFICATION_URL
  'pi-01',                      // NODE_ID
)
```

#### `emitEvent(jobId, event)`

Emit a typed executor event to the notification service. Fire-and-forget — awaiting is optional.

```ts
await client.emitEvent(jobId, { type: 'loop.started', branch: 'feature/OPT-123' })
await client.emitEvent(jobId, { type: 'task.done', taskIndex: 2, durationMs: 4200 })
await client.emitEvent(jobId, { type: 'log', stream: 'stdout', line: 'Building...' })
```

Maps to `POST /events/executor` on the notification service.

#### `requestApproval(jobId, request)`

Register a human-gate approval request and **block until a decision arrives**.

```ts
const decision = await client.requestApproval(jobId, {
  requestId: crypto.randomUUID(),
  type: 'prerequisite',
  description: 'Confirm database backup completed',
})
// decision.decision === 'granted' | 'denied'
```

Internally:
1. `POST /approvals` — registers the request
2. `GET /approvals/:requestId/wait` (SSE) — blocks until the first `data:` line is received

#### `waitForApproval(requestId)`

Lower-level: skip the registration step and just wait for a decision on an existing request ID. Useful when the request was registered out-of-band.

```ts
const decision = await client.waitForApproval(existingRequestId)
```

---

### `createExecutorNotificationClient(notificationUrl, nodeId)`

Factory. Returns `null` when `notificationUrl` is not set — callers should fall back to stub behaviour.

```ts
import { createExecutorNotificationClient } from '@open-tomato/notifications-plugin-executor'

const client = createExecutorNotificationClient(
  process.env.NOTIFICATION_URL,
  process.env.NODE_ID ?? 'local',
)

if (client) {
  await client.emitEvent(jobId, event)
} else {
  console.log(JSON.stringify({ jobId, ...event })) // stub path
}
```

---

## Event types (`ExecutorEvent`)

```ts
type ExecutorEvent =
  | { type: 'loop.started';       branch: string; planChecksum?: string }
  | { type: 'loop.done';          tasksCompleted: number; tasksFailed: number }
  | { type: 'loop.cancelled';     reason: string }
  | { type: 'task.started';       taskIndex: number; taskText: string }
  | { type: 'task.done';          taskIndex: number; durationMs: number }
  | { type: 'task.failed';        taskIndex: number; exitCode: number }
  | { type: 'task.blocked';       taskIndex: number }
  | { type: 'log';                stream: 'stdout' | 'stderr'; line: string }
  | { type: 'prerequisite.check'; item: string; tag: 'auto' | 'human'; result: 'pass' | 'fail' | 'pending' }
```

This discriminated union is mirrored in `services/notifications/src/entity/plugins/executor.ts` where it is validated server-side via Zod. Keep these in sync manually — a future shared-types package could own the single source of truth.

---

## Approval types

```ts
interface ApprovalRequest {
  requestId: string               // UUID — caller generates; used to track the wait
  type: 'prerequisite' | 'human-loop'
  description: string
  options?: string[]              // for multiple-choice approvals
}

interface ApprovalDecision {
  decision: 'granted' | 'denied'
  note?: string
}
```
