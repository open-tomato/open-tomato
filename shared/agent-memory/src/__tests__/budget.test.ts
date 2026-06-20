import type { Memory } from '../types.js';

import { describe, expect, it } from 'vitest';

import { estimateTokens, formatMemoriesAsMarkdown, truncateToBudget } from '../budget.js';

describe('estimateTokens', () => {
  it('returns 0 for an empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns 1 for a 4-character string (exact boundary)', () => {
    expect(estimateTokens('abcd')).toBe(1);
  });

  it('rounds up for strings not divisible by 4', () => {
    expect(estimateTokens('abc')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
  });

  it('returns correct estimate for longer text', () => {
    const text = 'a'.repeat(100);
    expect(estimateTokens(text)).toBe(25);
  });

  it('counts multi-byte characters by string length, not byte length', () => {
    // '😀' is 2 chars in JS (surrogate pair), length === 2
    const emoji = '😀😀'; // length === 4
    expect(estimateTokens(emoji)).toBe(1);
  });
});

describe('formatMemoriesAsMarkdown', () => {
  it('returns empty string for an empty array', () => {
    expect(formatMemoriesAsMarkdown([])).toBe('');
  });

  it('formats a single memory with tags', () => {
    const memory: Memory = {
      id: 'abc123',
      type: 'pattern',
      content: 'Use Drizzle ORM for schema migrations.',
      tags: ['orm', 'database'],
      created: new Date('2024-01-15T10:00:00Z'),
    };

    const result = formatMemoriesAsMarkdown([memory]);
    expect(result).toBe(
      '## Agent Memories\n\n' +
        '> Use Drizzle ORM for schema migrations.\n' +
        '> Tags: orm, database',
    );
  });

  it('formats a single memory without tags (no Tags line)', () => {
    const memory: Memory = {
      id: 'abc123',
      type: 'fix',
      content: 'Always validate at system boundaries.',
      tags: [],
      created: new Date('2024-01-15T10:00:00Z'),
    };

    const result = formatMemoriesAsMarkdown([memory]);
    expect(result).toBe(
      '## Agent Memories\n\n' + '> Always validate at system boundaries.',
    );
  });

  it('formats multiple memories across all types separated by blank lines', () => {
    const memories: Memory[] = [
      {
        id: 'p1',
        type: 'pattern',
        content: 'Pattern memory.',
        tags: ['ts'],
        created: new Date('2024-01-15T10:00:00Z'),
      },
      {
        id: 'd1',
        type: 'decision',
        content: 'Decision memory.',
        tags: ['arch'],
        created: new Date('2024-01-16T08:30:00Z'),
      },
      {
        id: 'f1',
        type: 'fix',
        content: 'Fix memory.',
        tags: [],
        created: new Date('2024-01-17T09:00:00Z'),
      },
      {
        id: 'c1',
        type: 'context',
        content: 'Context memory.',
        tags: ['project', 'setup'],
        created: new Date('2024-01-18T11:00:00Z'),
      },
    ];

    const result = formatMemoriesAsMarkdown(memories);
    expect(result).toBe(
      '## Agent Memories\n\n' +
        '> Pattern memory.\n' +
        '> Tags: ts\n\n' +
        '> Decision memory.\n' +
        '> Tags: arch\n\n' +
        '> Fix memory.\n\n' +
        '> Context memory.\n' +
        '> Tags: project, setup',
    );
  });

  it('handles multi-line content correctly', () => {
    const memory: Memory = {
      id: 'ml1',
      type: 'context',
      content: 'Line one.\nLine two.',
      tags: ['multi'],
      created: new Date('2024-01-15T10:00:00Z'),
    };

    const result = formatMemoriesAsMarkdown([memory]);
    expect(result).toBe(
      '## Agent Memories\n\n' +
        '> Line one.\n' +
        '> Line two.\n' +
        '> Tags: multi',
    );
  });
});

describe('truncateToBudget', () => {
  const NOTICE = '<!-- memories truncated to fit token budget -->';

  it('returns content unchanged when it fits within budget', () => {
    const content = '## Agent Memories\n\n> Short block.';
    const budget = estimateTokens(content) + 10;
    expect(truncateToBudget(content, budget)).toBe(content);
  });

  it('returns content unchanged when token count equals budget exactly', () => {
    const content = '## Agent Memories\n\n> Exactly fits.';
    const budget = estimateTokens(content);
    expect(truncateToBudget(content, budget)).toBe(content);
  });

  it('cuts at a block boundary keeping the first block and appends notice', () => {
    // block2 is long enough that full content exceeds firstPart + notice in token count
    const block1 = '> First block.\n> Tags: a';
    const block2 =
      '> Second block that is intentionally long so the combined token count of both blocks exceeds the budget we set.\n> Tags: b';
    const content = `## Agent Memories\n\n${block1}\n\n${block2}`;
    const firstPart = `## Agent Memories\n\n${block1}`;
    const noticeStr = `\n${NOTICE}`;

    // Budget = tokens for firstPart + notice; full content must exceed this
    const budget = estimateTokens(firstPart + noticeStr);
    // Sanity: full content must exceed budget for truncation to fire
    expect(estimateTokens(content)).toBeGreaterThan(budget);

    const result = truncateToBudget(content, budget);
    expect(result).toBe(firstPart + noticeStr);
    expect(result).not.toContain('Second block');
  });

  it('returns only the truncation notice when a single block exceeds budget', () => {
    const content = '## Agent Memories\n\n> A very long block that cannot fit.';
    // Budget so small nothing meaningful fits
    const result = truncateToBudget(content, 2);
    expect(result).toBe(NOTICE);
  });

  it('appends truncation notice when truncation occurs', () => {
    const block1 = '> Block one.';
    const block2 =
      '> Block two that is much longer than the first and tips the content over the budget limit we set for this test.';
    const content = `## Agent Memories\n\n${block1}\n\n${block2}`;
    const firstPart = `## Agent Memories\n\n${block1}`;
    const noticeStr = `\n${NOTICE}`;
    const budget = estimateTokens(firstPart + noticeStr);

    expect(estimateTokens(content)).toBeGreaterThan(budget);

    const result = truncateToBudget(content, budget);
    expect(result).toContain(NOTICE);
  });

  it('does not append truncation notice when no truncation occurs', () => {
    const content = '## Agent Memories\n\n> Small.';
    const budget = estimateTokens(content) + 50;
    expect(truncateToBudget(content, budget)).not.toContain(NOTICE);
  });
});
