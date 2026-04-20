import type { RawMemorySource } from './budgeted-memory-loader.js';
import type { MemoryBlock } from '@open-tomato/types';

import { describe, expect, it } from 'vitest';

import { BudgetedMemoryLoader } from './budgeted-memory-loader.js';

function makeBlock(id: string, content: string): MemoryBlock {
  return { id, content, tokenCount: 0 };
}

function makeSource(blocks: MemoryBlock[]): RawMemorySource {
  return { getAll: async () => blocks };
}

describe('BudgetedMemoryLoader', () => {
  it('returns empty array when budget is zero', async () => {
    const source = makeSource([makeBlock('a', 'Some content here')]);
    const loader = new BudgetedMemoryLoader(source);
    const result = await loader.load(0);
    expect(result).toEqual([]);
  });

  it('returns empty array when budget is negative', async () => {
    const source = makeSource([makeBlock('a', 'Some content here')]);
    const loader = new BudgetedMemoryLoader(source);
    const result = await loader.load(-10);
    expect(result).toEqual([]);
  });

  it('returns empty array when source has no blocks', async () => {
    const source = makeSource([]);
    const loader = new BudgetedMemoryLoader(source);
    const result = await loader.load(500);
    expect(result).toEqual([]);
  });

  it('returns all blocks when they fit within budget', async () => {
    const blocks = [
      makeBlock('a', 'Block one'),
      makeBlock('b', 'Block two'),
    ];
    const source = makeSource(blocks);
    const loader = new BudgetedMemoryLoader(source);
    const result = await loader.load(10_000);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  it('stops loading when budget is exhausted', async () => {
    // Use very long content to force budget exhaustion after the first block
    const longContent = 'word '.repeat(200); // ~200 tokens
    const blocks = [
      makeBlock('a', longContent),
      makeBlock('b', longContent),
      makeBlock('c', longContent),
    ];
    const source = makeSource(blocks);
    const loader = new BudgetedMemoryLoader(source);
    // Budget of 250 tokens should fit block 'a' (~200 tokens) but leave too
    // little room for 'b' and 'c' after 'a' is consumed
    const result = await loader.load(250);
    const ids = result.map((b) => b.id);
    expect(ids).not.toContain('c');
  });

  it('truncates a block at block boundaries when it exceeds remaining budget', async () => {
    // Three paragraphs; only the first two should fit in a tight budget
    const content = 'First paragraph\n\nSecond paragraph\n\nThird paragraph that is very long and should be cut off';
    const blocks = [makeBlock('a', content)];
    const source = makeSource(blocks);
    const loader = new BudgetedMemoryLoader(source);
    // Budget tight enough to exclude the third paragraph
    const result = await loader.load(12);
    expect(result).toHaveLength(1);
    expect(result[0].content).not.toContain('Third paragraph');
    expect(result[0].content).toContain('First paragraph');
  });

  it('excludes a block entirely when even its first paragraph does not fit', async () => {
    const longFirstParagraph = 'very long first paragraph '.repeat(100);
    const blocks = [makeBlock('a', longFirstParagraph)];
    const source = makeSource(blocks);
    const loader = new BudgetedMemoryLoader(source);
    // Budget of 1 token — no paragraph can fit
    const result = await loader.load(1);
    expect(result).toHaveLength(0);
  });

  it('preserves block metadata (id, tags) after truncation', async () => {
    const content = 'Para one\n\nPara two\n\nPara three that overflows the budget';
    const block: MemoryBlock = { id: 'x', content, tokenCount: 0, tags: ['important'] };
    const source = makeSource([block]);
    const loader = new BudgetedMemoryLoader(source);
    const result = await loader.load(10);
    expect(result[0].id).toBe('x');
    expect(result[0].tags).toEqual(['important']);
  });

  it('updates tokenCount on returned blocks to reflect actual (possibly truncated) content', async () => {
    const content = 'Hello world';
    const blocks = [makeBlock('a', content)];
    const source = makeSource(blocks);
    const loader = new BudgetedMemoryLoader(source);
    const result = await loader.load(10_000);
    expect(result[0].tokenCount).toBeGreaterThan(0);
    // tokenCount should match the actual content
    expect(result[0].tokenCount).toBeLessThanOrEqual(10_000);
  });

  it('processes blocks in priority order (source order)', async () => {
    const blocks = [
      makeBlock('first', 'Priority one'),
      makeBlock('second', 'Priority two'),
      makeBlock('third', 'Priority three'),
    ];
    const source = makeSource(blocks);
    const loader = new BudgetedMemoryLoader(source);
    const result = await loader.load(10_000);
    expect(result.map((b) => b.id)).toEqual(['first', 'second', 'third']);
  });
});
