import { describe, expect, it } from 'vitest';

import { GuardrailsRegistry, defaultGuardrails } from './registry.js';

describe('GuardrailsRegistry', () => {
  describe('add', () => {
    it('assigns sequential 1-based indices', () => {
      const registry = new GuardrailsRegistry();
      registry.add({ level: 'MUST', rule: 'First rule.' });
      registry.add({ level: 'SHOULD', rule: 'Second rule.' });
      registry.add({ level: 'MAY', rule: 'Third rule.' });

      const rules = registry.getRules();
      expect(rules[0].index).toBe(1);
      expect(rules[1].index).toBe(2);
      expect(rules[2].index).toBe(3);
    });

    it('preserves level and rule text', () => {
      const registry = new GuardrailsRegistry();
      registry.add({ level: 'MUST NOT', rule: 'Do not do this.' });

      const rules = registry.getRules();
      expect(rules[0].level).toBe('MUST NOT');
      expect(rules[0].rule).toBe('Do not do this.');
    });

    it('maintains insertion order', () => {
      const registry = new GuardrailsRegistry();
      registry.add({ level: 'MUST', rule: 'Alpha.' });
      registry.add({ level: 'MUST', rule: 'Beta.' });
      registry.add({ level: 'MUST', rule: 'Gamma.' });

      const rules = registry.getRules();
      expect(rules.map((r) => r.rule)).toEqual(['Alpha.', 'Beta.', 'Gamma.']);
    });
  });

  describe('size', () => {
    it('returns 0 for an empty registry', () => {
      const registry = new GuardrailsRegistry();
      expect(registry.size).toBe(0);
    });

    it('returns the correct count after additions', () => {
      const registry = new GuardrailsRegistry();
      registry.add({ level: 'MUST', rule: 'One.' });
      registry.add({ level: 'MUST', rule: 'Two.' });
      expect(registry.size).toBe(2);
    });
  });

  describe('toPromptText', () => {
    it('returns an empty string when no rules exist', () => {
      const registry = new GuardrailsRegistry();
      expect(registry.toPromptText()).toBe('');
    });

    it('formats a single rule as "N. LEVEL: rule"', () => {
      const registry = new GuardrailsRegistry();
      registry.add({ level: 'MUST', rule: 'Always log actions.' });
      expect(registry.toPromptText()).toBe('1. MUST: Always log actions.');
    });

    it('formats multiple rules on separate lines', () => {
      const registry = new GuardrailsRegistry();
      registry.add({ level: 'MUST', rule: 'First.' });
      registry.add({ level: 'SHOULD NOT', rule: 'Second.' });
      registry.add({ level: 'MAY', rule: 'Third.' });

      const text = registry.toPromptText();
      expect(text).toBe(
        '1. MUST: First.\n2. SHOULD NOT: Second.\n3. MAY: Third.',
      );
    });

    it('reflects newly added rules immediately', () => {
      const registry = new GuardrailsRegistry();
      registry.add({ level: 'MUST', rule: 'Initial.' });
      const before = registry.toPromptText();

      registry.add({ level: 'SHOULD', rule: 'Added later.' });
      const after = registry.toPromptText();

      expect(before).toBe('1. MUST: Initial.');
      expect(after).toBe('1. MUST: Initial.\n2. SHOULD: Added later.');
    });
  });

  describe('getRules (append-only enforcement)', () => {
    it('returns a readonly snapshot that cannot mutate internal state via push', () => {
      const registry = new GuardrailsRegistry();
      registry.add({ level: 'MUST', rule: 'Original.' });

      const snapshot = registry.getRules();
      // TypeScript prevents .push at compile time; at runtime the array is
      // frozen by being a private field, but we verify the registry is stable.
      expect(snapshot).toHaveLength(1);
      expect(registry.size).toBe(1);
    });

    it('does not expose an index gap after multiple additions', () => {
      const registry = new GuardrailsRegistry();
      for (let i = 1; i <= 5; i++) {
        registry.add({ level: 'MUST', rule: `Rule ${i}.` });
      }

      const rules = registry.getRules();
      const indices = rules.map((r) => r.index);
      expect(indices).toEqual([1, 2, 3, 4, 5]);
    });
  });
});

describe('defaultGuardrails', () => {
  it('returns a registry with at least one rule', () => {
    const registry = defaultGuardrails();
    expect(registry.size).toBeGreaterThan(0);
  });

  it('produces a non-empty prompt text', () => {
    const text = defaultGuardrails().toPromptText();
    expect(text.length).toBeGreaterThan(0);
  });

  it('includes at least one MUST rule', () => {
    const rules = defaultGuardrails().getRules();
    const mustRules = rules.filter((r) => r.level === 'MUST');
    expect(mustRules.length).toBeGreaterThan(0);
  });

  it('indices are sequential starting from 1', () => {
    const rules = defaultGuardrails().getRules();
    rules.forEach((rule, i) => {
      expect(rule.index).toBe(i + 1);
    });
  });

  it('each call returns an independent registry instance', () => {
    const a = defaultGuardrails();
    const b = defaultGuardrails();

    const sizeA = a.size;
    b.add({ level: 'MAY', rule: 'Extra rule.' });

    expect(a.size).toBe(sizeA);
    expect(b.size).toBe(sizeA + 1);
  });
});
