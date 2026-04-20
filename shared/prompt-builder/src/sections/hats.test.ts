import type { HatDefinition, PromptContext } from '../types/index.js';

import { describe, expect, it } from 'vitest';

import { HatsSection } from './hats.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeHat(overrides?: Partial<HatDefinition>): HatDefinition {
  return {
    id: 'test-hat',
    name: 'Test Hat',
    role: 'Does testing',
    publishTopics: ['test.done'],
    subscribeTopics: ['test.start'],
    instructions: 'Run all tests.',
    ...overrides,
  };
}

function makeContext(
  hats: HatDefinition[],
  activeHatIds: string[],
): Pick<PromptContext, 'hats' | 'activeHatIds'> & Partial<PromptContext> {
  return { hats, activeHatIds } as PromptContext;
}

// ─── HatsSection ──────────────────────────────────────────────────────────────

describe('HatsSection', () => {
  const section = new HatsSection();

  it('has the correct section name', () => {
    expect(section.name).toBe('hats');
  });

  it('returns an empty string when hats array is empty', () => {
    const result = section.render(makeContext([], []) as PromptContext);
    expect(result).toBe('');
  });

  // ─── Topology table ─────────────────────────────────────────────────────────

  describe('topology table', () => {
    it('renders the section header', () => {
      const hat = makeHat();
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).toContain('## HATS');
    });

    it('renders table column headers', () => {
      const hat = makeHat();
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).toContain('| Hat ID | Role | Publishes | Subscribes |');
    });

    it('renders table divider row', () => {
      const hat = makeHat();
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).toContain('| --- | --- | --- | --- |');
    });

    it('renders hat id and role in table row', () => {
      const hat = makeHat({ id: 'planner', role: 'Plans tasks' });
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).toContain('| planner');
      expect(result).toContain('Plans tasks');
    });

    it('renders publish topics as comma-separated list', () => {
      const hat = makeHat({ publishTopics: ['task.created', 'task.updated'] });
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).toContain('task.created, task.updated');
    });

    it('renders subscribe topics as comma-separated list', () => {
      const hat = makeHat({ subscribeTopics: ['goal.received', 'input.ready'] });
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).toContain('goal.received, input.ready');
    });

    it('renders em dash when publishTopics is empty', () => {
      const hat = makeHat({ publishTopics: [] });
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).toContain('—');
    });

    it('renders em dash when subscribeTopics is empty', () => {
      const hat = makeHat({ subscribeTopics: [] });
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).toContain('—');
    });

    it('renders all hats in the table', () => {
      const hats = [
        makeHat({ id: 'planner', role: 'Plans' }),
        makeHat({ id: 'coder', role: 'Codes' }),
        makeHat({ id: 'reviewer', role: 'Reviews' }),
      ];
      const result = section.render(makeContext(hats, []) as PromptContext);
      expect(result).toContain('planner');
      expect(result).toContain('coder');
      expect(result).toContain('reviewer');
    });
  });

  // ─── Reachability validation ─────────────────────────────────────────────────

  describe('reachability validation', () => {
    it('does not flag isolated hat when only one active hat (solo)', () => {
      const hat = makeHat({ id: 'solo', publishTopics: [], subscribeTopics: [] });
      const result = section.render(makeContext([hat], ['solo']) as PromptContext);
      expect(result).not.toContain('ISOLATED');
    });

    it('does not flag hats that are connected via pub/sub', () => {
      const hats = [
        makeHat({ id: 'a', publishTopics: ['x'], subscribeTopics: [] }),
        makeHat({ id: 'b', publishTopics: [], subscribeTopics: ['x'] }),
      ];
      const result = section.render(makeContext(hats, ['a', 'b']) as PromptContext);
      expect(result).not.toContain('ISOLATED');
    });

    it('flags an active hat that has no publish/subscribe connections in multi-hat topology', () => {
      const hats = [
        makeHat({ id: 'a', publishTopics: ['x'], subscribeTopics: [] }),
        makeHat({ id: 'b', publishTopics: [], subscribeTopics: ['x'] }),
        makeHat({ id: 'orphan', publishTopics: [], subscribeTopics: [] }),
      ];
      const result = section.render(makeContext(hats, ['a', 'b', 'orphan']) as PromptContext);
      expect(result).toContain('orphan');
      expect(result).toContain('ISOLATED');
    });

    it('does not flag inactive isolated hats', () => {
      const hats = [
        makeHat({ id: 'a', publishTopics: ['x'], subscribeTopics: [] }),
        makeHat({ id: 'b', publishTopics: [], subscribeTopics: ['x'] }),
        makeHat({ id: 'orphan', publishTopics: [], subscribeTopics: [] }),
      ];
      // orphan is not in activeHatIds
      const result = section.render(makeContext(hats, ['a', 'b']) as PromptContext);
      expect(result).not.toContain('ISOLATED');
    });

    it('does not flag isolated hat when only zero active hats', () => {
      const hat = makeHat({ id: 'solo', publishTopics: [], subscribeTopics: [] });
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).not.toContain('ISOLATED');
    });
  });

  // ─── Data-flow description ───────────────────────────────────────────────────

  describe('data-flow description', () => {
    it('renders "no topic connections" message when no matching pub/sub pairs', () => {
      const hat = makeHat({ publishTopics: ['x'], subscribeTopics: ['y'] });
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).toContain('No topic connections defined between hats');
    });

    it('renders a flow line when publisher and subscriber share a topic', () => {
      const hats = [
        makeHat({ id: 'a', publishTopics: ['event.happened'], subscribeTopics: [] }),
        makeHat({ id: 'b', publishTopics: [], subscribeTopics: ['event.happened'] }),
      ];
      const result = section.render(makeContext(hats, []) as PromptContext);
      expect(result).toContain('`a` publishes `event.happened`');
      expect(result).toContain('consumed by `b`');
    });

    it('renders multiple flow lines for multiple topic connections', () => {
      const hats = [
        makeHat({ id: 'src', publishTopics: ['t1', 't2'], subscribeTopics: [] }),
        makeHat({ id: 'dst', publishTopics: [], subscribeTopics: ['t1', 't2'] }),
      ];
      const result = section.render(makeContext(hats, []) as PromptContext);
      expect(result).toContain('`src` publishes `t1`');
      expect(result).toContain('`src` publishes `t2`');
    });

    it('does not create a self-loop flow line', () => {
      const hat = makeHat({ id: 'self', publishTopics: ['x'], subscribeTopics: ['x'] });
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).not.toContain('`self` publishes `x` → consumed by `self`');
    });

    it('renders "Data flow:" prefix', () => {
      const hat = makeHat();
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).toContain('**Data flow:**');
    });
  });

  // ─── Hat instructions ────────────────────────────────────────────────────────

  describe('hat instructions', () => {
    it('renders instructions for an active hat', () => {
      const hat = makeHat({ id: 'planner', instructions: 'Always plan carefully.' });
      const result = section.render(makeContext([hat], ['planner']) as PromptContext);
      expect(result).toContain('Always plan carefully.');
    });

    it('does not render instructions for an inactive hat', () => {
      const active = makeHat({ id: 'active', instructions: 'Active instructions.' });
      const inactive = makeHat({ id: 'inactive', instructions: 'Inactive instructions.' });
      const result = section.render(
        makeContext([active, inactive], ['active']) as PromptContext,
      );
      expect(result).toContain('Active instructions.');
      expect(result).not.toContain('Inactive instructions.');
    });

    it('renders the hat id and name as section heading', () => {
      const hat = makeHat({ id: 'coder', name: 'Code Writer' });
      const result = section.render(makeContext([hat], ['coder']) as PromptContext);
      expect(result).toContain('### `coder` — Code Writer');
    });

    it('renders publish constraint listing allowed topics', () => {
      const hat = makeHat({ id: 'a', publishTopics: ['output.ready', 'output.done'] });
      const result = section.render(makeContext([hat], ['a']) as PromptContext);
      expect(result).toContain('`output.ready`');
      expect(result).toContain('`output.done`');
      expect(result).toContain('Publish constraint');
    });

    it('renders no authorised publish topics message when publishTopics is empty', () => {
      const hat = makeHat({ id: 'reader', publishTopics: [] });
      const result = section.render(makeContext([hat], ['reader']) as PromptContext);
      expect(result).toContain('no authorised publish topics');
    });

    it('renders instructions for multiple active hats', () => {
      const hats = [
        makeHat({ id: 'a', instructions: 'Instructions for A.' }),
        makeHat({ id: 'b', instructions: 'Instructions for B.' }),
      ];
      const result = section.render(makeContext(hats, ['a', 'b']) as PromptContext);
      expect(result).toContain('Instructions for A.');
      expect(result).toContain('Instructions for B.');
    });

    it('omits the instructions block entirely when no hats are active', () => {
      const hat = makeHat({ id: 'hat', instructions: 'Should not appear.' });
      const result = section.render(makeContext([hat], []) as PromptContext);
      expect(result).not.toContain('Should not appear.');
      expect(result).not.toContain('###');
    });
  });

  // ─── Idempotency ─────────────────────────────────────────────────────────────

  it('produces identical output on successive calls with the same context', () => {
    const hats = [
      makeHat({ id: 'a', publishTopics: ['x'], subscribeTopics: [] }),
      makeHat({ id: 'b', publishTopics: [], subscribeTopics: ['x'] }),
    ];
    const context = makeContext(hats, ['a', 'b']) as PromptContext;
    expect(section.render(context)).toBe(section.render(context));
  });
});
