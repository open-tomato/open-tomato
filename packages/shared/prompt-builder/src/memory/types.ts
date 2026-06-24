import type { MemoryBlock } from '@open-tomato/types';

/**
 * Loads memory blocks up to a given token budget.
 *
 * Implementations are responsible for selecting, ordering, and truncating
 * blocks so that the total token cost does not exceed `budget`.
 */
export interface MemoryLoader {
  /**
   * Returns memory blocks whose combined token cost fits within `budget`.
   *
   * Blocks must not be split mid-content; truncation happens at block
   * boundaries only. Blocks are returned in priority order (highest priority
   * first), and loading stops as soon as adding the next block would exceed
   * the budget.
   *
   * @param budget - Maximum number of tokens the returned blocks may consume in total.
   * @returns A promise resolving to the selected memory blocks.
   */
  load(budget: number): Promise<MemoryBlock[]>;
}
