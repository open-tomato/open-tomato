import type { PromptContext } from '../types/index.js';

import { describe, expect, it } from 'vitest';

import { EventWritingSection } from './event-writing.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeContext(overrides?: Partial<PromptContext>): PromptContext {
  return {
    hatId: 'test-hat',
    objective: 'Test objective.',
    robotGuidance: [],
    pendingEvents: [],
    memories: [],
    skills: [],
    guardrails: [],
    hats: [],
    activeHatIds: ['test-hat'],
    tokenBudget: {
      totalTokens: 100_000,
      targetMinPercent: 40,
      targetMaxPercent: 60,
      maxForSection: () => 10_000,
    },
    ...overrides,
  } as PromptContext;
}

// ─── EventWritingSection ──────────────────────────────────────────────────────

describe('EventWritingSection', () => {
  const section = new EventWritingSection();

  it('has the correct section name', () => {
    expect(section.name).toBe('event-writing');
  });

  it('always renders content regardless of context', () => {
    const context = makeContext();
    expect(section.render(context)).not.toBe('');
  });

  it('starts with the section heading', () => {
    const result = section.render(makeContext());
    expect(result.startsWith('## EVENT WRITING')).toBe(true);
  });

  it('renders identical output for different contexts', () => {
    const contextA = makeContext({ hatId: 'hat-a', objective: 'Goal A' });
    const contextB = makeContext({ hatId: 'hat-b', objective: 'Goal B', activeHatIds: ['hat-b', 'hat-c'] });
    expect(section.render(contextA)).toBe(section.render(contextB));
  });

  it('includes the MUST topic authorisation rule', () => {
    const result = section.render(makeContext());
    expect(result).toContain('publishTopics');
    expect(result).toContain('MUST');
  });

  it('includes the unique id idempotency rule', () => {
    const result = section.render(makeContext());
    expect(result).toContain('id');
    expect(result).toContain('deduplicate');
  });

  it('includes the emit-after-completion ordering rule', () => {
    const result = section.render(makeContext());
    expect(result).toContain('completed successfully');
  });

  it('includes the MUST NOT serialisation rule', () => {
    const result = section.render(makeContext());
    expect(result).toContain('MUST NOT');
    expect(result).toContain('JSON');
  });

  it('includes the SHOULD timestamp rule', () => {
    const result = section.render(makeContext());
    expect(result).toContain('timestamp');
    expect(result).toContain('ISO 8601');
  });

  it('includes the SHOULD error event rule', () => {
    const result = section.render(makeContext());
    expect(result).toContain('error event');
  });

  it('includes the MAY batch rule', () => {
    const result = section.render(makeContext());
    expect(result).toContain('MAY');
    expect(result).toContain('batch');
  });
});
