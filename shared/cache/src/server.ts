import type { ServerCache } from './types';
import type { Redis } from 'ioredis';

/**
 * Creates a Redis-backed {@link ServerCache} instance.
 *
 * All TTL values accepted by the returned cache are in **seconds**.
 *
 * @param redis - An `ioredis` client instance.  The caller is responsible for
 *                creating and configuring the client; `close()` will call
 *                `redis.quit()` during shutdown.
 * @returns A {@link ServerCache} bound to the provided Redis client.
 *
 * @example
 * ```ts
 * import Redis from 'ioredis'
 * import { createServerCache } from '@open-tomato/cache/server'
 *
 * const redis = new Redis(process.env.REDIS_URL!)
 * const cache = createServerCache(redis)
 *
 * const agents = await cache.get('agents:list', 300, () => db.select(...))
 * ```
 */
export function createServerCache(redis: Redis): ServerCache {
  return {
    /**
     * Cache-aside read: returns the cached value when present, otherwise
     * invokes `fetchFn`, persists the result with the given TTL, and returns it.
     *
     * @param key     - Redis key to look up.
     * @param ttl     - Time-to-live in **seconds** applied on a cache miss.
     * @param fetchFn - Async function invoked on a cache miss.
     * @returns The cached or freshly fetched value.
     */
    async get<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T> {
      const cached = await redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }

      const result = await fetchFn();
      await redis.set(key, JSON.stringify(result), 'EX', ttl);
      return result;
    },

    /**
     * Unconditionally writes a value to the cache.
     *
     * @param key   - Redis key to write.
     * @param value - Value to serialise as JSON and store.
     * @param ttl   - Time-to-live in **seconds**.
     */
    async set<T>(key: string, value: T, ttl: number): Promise<void> {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    },

    /**
     * Removes a single key from the cache.
     *
     * @param key - Redis key to delete.
     */
    async invalidate(key: string): Promise<void> {
      await redis.del(key);
    },

    /**
     * Removes all keys matching a glob-style pattern (e.g. `"agents:*"`).
     * No-ops gracefully when no keys match the pattern.
     *
     * @param prefix - Redis key pattern passed to `KEYS`.
     */
    async invalidatePattern(prefix: string): Promise<void> {
      const keys = await redis.keys(prefix);
      if (keys.length === 0) return;
      await redis.del(...keys);
    },

    /**
     * Closes the underlying Redis connection.
     * Should be called during application shutdown.
     */
    async close(): Promise<void> {
      await redis.quit();
    },
  };
}
