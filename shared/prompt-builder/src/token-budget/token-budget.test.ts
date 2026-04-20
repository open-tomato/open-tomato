import { describe, expect, it } from 'vitest';

import { TokenCounter } from '../token-counter.js';

import { TokenBudgetManager } from './budget-manager.js';
import { truncateToTokenBudget } from './truncate.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBudget(
  totalTokens: number,
  targetMinPercent = 40,
  targetMaxPercent = 60,
) {
  return {
    totalTokens,
    targetMinPercent,
    targetMaxPercent,
    maxForSection: () => Math.floor(totalTokens / 10),
  };
}

// ─── truncateToTokenBudget ────────────────────────────────────────────────────

describe('truncateToTokenBudget', () => {
  const counter = new TokenCounter();

  it('returns the text unchanged when it fits within the budget', () => {
    const text = 'Short text';
    const result = truncateToTokenBudget(text, 1000, counter);
    expect(result).toBe(text);
  });

  it('returns an empty string when even the first block exceeds the budget', () => {
    const text = 'A very long block that will exceed the tiny budget for sure';
    const result = truncateToTokenBudget(text, 1, counter);
    expect(result).toBe('');
  });

  it('truncates at double-newline block boundaries', () => {
    const blockA = 'First block of content here.';
    const blockB = 'Second block of content here.';
    const blockC = 'Third block of content here.';
    const text = `${blockA}\n\n${blockB}\n\n${blockC}`;

    // Budget fits block A and B but not C
    const budgetForTwo = counter.count(`${blockA}\n\n${blockB}`);
    const result = truncateToTokenBudget(text, budgetForTwo, counter);

    expect(result).toBe(`${blockA}\n\n${blockB}`);
    expect(result).not.toContain(blockC);
  });

  it('includes only the first block when the second would overflow', () => {
    const blockA = 'Block one.';
    const blockB = 'Block two which is quite a bit longer than the first.';
    const text = `${blockA}\n\n${blockB}`;

    const budgetForOne = counter.count(blockA);
    const result = truncateToTokenBudget(text, budgetForOne, counter);

    expect(result).toBe(blockA);
  });

  it('never truncates mid-sentence (result ends on a complete block)', () => {
    const blocks = [
      'Sentence one. Sentence two.',
      'Sentence three. Sentence four.',
      'Sentence five. Sentence six.',
    ];
    const text = blocks.join('\n\n');

    // Force truncation somewhere inside the text
    const halfTokens = Math.floor(counter.count(text) / 2);
    const result = truncateToTokenBudget(text, halfTokens, counter);

    // Result must be one of the valid block prefixes — never a partial block
    const validPrefixes = [
      blocks[0],
      `${blocks[0]}\n\n${blocks[1]}`,
    ];
    expect(validPrefixes).toContain(result);
  });

  it('handles text with no block boundaries (single block)', () => {
    const text = 'No double newlines anywhere in this text at all.';
    const budget = counter.count(text);
    expect(truncateToTokenBudget(text, budget, counter)).toBe(text);
    expect(truncateToTokenBudget(text, budget - 1, counter)).toBe('');
  });

  it('handles empty string input', () => {
    expect(truncateToTokenBudget('', 100, counter)).toBe('');
  });

  it('does not exceed the token budget', () => {
    const text = Array.from({ length: 20 }, (_, i) => `Block ${i + 1} content.`).join('\n\n');
    const maxTokens = 50;
    const result = truncateToTokenBudget(text, maxTokens, counter);
    expect(counter.count(result)).toBeLessThanOrEqual(maxTokens);
  });
});

// ─── TokenBudgetManager ───────────────────────────────────────────────────────

describe('TokenBudgetManager', () => {
  it('reports full budget remaining when nothing has been consumed', () => {
    const manager = new TokenBudgetManager(makeBudget(1000));
    expect(manager.remaining()).toBe(1000);
  });

  it('decrements remaining after consume', () => {
    const manager = new TokenBudgetManager(makeBudget(1000));
    manager.consume('section-1', 300);
    expect(manager.remaining()).toBe(700);
  });

  it('accumulates multiple consume calls for the same section', () => {
    const manager = new TokenBudgetManager(makeBudget(1000));
    manager.consume('section-1', 100);
    manager.consume('section-1', 200);
    expect(manager.remaining()).toBe(700);
  });

  it('accumulates consume calls across different sections', () => {
    const manager = new TokenBudgetManager(makeBudget(1000));
    manager.consume('section-1', 200);
    manager.consume('section-2', 300);
    expect(manager.remaining()).toBe(500);
  });

  it('clamps remaining to 0 when over-consumed', () => {
    const manager = new TokenBudgetManager(makeBudget(100));
    manager.consume('section-1', 200);
    expect(manager.remaining()).toBe(0);
  });

  it('withinSmartZone returns false when below the minimum percent', () => {
    const manager = new TokenBudgetManager(makeBudget(1000, 40, 60));
    manager.consume('section-1', 100); // 10 % — below 40 %
    expect(manager.withinSmartZone()).toBe(false);
  });

  it('withinSmartZone returns true when fill is inside the target range', () => {
    const manager = new TokenBudgetManager(makeBudget(1000, 40, 60));
    manager.consume('section-1', 500); // 50 % — inside [40, 60]
    expect(manager.withinSmartZone()).toBe(true);
  });

  it('withinSmartZone returns false when above the maximum percent', () => {
    const manager = new TokenBudgetManager(makeBudget(1000, 40, 60));
    manager.consume('section-1', 700); // 70 % — above 60 %
    expect(manager.withinSmartZone()).toBe(false);
  });

  it('withinSmartZone returns true at the exact minimum boundary', () => {
    const manager = new TokenBudgetManager(makeBudget(1000, 40, 60));
    manager.consume('section-1', 400); // exactly 40 %
    expect(manager.withinSmartZone()).toBe(true);
  });

  it('withinSmartZone returns true at the exact maximum boundary', () => {
    const manager = new TokenBudgetManager(makeBudget(1000, 40, 60));
    manager.consume('section-1', 600); // exactly 60 %
    expect(manager.withinSmartZone()).toBe(true);
  });
});
