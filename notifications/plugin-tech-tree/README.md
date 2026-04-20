# @open-tomato/notifications-plugin-tech-tree

Typed HTTP/SSE client used by `apps/tech-tree` to talk to `services/notifications`. This is the **consumer-side** plugin — it provides the approval inbox, real-time activity stream, cluster state queries, and job dispatch surface for the tech-tree UI.

## Concepts

`notifications-plugin-*` packages own the typed surface on the consumer/producer side. The notification service itself owns the wire protocol. Keeping the typed client in a package lets both the React app and any CLI tooling import the same interface without coupling directly to fetch paths or SSE framing.

---

## Installation

Already included as a workspace dependency in `apps/tech-tree/package.json`:

```json
"@open-tomato/notifications-plugin-tech-tree": "workspace:*"
```

---

## Quick start

```ts
import { TechTreeNotificationClient } from '@open-tomato/notifications-plugin-tech-tree'

const client = new TechTreeNotificationClient('http://localhost:4400')
```

Or use the factory (throws when `notificationUrl` is not set):

```ts
import { createTechTreeNotificationClient } from '@open-tomato/notifications-plugin-tech-tree'

const client = createTechTreeNotificationClient(process.env.NOTIFICATION_URL)
```

In React, the lazy singleton in `apps/tech-tree/src/lib/notificationClient.ts` returns `null` when `VITE_NOTIFICATION_URL` is absent — useful for running the UI without a live backend.

---

## API

### Activity stream — `subscribeToFeed(entityKind, jobId, onEvent, onClose?)`

Opens an SSE connection to the event feed for a job. The notification service replays recent history before streaming live events. Returns a subscription handle.

```ts
const sub = client.subscribeToFeed(
  'executor',
  jobId,
  (event) => setEvents(prev => [...prev, event]),
  (reason) => setConnected(false),
)

// Tear down on unmount:
return () => sub.close()
```

Each `event` is a `StoredEvent`:

```ts
interface StoredEvent {
  id: string
  jobId: string
  entityKind: string
  eventType: string              // e.g. 'loop.started', 'task.done', 'log'
  payload: Record<string, unknown>
  createdAt: string              // ISO 8601
}
```

Heartbeat lines (`[HEARTBEAT]`) are filtered out automatically. The `onClose` callback fires when the stream ends or errors — use it to update a "disconnected" indicator in the UI.

---

### Approval inbox — `getPendingApprovals(jobId?)`

Fetch all pending approvals, optionally filtered by job.

```ts
const approvals = await client.getPendingApprovals()
// or for a specific job:
const approvals = await client.getPendingApprovals(jobId)
```

Maps to `GET /approvals?pending=true[&jobId=...]`.

---

### Submit a decision — `submitDecision(requestId, decision)`

Grant or deny a pending approval.

```ts
await client.submitDecision(approval.id, { decision: 'granted' })
await client.submitDecision(approval.id, { decision: 'denied', note: 'Not ready yet' })
```

Maps to `POST /approvals/:requestId/decide`.

---

### Event history — `getEventHistory(entityKind, jobId)`

Fetch stored events via HTTP (non-streaming). Useful for initial page load when SSE is not needed.

```ts
const history = await client.getEventHistory('executor', jobId)
```

---

### Cluster state — `listNodes()` / `getJob(jobId)`

```ts
const nodes = await client.listNodes()
const job   = await client.getJob(jobId)
```

`NodeRecord` includes `id`, `status` (`idle | busy | offline | error`), `address`, `lastSeenAt`, `metadata`.

`JobRecord` includes `id`, `nodeId`, `status`, `branch`, `sourceId`, `planChecksum`, timestamps, `metadata`.

---

### Job dispatch — `dispatchJob(request)`

Dispatch a plan to the cluster. The notification service auto-selects an idle executor node.

```ts
const { jobId, nodeId, job } = await client.dispatchJob({
  branch: 'feature/OPT-123',
  planId: 'OPT-123',
  planChecksum: 'sha256...',    // optional
  confirmBeforeStart: false,    // optional — require human confirmation before loop starts
  nodeId: 'pi-01',              // optional — pin to a specific node
})
```

Throws a descriptive error when:
- No idle nodes are available (`503 no_nodes_available`)
- The targeted node rejects the job
- Network failure

Maps to `POST /dispatch` on the notification service.

---

## Type reference

```ts
// Dispatch
interface DispatchRequest {
  branch: string
  planId: string
  planChecksum?: string
  confirmBeforeStart?: boolean
  nodeId?: string
}
interface DispatchResult {
  jobId: string
  nodeId: string
  job: JobRecord
}

// Approvals
type ApprovalStatus = 'pending' | 'granted' | 'denied' | 'expired'
type ApprovalType   = 'prerequisite' | 'human-loop'
interface PendingApproval {
  id: string
  jobId: string
  entityKind: string
  approvalType: ApprovalType
  status: ApprovalStatus
  description: string
  options: string[] | null
  decisionNote: string | null
  createdAt: string
  expiresAt: string | null
}
interface ApprovalDecision {
  decision: 'granted' | 'denied'
  note?: string
}

// SSE
type EventCallback   = (event: StoredEvent) => void
type CloseCallback   = (reason: string) => void
interface EventSubscription { close(): void }
```
