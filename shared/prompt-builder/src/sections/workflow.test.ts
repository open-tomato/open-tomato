import type { PromptContext } from '../types/index.js';

import { describe, expect, it } from 'vitest';

import { WorkflowSection } from './workflow.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeContext(activeHatIds: string[]): PromptContext {
  return { activeHatIds } as PromptContext;
}

// ─── WorkflowSection ──────────────────────────────────────────────────────────

describe('WorkflowSection', () => {
  const section = new WorkflowSection();

  it('has the correct section name', () => {
    expect(section.name).toBe('workflow');
  });

  describe('solo workflow (activeHatIds.length <= 1)', () => {
    it('renders solo workflow when activeHatIds is empty', () => {
      const result = section.render(makeContext([]));
      expect(result).toContain('STUDY → PLAN → IMPLEMENT → VERIFY → REPEAT');
    });

    it('renders solo workflow when activeHatIds has one entry', () => {
      const result = section.render(makeContext(['planner']));
      expect(result).toContain('STUDY → PLAN → IMPLEMENT → VERIFY → REPEAT');
    });

    it('renders the section header', () => {
      const result = section.render(makeContext(['planner']));
      expect(result).toContain('## WORKFLOW');
    });

    it('includes all five solo steps', () => {
      const result = section.render(makeContext(['solo-hat']));
      expect(result).toContain('**STUDY**');
      expect(result).toContain('**PLAN**');
      expect(result).toContain('**IMPLEMENT**');
      expect(result).toContain('**VERIFY**');
      expect(result).toContain('**REPEAT**');
    });

    it('does not include DELEGATE in solo workflow', () => {
      const result = section.render(makeContext(['solo-hat']));
      expect(result).not.toContain('DELEGATE');
    });
  });

  describe('multi-hat workflow (activeHatIds.length > 1)', () => {
    it('renders multi-hat workflow when activeHatIds has two entries', () => {
      const result = section.render(makeContext(['planner', 'coder']));
      expect(result).toContain('PLAN → DELEGATE');
    });

    it('renders multi-hat workflow when activeHatIds has more than two entries', () => {
      const result = section.render(makeContext(['planner', 'coder', 'reviewer']));
      expect(result).toContain('PLAN → DELEGATE');
    });

    it('renders the section header', () => {
      const result = section.render(makeContext(['planner', 'coder']));
      expect(result).toContain('## WORKFLOW');
    });

    it('includes PLAN and DELEGATE steps', () => {
      const result = section.render(makeContext(['planner', 'coder']));
      expect(result).toContain('**PLAN**');
      expect(result).toContain('**DELEGATE**');
    });

    it('includes fast-path logic description', () => {
      const result = section.render(makeContext(['planner', 'coder']));
      expect(result).toContain('Fast path');
    });

    it('lists all active hat ids in delegation list', () => {
      const result = section.render(makeContext(['planner', 'coder', 'reviewer']));
      expect(result).toContain('`planner`');
      expect(result).toContain('`coder`');
      expect(result).toContain('`reviewer`');
    });

    it('does not include solo steps in multi-hat workflow', () => {
      const result = section.render(makeContext(['planner', 'coder']));
      expect(result).not.toContain('STUDY → PLAN → IMPLEMENT → VERIFY → REPEAT');
    });
  });

  it('produces identical output on successive calls with the same context', () => {
    const context = makeContext(['planner']);
    expect(section.render(context)).toBe(section.render(context));

    const multiContext = makeContext(['planner', 'coder']);
    expect(section.render(multiContext)).toBe(section.render(multiContext));
  });
});
