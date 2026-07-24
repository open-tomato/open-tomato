import type { TypedDependency } from '@open-tomato/service-core';

import { createDependency } from '@open-tomato/service-core';
import { Redis } from 'ioredis';

export type RedisClient = Redis;

/**
 * Creates an ioredis dependency for the service's ephemeral state — refresh
 * sessions / `sid` store, and (later phases) 2FA challenges, reset codes, and
 * rate counters. Mirrors {@link createDbDependency}: connect on `onStart`,
 * `quit` on `onStop`, pool/latency detail on `healthDetail`.
 *
 * `lazyConnect` is set so the client only dials when `onStart` calls
 * `connect()` — this keeps construction side-effect free (important for tests
 * that never touch a live Redis).
 */
export function createRedisDependency(url: string): TypedDependency<RedisClient> {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

  return createDependency({
    name: 'redis',
    client,
    async onStart() {
      await client.connect();
      // Probe eagerly so startup fails fast if Redis is unreachable.
      await client.ping();
    },
    async onStop() {
      await client.quit();
    },
    healthDetail() {
      return {
        status: client.status,
      };
    },
  });
}
