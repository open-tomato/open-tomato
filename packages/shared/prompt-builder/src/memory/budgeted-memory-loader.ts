import type { MemoryLoader } from './types.js';
import type { MemoryBlock } from '@open-tomato/types';

import { truncateToTokenBudget } from '../token-budget/truncate.js';
import { TokenCounter } from '../token-counter.js';

/**
 * A raw source of memory blocks returned in priority order (highest first).
 *
 * Unlike {@link MemoryLoader}, implementations of this interface do not need to
 * be token-aware — `BudgetedMemoryLoader` handles truncation and budget
 * enforcement.
 */
export interface RawMemorySource {
  /**
   * Returns all available memory blocks in priority order.
   *
   * @returns A promise resolving to every block managed by this source.
   */
  getAll(): Promise<MemoryBlock[]>;
}

/**
 * A {@link MemoryLoader} that wraps a {@link RawMemorySource} and enforces a
 * token budget.
 *
 * For each block returned by the source, `BudgetedMemoryLoader`:
 *
 * 1. Truncates the block's content to fit within the remaining budget using
 *    {@link truncateToTokenBudget} (block-boundary truncation — no partial
 *    paragraphs).
 * 2. Includes the (possibly truncated) block if it contributes at least one
 *    token and the budget has not yet been exhausted.
 * 3. Stops processing as soon as no further blocks can be included within
 *    the remaining budget.
 *
 * Blocks are always processed in the order returned by the source, so the
 * caller controls priority by ordering blocks highest-priority-first.
 *
 * @example
 * ```typescript
 * const source: RawMemorySource = { getAll: async () => blocks };
 * const loader = new BudgetedMemoryLoader(source);
 * const loaded = await loader.load(500);
 * ```
 */
export class BudgetedMemoryLoader implements MemoryLoader {
  private readonly source: RawMemorySource;
  private readonly counter: TokenCounter;

  /**
   * @param source - The raw memory source to load blocks from.
   * @param counter - Optional token counter; defaults to a new
   *   {@link TokenCounter} instance.
   */
  constructor(source: RawMemorySource, counter: TokenCounter = new TokenCounter()) {
    this.source = source;
    this.counter = counter;
  }

  /**
   * Loads memory blocks from the source, truncating and filtering to fit
   * within `budget` tokens.
   *
   * @param budget - Maximum number of tokens the returned blocks may consume
   *   in total.
   * @returns A promise resolving to the selected (and possibly truncated)
   *   memory blocks in priority order.
   */
  async load(budget: number): Promise<MemoryBlock[]> {
    if (budget <= 0) {
      return [];
    }

    const all = await this.source.getAll();
    const result: MemoryBlock[] = [];
    let remaining = budget;

    for (const block of all) {
      if (remaining <= 0) {
        break;
      }

      const truncatedContent = truncateToTokenBudget(block.content, remaining, this.counter);

      if (truncatedContent.length === 0) {
        break;
      }

      const tokenCount = this.counter.count(truncatedContent);
      result.push({ ...block, content: truncatedContent, tokenCount });
      remaining -= tokenCount;
    }

    return result;
  }
}
