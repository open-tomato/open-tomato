/** The category of a stored memory entry. */
export type MemoryType = 'pattern' | 'decision' | 'fix' | 'context';

/** A single persisted memory entry. */
export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  tags: string[];
  created: Date;
}

/** Criteria for filtering memory entries during retrieval or injection. */
export interface MemoryFilter {
  /** Restrict results to a specific memory type. */
  type?: MemoryType;
  /** Include memories that match any of the provided tags (OR logic). */
  tags?: string[];
  /** Include only memories created within the last N days. */
  recentDays?: number;
  /** Case-insensitive substring match against content and tags. */
  query?: string;
}

/**
 * Configuration for memory injection into agent prompts.
 *
 * @example
 * ```typescript
 * const config: InjectionConfig = {
 *   mode: 'auto',
 *   budgetTokens: 2000,
 *   filter: { type: 'pattern' },
 * };
 * ```
 */
export interface InjectionConfig {
  /**
   * Controls whether memories are injected into prompts.
   * - `'auto'`: Memories are prepended to the base prompt up to `budgetTokens`.
   * - `'off'`: No injection; the base prompt is returned unchanged.
   */
  mode: 'auto' | 'off';
  /** Maximum number of tokens to allocate for injected memory content. */
  budgetTokens: number;
  /** Optional filter applied before formatting memories for injection. */
  filter?: MemoryFilter;
}
