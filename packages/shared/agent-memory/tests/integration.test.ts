/**
 * Integration tests for the full agent-memory pipeline.
 *
 * These tests use a real temporary directory on disk — no mocked fs.
 * They verify the complete flow: append → read back → filter → format →
 * truncate → inject into prompt, as well as concurrent write safety.
 */

import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  MarkdownMemoryStore,
  buildPromptWithMemories,
  filterMemories,
  formatMemoriesAsMarkdown,
  truncateToBudget,
} from '../src/index.js';

describe('agent-memory integration', () => {
  let tmpPath: string;
  let store: MarkdownMemoryStore;

  beforeEach(() => {
    tmpPath = join(tmpdir(), `agent-memory-integration-${crypto.randomUUID()}`);
    store = new MarkdownMemoryStore(join(tmpPath, 'memories.md'));
  });

  afterEach(async () => {
    await rm(tmpPath, { recursive: true, force: true });
  });

  describe('full pipeline: append → read back → filter → format → truncate → inject', () => {
    it('appends memories and reads them back with correct fields', async () => {
      const m1 = await store.append({
        type: 'pattern',
        content: 'Always validate at system boundaries.',
        tags: ['validation', 'typescript'],
      });
      const m2 = await store.append({
        type: 'decision',
        content: 'Chose Drizzle ORM over Prisma.',
        tags: ['orm', 'database'],
      });

      const all = await store.readAll();

      expect(all).toHaveLength(2);
      expect(m1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(m2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(m1.id).not.toBe(m2.id);

      const byContent = Object.fromEntries(all.map((m) => [m.content, m]));
      expect(byContent['Always validate at system boundaries.']).toMatchObject({
        type: 'pattern',
        tags: ['validation', 'typescript'],
      });
      expect(byContent['Chose Drizzle ORM over Prisma.']).toMatchObject({
        type: 'decision',
        tags: ['orm', 'database'],
      });
    });

    it('filters memories by type after reading from disk', async () => {
      await store.append({ type: 'pattern', content: 'Pattern entry.', tags: ['ts'] });
      await store.append({ type: 'fix', content: 'Fix entry.', tags: ['bug'] });
      await store.append({ type: 'context', content: 'Context entry.', tags: ['env'] });

      const all = await store.readAll();
      const patterns = filterMemories(all, { type: 'pattern' });

      expect(patterns).toHaveLength(1);
      expect(patterns[0]?.content).toBe('Pattern entry.');
    });

    it('filters memories by tags (OR logic)', async () => {
      await store.append({ type: 'pattern', content: 'TS pattern.', tags: ['typescript'] });
      await store.append({ type: 'decision', content: 'ORM decision.', tags: ['orm'] });
      await store.append({ type: 'fix', content: 'Unrelated fix.', tags: ['css'] });

      const all = await store.readAll();
      const matched = filterMemories(all, { tags: ['typescript', 'orm'] });

      expect(matched).toHaveLength(2);
      const contents = matched.map((m) => m.content).sort();
      expect(contents).toEqual(['ORM decision.', 'TS pattern.']);
    });

    it('filters memories by full-text query', async () => {
      await store.append({ type: 'pattern', content: 'Use Zod for validation.', tags: ['zod'] });
      await store.append({ type: 'fix', content: 'Fix the null pointer.', tags: ['bug'] });

      const all = await store.readAll();
      const matched = filterMemories(all, { query: 'zod' });

      expect(matched).toHaveLength(1);
      expect(matched[0]?.content).toBe('Use Zod for validation.');
    });

    it('formats filtered memories as markdown for injection', async () => {
      await store.append({ type: 'pattern', content: 'Immutable updates only.', tags: ['fp'] });
      await store.append({ type: 'decision', content: 'Use Drizzle.', tags: ['orm'] });

      const all = await store.readAll();
      const formatted = formatMemoriesAsMarkdown(all);

      expect(formatted).toContain('## Agent Memories');
      expect(formatted).toContain('> Immutable updates only.');
      expect(formatted).toContain('> Tags: fp');
      expect(formatted).toContain('> Use Drizzle.');
      expect(formatted).toContain('> Tags: orm');
    });

    it('truncates formatted memories to fit a small token budget', async () => {
      await store.append({ type: 'pattern', content: 'Pattern A is important.', tags: ['ts'] });
      await store.append({ type: 'pattern', content: 'Pattern B is also important.', tags: ['ts'] });
      await store.append({ type: 'pattern', content: 'Pattern C is relevant too.', tags: ['ts'] });

      const all = await store.readAll();
      const formatted = formatMemoriesAsMarkdown(all);

      // Use a budget that fits roughly the first block but not all three
      const tightBudget = 20; // very small — forces truncation
      const truncated = truncateToBudget(formatted, tightBudget);

      expect(truncated).toContain('<!-- memories truncated to fit token budget -->');
    });

    it('injects memories into a base prompt via buildPromptWithMemories', async () => {
      await store.append({
        type: 'pattern',
        content: 'Use immutable updates.',
        tags: ['fp'],
      });
      await store.append({
        type: 'decision',
        content: 'Chose Vitest for testing.',
        tags: ['testing'],
      });

      const base = 'You are a helpful assistant.';
      const result = await buildPromptWithMemories(base, store, {
        mode: 'auto',
        budgetTokens: 1000,
      });

      expect(result).toContain('## Agent Memories');
      expect(result).toContain('Use immutable updates.');
      expect(result).toContain('Chose Vitest for testing.');
      expect(result).toContain(base);
      // Memories must come before base prompt
      expect(result.indexOf('## Agent Memories')).toBeLessThan(result.indexOf(base));
    });

    it('returns base prompt unchanged when mode is off', async () => {
      await store.append({ type: 'pattern', content: 'Ignored pattern.', tags: [] });

      const base = 'Original prompt.';
      const result = await buildPromptWithMemories(base, store, {
        mode: 'off',
        budgetTokens: 1000,
      });

      expect(result).toBe(base);
    });

    it('returns base prompt unchanged when store is empty', async () => {
      const base = 'Empty store prompt.';
      const result = await buildPromptWithMemories(base, store, {
        mode: 'auto',
        budgetTokens: 1000,
      });

      expect(result).toBe(base);
    });

    it('applies filter before formatting in buildPromptWithMemories', async () => {
      await store.append({ type: 'pattern', content: 'Include this.', tags: ['keep'] });
      await store.append({ type: 'decision', content: 'Exclude this.', tags: ['drop'] });

      const base = 'Filtered prompt.';
      const result = await buildPromptWithMemories(base, store, {
        mode: 'auto',
        budgetTokens: 1000,
        filter: { type: 'pattern' },
      });

      expect(result).toContain('Include this.');
      expect(result).not.toContain('Exclude this.');
    });

    it('injects memories truncated to budget', async () => {
      // Append enough memories to exceed a tight budget
      for (let i = 0; i < 10; i++) {
        await store.append({
          type: 'pattern',
          content: `Pattern memory number ${i} with some extra content to fill tokens.`,
          tags: ['ts', 'test'],
        });
      }

      const base = 'Base prompt text.';
      const result = await buildPromptWithMemories(base, store, {
        mode: 'auto',
        budgetTokens: 50,
      });

      expect(result).toContain(base);
      expect(result).toContain('<!-- memories truncated to fit token budget -->');
    });
  });

  describe('concurrent writes', () => {
    it('both concurrent appends are present after both settle', async () => {
      // Spawn two appends without awaiting the first
      const [m1, m2] = await Promise.all([
        store.append({ type: 'pattern', content: 'Concurrent write A.', tags: ['a'] }),
        store.append({ type: 'fix', content: 'Concurrent write B.', tags: ['b'] }),
      ]);

      const all = await store.readAll();

      expect(all).toHaveLength(2);
      const ids = all.map((m) => m.id);
      expect(ids).toContain(m1.id);
      expect(ids).toContain(m2.id);

      const contents = all.map((m) => m.content).sort();
      expect(contents).toEqual(['Concurrent write A.', 'Concurrent write B.']);
    });

    it('three concurrent appends all persist without data loss', async () => {
      await Promise.all([
        store.append({ type: 'pattern', content: 'Write 1.', tags: [] }),
        store.append({ type: 'pattern', content: 'Write 2.', tags: [] }),
        store.append({ type: 'pattern', content: 'Write 3.', tags: [] }),
      ]);

      const all = await store.readAll();

      expect(all).toHaveLength(3);
      const contents = all.map((m) => m.content).sort();
      expect(contents).toEqual(['Write 1.', 'Write 2.', 'Write 3.']);
    });
  });
});
