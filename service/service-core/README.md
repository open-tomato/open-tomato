# @open-tomato/service-core

Transport-agnostic runtime foundation for `@open-tomato/express` and `@open-tomato/mcp`. Owns the `Dependency` interface and state machine, the `createHttpClient` factory with circuit-breaker and retry via `Proxy`, the plugin system types, and structured logger wiring.

Neither `packages/express` nor `packages/mcp` re-implement any of this logic — they wire transport-specific concerns on top and re-export what their consumers need.

---

## Public API

```ts
// Dependency lifecycle
export { createDependency } from '@open-tomato/service-core'
export type { Dependency, DependencyStatus, TypedDependency, DepsMap }

// HTTP client factory
export { createHttpClient } from '@open-tomato/service-core'
export type { TypedClient, ClientsMap, HttpClientOpts, RetryConfig }

// Logger
export { createServiceLogger } from '@open-tomato/service-core'
export type { ServicePlugin }
```

> In practice, service authors import from `@open-tomato/express` or `@open-tomato/mcp`, which re-export `createDependency` and `createHttpClient`. Direct imports from `service-core` are only needed when writing transport-agnostic infrastructure.

---

## Safe defaults

| Feature | Default |
|---|---|
| Retry attempts | 3 |
| Retry backoff | `"exponential"` |
| Retry jitter | `false` |
| Circuit breaker threshold | 5 consecutive failures |
| Circuit breaker timeout | 30 000 ms |

---

## Circuit breaker state mapping

| `CircuitState` | `DependencyStatus` |
|---|---|
| `closed` | `"running"` |
| `open` | `"error"` |
| `half-open` | `"degraded"` |

Calling `stop()` overrides the status to `"stopped"` regardless of circuit state. Calling `start()` clears the stopped flag and returns status to circuit-breaker control.

---

## Usage examples

### `createDependency`

Wraps any custom resource (database connection, cache, external SDK) in the standard `Dependency` state machine.

```ts
import { createDependency } from '@open-tomato/express'

// Without a typed client (escape hatch for arbitrary resources):
const redisConn = createDependency({
  name: 'redis',
  async onStart() { await redis.connect(); },
  async onStop()  { await redis.disconnect(); },
  async healthCheck() { return redis.ping() === 'PONG'; },
  metadata: { host: 'localhost', port: 6379 },
})

await redisConn.start()
console.log(redisConn.status) // "running"
await redisConn.stop()
console.log(redisConn.status) // "stopped"

// With a typed client — exposes `dependency.client` with full type information:
const db = createDependency({
  name: 'postgres',
  client: prisma,
  async onStart() { await prisma.$connect(); },
  async onStop()  { await prisma.$disconnect(); },
})

await db.start()
const users = await db.client.user.findMany()
await db.stop()
```

**State machine**

```text
stopped ──[start()]──► starting ──[onStart resolves]──► running
                                 └─[onStart rejects]──► error
running ──[stop()]───► stopped
error   ──[stop()]───► stopped
error   ──[start()]──► starting  (restart allowed)
```

Invalid transitions:

| Current status | Action | Behaviour |
|---|---|---|
| `"running"` | `start()` | throws |
| `"starting"` | `start()` | throws |
| `"stopped"` | `stop()` | no-op (idempotent) |

---

### `createHttpClient`

Wraps any HTTP client or SDK instance in a `Proxy` that transparently applies retry and circuit-breaker protection to every method call, and exposes the `Dependency` lifecycle surface.

```ts
import { createHttpClient } from '@open-tomato/express'

const apiClient = createHttpClient(new MyApiSdk(), {
  retry: { attempts: 5, backoff: 'exponential', jitter: true },
  circuitBreaker: { threshold: 3, timeout: 10_000 },
})

await apiClient.start()
console.log(apiClient.status) // "running"

// Retry + circuit-breaker applied automatically on every call:
const result = await apiClient.someMethod()

await apiClient.stop()
console.log(apiClient.status) // "stopped"
```

Resilience order per intercepted call:

```text
CircuitBreaker.call → withRetry → underlying client method
```

Retries are exhausted before the circuit breaker records a failure. If the circuit is already open, `CircuitOpenError` is thrown immediately without spending any retry budget.

Manage multiple clients uniformly using `ClientsMap`:

```ts
import type { ClientsMap } from '@open-tomato/service-core'

const clients: ClientsMap = {
  payments: createHttpClient(new PaymentsApiSdk()),
  notifications: createHttpClient(new NotificationsApiSdk()),
}

await Promise.all(Object.values(clients).map(c => c.start()))
```

---

### `createServiceLogger`

Creates a structured logger scoped to a service identifier. Every emitted record includes `serviceId` in its metadata.

```ts
import { createServiceLogger } from '@open-tomato/service-core'

const logger = createServiceLogger('payments-api')

logger.info('Server started', { port: 3000 })
// → { "level": "info", "serviceId": "payments-api", "message": "Server started", "port": 3000 }

logger.warn('Slow upstream response', { latencyMs: 1500 })
logger.error('Circuit open', { dependency: 'notifications' })
logger.debug('Request received', { path: '/health' })
```
