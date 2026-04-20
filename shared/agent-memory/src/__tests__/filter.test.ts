import type { Memory } from '../types.js';

import { describe, expect, it } from 'vitest';

import { filterMemories, searchMemories } from '../filter.js';

const base = (overrides: Partial<Memory> = {}): Memory => ({
  id: crypto.randomUUID(),
  type: 'pattern',
  content: 'Default content',
  tags: [],
  created: new Date('2024-06-01T00:00:00Z'),
  ...overrides,
});

const memories: Memory[] = [
  base({ type: 'pattern', content: 'Use Zod for validation', tags: ['typescript', 'zod'] }),
  base({ type: 'decision', content: 'Chose Drizzle ORM over Prisma', tags: ['orm', 'database'] }),
  base({ type: 'fix', content: 'Fixed lockfile race condition', tags: ['locking', 'concurrency'] }),
  base({
    type: 'context',
    content: 'Monorepo uses Turborepo',
    tags: ['monorepo', 'turborepo'],
    created: new Date('2020-01-01T00:00:00Z'),
  }),
];

describe('filterMemories', () => {
  it('returns all memories when filter is empty', () => {
    expect(filterMemories(memories, {})).toHaveLength(memories.length);
  });

  it('filters by type (exact match)', () => {
    const result = filterMemories(memories, { type: 'decision' });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('decision');
  });

  it('filters by tags using OR logic — matches any one tag', () => {
    const result = filterMemories(memories, { tags: ['zod', 'database'] });
    expect(result).toHaveLength(2);
    const types = result.map((m) => m.type).sort();
    expect(types).toEqual(['decision', 'pattern']);
  });

  it('returns empty when no memory matches provided tags', () => {
    const result = filterMemories(memories, { tags: ['nonexistent'] });
    expect(result).toHaveLength(0);
  });

  it('filters by recentDays — excludes old memories', () => {
    // The 'context' memory was created in 2020, far outside any recent window
    const result = filterMemories(memories, { recentDays: 30 });
    expect(result.every((m) => m.type !== 'context')).toBe(true);
  });

  it('includes memories created exactly at the recentDays boundary (inclusive)', () => {
    const boundary = new Date(Date.now() - 1 * 86400000 + 1000); // 1 day ago + 1s
    const fresh: Memory[] = [base({ created: boundary })];
    const result = filterMemories(fresh, { recentDays: 1 });
    expect(result).toHaveLength(1);
  });

  it('excludes memories just outside the recentDays boundary', () => {
    const tooOld = new Date(Date.now() - 2 * 86400000); // 2 days ago
    const stale: Memory[] = [base({ created: tooOld })];
    const result = filterMemories(stale, { recentDays: 1 });
    expect(result).toHaveLength(0);
  });

  it('filters by query — case-insensitive match in content', () => {
    const result = filterMemories(memories, { query: 'drizzle' });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('decision');
  });

  it('filters by query — case-insensitive match in tags', () => {
    const result = filterMemories(memories, { query: 'TURBOREPO' });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('context');
  });

  it('returns empty when query matches nothing', () => {
    const result = filterMemories(memories, { query: 'doesnotexist' });
    expect(result).toHaveLength(0);
  });

  it('applies combined filters (type AND tags)', () => {
    const result = filterMemories(memories, { type: 'pattern', tags: ['typescript'] });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('pattern');
  });

  it('returns empty when combined filters produce no match', () => {
    const result = filterMemories(memories, { type: 'fix', tags: ['zod'] });
    expect(result).toHaveLength(0);
  });

  it('does not mutate the input array', () => {
    const copy = [...memories];
    filterMemories(memories, { type: 'pattern' });
    expect(memories).toEqual(copy);
  });
});

describe('searchMemories', () => {
  it('is a convenience wrapper — matches content case-insensitively', () => {
    const result = searchMemories(memories, 'lockfile');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('fix');
  });

  it('matches tags case-insensitively', () => {
    const result = searchMemories(memories, 'ZOD');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('pattern');
  });

  it('returns all memories when query is empty string', () => {
    const result = searchMemories(memories, '');
    expect(result).toHaveLength(memories.length);
  });
});
