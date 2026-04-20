import type { Memory, MemoryFilter } from './types.js';

/**
 * Filters an array of memories by the given criteria.
 *
 * All active filter fields are applied with AND logic; within the `tags` field,
 * individual tag values are matched with OR logic.
 *
 * @param memories - The full list of memory entries to filter.
 * @param filter - The criteria to apply. Omitting a field means no restriction on that dimension.
 * @returns A new array containing only the memories that satisfy all active criteria.
 */
export function filterMemories(memories: Memory[], filter: MemoryFilter): Memory[] {
  return memories.filter((memory) => {
    if (filter.type !== undefined && memory.type !== filter.type) {
      return false;
    }

    if (filter.tags !== undefined && filter.tags.length > 0) {
      const hasMatch = filter.tags.some((tag) => memory.tags.includes(tag));
      if (!hasMatch) return false;
    }

    if (filter.recentDays !== undefined) {
      const cutoff = Date.now() - filter.recentDays * 86400000;
      if (memory.created.getTime() < cutoff) return false;
    }

    if (filter.query !== undefined && filter.query.length > 0) {
      const needle = filter.query.toLowerCase();
      const haystack = `${memory.content} ${memory.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });
}

/**
 * Convenience wrapper that searches memories by a full-text query string.
 *
 * Performs a case-insensitive substring match across each memory's `content`
 * and `tags`. Equivalent to calling `filterMemories(memories, { query })`.
 *
 * @param memories - The full list of memory entries to search.
 * @param query - The case-insensitive substring to find.
 * @returns Memories whose content or tags contain the query string.
 */
export function searchMemories(memories: Memory[], query: string): Memory[] {
  return filterMemories(memories, { query });
}
