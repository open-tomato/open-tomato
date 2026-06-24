/** Metadata describing a paginated result set. */
export interface PaginationMeta {
  /** Current page number (1-based). */
  page: number;
  /** Number of items per page. */
  perPage: number;
  /** Total number of items across all pages. */
  total: number;
  /** Total number of pages. */
  totalPages: number;
}

/** A paginated API response wrapping an array of items with pagination metadata. */
export interface PaginatedResponse<T> {
  /** The items on the current page. */
  data: T[];
  /** Pagination metadata for the current result set. */
  pagination: PaginationMeta;
}

/** Represents a parsed agent record from the registry. */
export interface Agent {
  /** Unique identifier for the agent. */
  id: string;
  /** Human-readable name of the agent. */
  name: string;
  /** Source URL where the agent definition lives. */
  url: string;
  /** Raw content of the agent definition file. */
  content: string;
  /** ISO 8601 timestamp of the last update. */
  last_updated: string;
  /** Whether the agent content has been parsed into skills. */
  parsed: boolean;
}

/** A tag that can be associated with a skill. */
export interface SkillTag {
  /** Unique identifier for the tag. */
  id: string;
  /** Display name of the tag. */
  name: string;
}

/** Represents a skill record extracted from an agent definition. */
export interface Skill {
  /** Unique identifier for the skill. */
  id: string;
  /** Identifier of the agent this skill belongs to. */
  agent_id: string;
  /** Name of the agent this skill belongs to. */
  agent_name: string;
  /** Human-readable name of the skill. */
  name: string;
  /** Classification of the skill content. */
  type: 'skill' | 'guideline' | 'implementation' | 'tool' | 'workflow';
  /**
   * Sync status relative to the source agent.
   * - `fresh`: up to date with the source
   * - `updated`: source has changed since last sync
   * - `stale`: not synced for a long time
   * - `deleted`: removed from the source
   */
  status: 'fresh' | 'updated' | 'stale' | 'deleted';
  /** ISO 8601 timestamp of the last update. */
  last_updated: string;
  /** Whether the skill is visible to consumers. */
  published: boolean;
  /** Markdown content of the skill, or `null` if not yet fetched. */
  content: string | null;
  /** Tags associated with this skill. */
  tags: SkillTag[];
}

/** A tag that can be attached to a skill for categorisation. */
export interface Tag {
  /** Unique identifier for the tag. */
  id: string;
  /** Display name of the tag. */
  name: string;
  /** Human-readable description of the tag. */
  description: string;
  /** Identifier of the skill this tag belongs to. */
  skill_id: string;
  /** Lifecycle status of the tag. */
  status: 'active' | 'inactive' | 'deleted';
}

/** Derived type alias for the `type` discriminant on {@link Skill}. */
export type SkillType = Skill['type'];

/** Derived type alias for the `status` discriminant on {@link Skill}. */
export type SkillStatus = Skill['status'];

/**
 * Options forwarded to the underlying `useQuery` call inside `useCache`.
 *
 * All fields are optional; sensible defaults are applied when omitted.
 *
 * @typeParam T - The resolved data type returned by the fetcher.
 */
export interface UseCacheOptions<T> {
  /**
   * How long (in milliseconds) cached data is considered fresh before a
   * background refetch is triggered.
   *
   * @default 60_000
   */
  staleTime?: number;
  /**
   * How long (in milliseconds) inactive query data remains in the cache
   * before being garbage-collected.
   *
   * @default 300_000 (5 minutes)
   */
  gcTime?: number;
  /**
   * When `false`, the query is skipped entirely and no fetcher is invoked.
   *
   * @default true
   */
  enabled?: boolean;
  /**
   * Whether the query should automatically refetch when the browser window
   * regains focus.
   *
   * @default false
   */
  refetchOnWindowFocus?: boolean;
  /**
   * Optional selector applied to the raw data before it is returned.
   * Useful for deriving a subset or transformed view without a separate
   * memoisation step.
   */
  select?: (data: T) => T;
}

/**
 * The value returned by `useCache`.
 *
 * @typeParam T - The resolved data type returned by the fetcher.
 */
export interface UseCacheResult<T> {
  /**
   * The cached or freshly fetched data.
   * `undefined` while the initial fetch is in flight or if it has errored.
   */
  data: T | undefined;
  /** `true` while the initial fetch is in flight (no cached data exists yet). */
  isLoading: boolean;
  /** `true` if the most recent fetch attempt threw an error. */
  isError: boolean;
  /** The error thrown by the fetcher, or `undefined` if there is none. */
  error: unknown;
  /** Manually trigger a refetch regardless of staleness. */
  refetch(): void;
}

/**
 * A Redis-backed cache abstraction for server-side use.
 *
 * Obtained by calling `createServerCache(redis)`.  All TTL values are
 * expressed in **seconds**.
 */
export interface ServerCache {
  /**
   * Cache-aside read: returns the cached value if present, otherwise calls
   * `fetchFn`, stores the result, and returns it.
   *
   * @param key    - Redis key to look up.
   * @param ttl    - Time-to-live in **seconds** applied on a cache miss.
   * @param fetchFn - Async function invoked on a cache miss to produce the value.
   * @returns The cached or freshly fetched value.
   */
  get<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T>;

  /**
   * Unconditionally writes a value to the cache.
   *
   * @param key   - Redis key to write.
   * @param value - Value to serialise as JSON and store.
   * @param ttl   - Time-to-live in **seconds**.
   */
  set<T>(key: string, value: T, ttl: number): Promise<void>;

  /**
   * Removes a single key from the cache.
   *
   * @param key - Redis key to delete.
   */
  invalidate(key: string): Promise<void>;

  /**
   * Removes all keys matching a glob-style prefix pattern (e.g. `"agents:*"`).
   * No-ops gracefully when no keys match.
   *
   * @param prefix - Redis key pattern passed to `KEYS`.
   */
  invalidatePattern(prefix: string): Promise<void>;

  /**
   * Closes the underlying Redis connection.
   * Should be called during application shutdown.
   */
  close(): Promise<void>;
}
