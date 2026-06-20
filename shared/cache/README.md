# @open-tomato/cache

Dual-entry caching package for the open-tomato monorepo.

- **Browser entry** (`@open-tomato/cache`) — React Query wrapper with `useCache`, `QueryClientProvider`, and `defaultQueryClient`
- **Server entry** (`@open-tomato/cache/server`) — Redis-backed cache-aside helper via `createServerCache`

---

## Browser

```ts
import { useCache, QueryClientProvider, defaultQueryClient } from '@open-tomato/cache'
```

### `useCache`

Thin wrapper around `useQuery` with sensible read-only defaults.

```ts
const { data, isLoading, isError, error, refetch } = useCache(
  ['agents', teamId],
  () => fetchAgents(teamId),
  { staleTime: 120_000, enabled: !!teamId }
)
```

**Defaults applied automatically:**

| Option | Default |
|---|---|
| `staleTime` | `60_000` ms |
| `gcTime` | `300_000` ms (5 min) |
| `refetchOnWindowFocus` | `false` |

### `QueryClientProvider`

Wrap your app once at the root:

```tsx
import { QueryClientProvider, defaultQueryClient } from '@open-tomato/cache'

createRoot(root).render(
  <QueryClientProvider client={defaultQueryClient}>
    <App />
  </QueryClientProvider>
)
```

---

## Server

```ts
import { createServerCache } from '@open-tomato/cache/server'
```

> **Warning:** `@open-tomato/cache/server` must never be imported in browser-targeting code. It pulls in `ioredis` which is a Node.js-only dependency. Use the browser entry (`@open-tomato/cache`) in React apps and any code bundled for the browser.

### `createServerCache`

Returns a `ServerCache` instance backed by a Redis connection.

```ts
const cache = createServerCache(redisClient)

// Cache-aside read (fetches and stores on miss)
const agents = await cache.get('agents:list', 300, () => db.select(...))

// Explicit write
await cache.set('agents:list', agentData, 300)

// Invalidate a single key
await cache.invalidate('agents:list')

// Invalidate by pattern
await cache.invalidatePattern('agents:*')

// Teardown
await cache.close()
```

TTL values are in **seconds**.

### Wiring with `createDependency`

The recommended pattern in services is to register Redis as a managed dependency and pass it to `createServerCache`:

```ts
import { createServerCache } from '@open-tomato/cache/server'
import { createDependency } from '@open-tomato/service-core'
import Redis from 'ioredis'

const redis = createDependency({
  name: 'redis',
  async start() {
    return new Redis(process.env.REDIS_URL!)
  },
  async stop(client) {
    await client.quit()
  },
})

// Inside register(app, ctx):
const cache = createServerCache(ctx.deps.get(redis))
const result = await cache.get('agents:list', 300, () => db.select(...))
```

This ensures Redis is started before the service accepts traffic and shut down gracefully on exit.
