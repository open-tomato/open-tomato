import type { PromptContext } from '../types/index.js';

import { describe, expect, it } from 'vitest';

import { ObjectiveSection } from './objective.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeContext(objective: string): PromptContext {
  return { objective } as PromptContext;
}

// ─── ObjectiveSection ─────────────────────────────────────────────────────────

describe('ObjectiveSection', () => {
  const section = new ObjectiveSection();

  it('has the correct section name', () => {
    expect(section.name).toBe('objective');
  });

  it('returns an empty string when objective is empty', () => {
    const context = makeContext('');
    expect(section.render(context)).toBe('');
  });

  it('renders the section header', () => {
    const context = makeContext('Build a REST API.');
    expect(section.render(context)).toContain('## OBJECTIVE');
  });

  it('renders the objective text after the header', () => {
    const objective = 'Implement user authentication with JWT tokens.';
    const context = makeContext(objective);
    const result = section.render(context);

    expect(result).toContain(objective);
  });

  it('renders header and objective separated by a blank line', () => {
    const objective = 'Build a search feature.';
    const context = makeContext(objective);
    const result = section.render(context);

    expect(result).toBe(`## OBJECTIVE\n\n${objective}`);
  });

  it('preserves multi-line objective text verbatim', () => {
    const objective = 'Step 1: Design the schema.\nStep 2: Implement the API.\nStep 3: Write tests.';
    const context = makeContext(objective);
    const result = section.render(context);

    expect(result).toContain(objective);
  });

  it('produces identical output on successive calls with the same context', () => {
    const context = makeContext('A persistent goal that never changes.');
    const first = section.render(context);
    const second = section.render(context);

    expect(first).toBe(second);
  });

  it('reflects an updated objective when context changes', () => {
    const context1 = makeContext('First objective.');
    const context2 = makeContext('Second objective.');

    expect(section.render(context1)).toContain('First objective.');
    expect(section.render(context2)).toContain('Second objective.');
  });
});
