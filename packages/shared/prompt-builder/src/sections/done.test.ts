import type { PromptContext } from '../types/index.js';

import { describe, expect, it } from 'vitest';

import { DoneSection } from './done.js';

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

// ─── DoneSection ──────────────────────────────────────────────────────────────

describe('DoneSection', () => {
  const section = new DoneSection();

  it('has the correct section name', () => {
    expect(section.name).toBe('done');
  });

  it('always renders content regardless of context', () => {
    expect(section.render(makeContext())).not.toBe('');
  });

  it('starts with the section heading', () => {
    expect(section.render(makeContext()).startsWith('## DONE')).toBe(true);
  });

  it('renders identical output for different contexts', () => {
    const contextA = makeContext({ hatId: 'hat-a', objective: 'Goal A' });
    const contextB = makeContext({ hatId: 'hat-b', objective: 'Goal B', activeHatIds: ['hat-b', 'hat-c'] });
    expect(section.render(contextA)).toBe(section.render(contextB));
  });

  it('includes the objective met checklist item', () => {
    const result = section.render(makeContext());
    expect(result).toContain('Objective met');
  });

  it('includes the unhandled events checklist item', () => {
    const result = section.render(makeContext());
    expect(result).toContain('unhandled events');
  });

  it('includes the event conformance checklist item', () => {
    const result = section.render(makeContext());
    expect(result).toContain('Event conformance');
  });

  it('includes the artefacts documented checklist item', () => {
    const result = section.render(makeContext());
    expect(result).toContain('Artefacts documented');
  });

  it('includes the completion summary checklist item', () => {
    const result = section.render(makeContext());
    expect(result).toContain('Completion summary ready');
  });

  it('includes the task.completed event instruction', () => {
    const result = section.render(makeContext());
    expect(result).toContain('task.completed');
  });

  it('includes objectiveSummary in the completion event payload', () => {
    const result = section.render(makeContext());
    expect(result).toContain('objectiveSummary');
  });

  it('includes completionSummary in the completion event payload', () => {
    const result = section.render(makeContext());
    expect(result).toContain('completionSummary');
  });

  it('includes artefacts in the completion event payload', () => {
    const result = section.render(makeContext());
    expect(result).toContain('artefacts');
  });
});
