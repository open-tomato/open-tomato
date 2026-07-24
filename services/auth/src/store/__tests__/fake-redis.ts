/**
 * Minimal in-memory stand-in for the ioredis surface the stores touch
 * (`get`/`set … EX`/`del`/`sadd`/`smembers`/`expire`). TTLs are accepted but not
 * enforced by a timer — tests drive expiry through record fields or explicit
 * deletion, so behaviour stays deterministic without fake clocks.
 */
import type { RedisClient } from '../../redis/index.js';

export interface FakeRedis {
  client: RedisClient;
  /** Snapshot of string keys → values (for assertions). */
  dump(): Record<string, string>;
  /** Members of a set key (for assertions). */
  members(key: string): string[];
}

export function createFakeRedis(): FakeRedis {
  const strings = new Map<string, string>();
  const sets = new Map<string, Set<string>>();

  const client = {
    async get(key: string): Promise<string | null> {
      return strings.get(key) ?? null;
    },
    async getdel(key: string): Promise<string | null> {
      const value = strings.get(key) ?? null;
      strings.delete(key);
      return value;
    },
    async set(key: string, value: string): Promise<'OK'> {
      strings.set(key, value);
      return 'OK';
    },
    async del(...keys: string[]): Promise<number> {
      let removed = 0;
      for (const key of keys) {
        if (strings.delete(key)) removed += 1;
        if (sets.delete(key)) removed += 1;
      }
      return removed;
    },
    async sadd(key: string, ...members: string[]): Promise<number> {
      const set = sets.get(key) ?? new Set<string>();
      let added = 0;
      for (const member of members) {
        if (!set.has(member)) added += 1;
        set.add(member);
      }
      sets.set(key, set);
      return added;
    },
    async smembers(key: string): Promise<string[]> {
      return [...(sets.get(key) ?? [])];
    },
    async expire(): Promise<number> {
      return 1;
    },
  } as unknown as RedisClient;

  return {
    client,
    dump: () => Object.fromEntries(strings),
    members: (key: string) => [...(sets.get(key) ?? [])],
  };
}
