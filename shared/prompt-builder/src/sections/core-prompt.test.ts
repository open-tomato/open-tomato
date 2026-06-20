import type { GuardrailRule, PromptContext } from '../types/index.js';

import { describe, expect, it } from 'vitest';

import { CorePromptSection } from './core-prompt.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRule(
  index: number,
  level: GuardrailRule['level'],
  rule: string,
): GuardrailRule {
  return { index, level, rule };
}

function makeContext(guardrails: GuardrailRule[]): PromptContext {
  return {
    hatId: 'test-hat',
    objective: 'Test objective.',
    robotGuidance: [],
    pendingEvents: [],
    memories: [],
    skills: [],
    guardrails,
    hats: [],
    activeHatIds: ['test-hat'],
    tokenBudget: {
      totalTokens: 10000,
      targetMinPercent: 40,
      targetMaxPercent: 60,
      maxForSection: () => 2000,
    },
  };
}

// ─── CorePromptSection ────────────────────────────────────────────────────────

describe('CorePromptSection', () => {
  const section = new CorePromptSection();

  it('has the correct section name', () => {
    expect(section.name).toBe('core-prompt');
  });

  describe('ORIENTATION block', () => {
    it('includes the ORIENTATION header', () => {
      const result = section.render(makeContext([]));
      expect(result).toContain('## ORIENTATION');
    });

    it('mentions identity and role', () => {
      const result = section.render(makeContext([]));
      expect(result).toMatch(/identity|role/i);
    });

    it('includes the fresh-context reminder', () => {
      const result = section.render(makeContext([]));
      expect(result).toMatch(/fresh context|each iteration begins/i);
    });
  });

  describe('SCRATCHPAD block', () => {
    it('includes the SCRATCHPAD header', () => {
      const result = section.render(makeContext([]));
      expect(result).toContain('## SCRATCHPAD');
    });

    it('encourages explicit reasoning before action', () => {
      const result = section.render(makeContext([]));
      expect(result).toMatch(/reason|thinking/i);
    });
  });

  describe('STATE MANAGEMENT block', () => {
    it('includes the STATE MANAGEMENT header', () => {
      const result = section.render(makeContext([]));
      expect(result).toContain('## STATE MANAGEMENT');
    });

    it('warns that state must be externalised', () => {
      const result = section.render(makeContext([]));
      expect(result).toMatch(/event bus|memory store|externalised/i);
    });
  });

  describe('GUARDRAILS block', () => {
    it('includes the GUARDRAILS header', () => {
      const result = section.render(makeContext([]));
      expect(result).toContain('## GUARDRAILS');
    });

    it('renders the block header even when guardrails array is empty', () => {
      const result = section.render(makeContext([]));
      expect(result).toContain('## GUARDRAILS');
    });

    it('renders a single MUST rule correctly', () => {
      const rules = [makeRule(1, 'MUST', 'Always verify inputs before processing.')];
      const result = section.render(makeContext(rules));
      expect(result).toContain('1. MUST: Always verify inputs before processing.');
    });

    it('renders a MUST NOT rule correctly', () => {
      const rules = [makeRule(1, 'MUST NOT', 'Leak sensitive data in logs.')];
      const result = section.render(makeContext(rules));
      expect(result).toContain('1. MUST NOT: Leak sensitive data in logs.');
    });

    it('renders multiple rules with correct indices', () => {
      const rules = [
        makeRule(1, 'MUST', 'First rule.'),
        makeRule(2, 'SHOULD', 'Second rule.'),
        makeRule(3, 'MAY', 'Third rule.'),
      ];
      const result = section.render(makeContext(rules));
      expect(result).toContain('1. MUST: First rule.');
      expect(result).toContain('2. SHOULD: Second rule.');
      expect(result).toContain('3. MAY: Third rule.');
    });

    it('renders all RFC2119 levels', () => {
      const rules: GuardrailRule[] = [
        makeRule(1, 'MUST', 'Rule one.'),
        makeRule(2, 'MUST NOT', 'Rule two.'),
        makeRule(3, 'SHOULD', 'Rule three.'),
        makeRule(4, 'SHOULD NOT', 'Rule four.'),
        makeRule(5, 'MAY', 'Rule five.'),
      ];
      const result = section.render(makeContext(rules));
      expect(result).toContain('1. MUST:');
      expect(result).toContain('2. MUST NOT:');
      expect(result).toContain('3. SHOULD:');
      expect(result).toContain('4. SHOULD NOT:');
      expect(result).toContain('5. MAY:');
    });

    it('preserves rule order as provided', () => {
      const rules = [
        makeRule(1, 'MUST', 'Alpha.'),
        makeRule(2, 'SHOULD', 'Beta.'),
        makeRule(3, 'MAY', 'Gamma.'),
      ];
      const result = section.render(makeContext(rules));
      const pos1 = result.indexOf('1. MUST: Alpha.');
      const pos2 = result.indexOf('2. SHOULD: Beta.');
      const pos3 = result.indexOf('3. MAY: Gamma.');
      expect(pos1).toBeLessThan(pos2);
      expect(pos2).toBeLessThan(pos3);
    });
  });

  describe('block ordering', () => {
    it('renders ORIENTATION before SCRATCHPAD', () => {
      const result = section.render(makeContext([]));
      expect(result.indexOf('## ORIENTATION')).toBeLessThan(result.indexOf('## SCRATCHPAD'));
    });

    it('renders SCRATCHPAD before STATE MANAGEMENT', () => {
      const result = section.render(makeContext([]));
      expect(result.indexOf('## SCRATCHPAD')).toBeLessThan(result.indexOf('## STATE MANAGEMENT'));
    });

    it('renders STATE MANAGEMENT before GUARDRAILS', () => {
      const result = section.render(makeContext([]));
      expect(result.indexOf('## STATE MANAGEMENT')).toBeLessThan(result.indexOf('## GUARDRAILS'));
    });

    it('separates blocks with blank lines', () => {
      const result = section.render(makeContext([]));
      expect(result).toContain('\n\n');
    });
  });
});
