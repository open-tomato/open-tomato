import type { PromptContext } from '../types/index.js';

import { describe, expect, it } from 'vitest';

import { RobotGuidanceSection } from './robot-guidance.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeContext(robotGuidance: string[]): PromptContext {
  return { robotGuidance } as PromptContext;
}

// ─── RobotGuidanceSection ─────────────────────────────────────────────────────

describe('RobotGuidanceSection', () => {
  const section = new RobotGuidanceSection();

  it('has the correct section name', () => {
    expect(section.name).toBe('robot-guidance');
  });

  it('returns an empty string when robotGuidance is empty', () => {
    expect(section.render(makeContext([]))).toBe('');
  });

  it('renders the section header', () => {
    const result = section.render(makeContext(['Do something.']));
    expect(result).toContain('## ROBOT GUIDANCE');
  });

  it('renders a single guidance message as item 1', () => {
    const result = section.render(makeContext(['Focus on auth.']));
    expect(result).toContain('1. Focus on auth.');
  });

  it('renders multiple messages as a numbered list', () => {
    const result = section.render(makeContext(['First.', 'Second.', 'Third.']));
    expect(result).toContain('1. First.');
    expect(result).toContain('2. Second.');
    expect(result).toContain('3. Third.');
  });

  it('separates header and list with a blank line', () => {
    const result = section.render(makeContext(['Only message.']));
    expect(result).toBe('## ROBOT GUIDANCE\n\n1. Only message.');
  });

  it('renders list items separated by newlines (not blank lines)', () => {
    const result = section.render(makeContext(['A.', 'B.']));
    expect(result).toBe('## ROBOT GUIDANCE\n\n1. A.\n2. B.');
  });

  it('produces identical output on successive calls with the same context', () => {
    const context = makeContext(['Stable guidance.']);
    expect(section.render(context)).toBe(section.render(context));
  });

  it('reflects updated guidance when context changes', () => {
    const r1 = section.render(makeContext(['First pass.']));
    const r2 = section.render(makeContext(['Second pass.']));
    expect(r1).toContain('First pass.');
    expect(r2).toContain('Second pass.');
    expect(r1).not.toContain('Second pass.');
  });
});
