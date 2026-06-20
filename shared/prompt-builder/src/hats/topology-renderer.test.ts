import type { HatDefinition, HatTopology } from '../types/index.js';

import { describe, expect, it } from 'vitest';

import { HatTopologyRenderer } from './topology-renderer.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeHat(overrides: Partial<HatDefinition> & { id: string }): HatDefinition {
  return {
    name: overrides.id,
    role: `Role of ${overrides.id}`,
    publishTopics: [],
    subscribeTopics: [],
    instructions: `Instructions for ${overrides.id}`,
    ...overrides,
  };
}

function makeTopology(hats: HatDefinition[]): HatTopology {
  const edges: Record<string, string[]> = {};
  for (const hat of hats) {
    edges[hat.id] = [];
  }
  return { hats, edges };
}

const planner = makeHat({
  id: 'planner',
  role: 'Plans tasks',
  publishTopics: ['task.created'],
  subscribeTopics: ['goal.received'],
});

const executor = makeHat({
  id: 'executor',
  role: 'Executes tasks',
  publishTopics: ['task.done'],
  subscribeTopics: ['task.created'],
});

const reporter = makeHat({
  id: 'reporter',
  role: 'Reports results',
  publishTopics: [],
  subscribeTopics: ['task.done'],
});

const isolated = makeHat({
  id: 'isolated',
  role: 'Has no connections',
  publishTopics: [],
  subscribeTopics: [],
});

// ─── renderTable ──────────────────────────────────────────────────────────────

describe('HatTopologyRenderer.renderTable', () => {
  const renderer = new HatTopologyRenderer();

  it('renders header and divider rows', () => {
    const output = renderer.renderTable([planner]);
    expect(output).toContain('| Hat ID | Role | Publishes | Subscribes |');
    expect(output).toContain('| --- | --- | --- | --- |');
  });

  it('renders hat id, role, publish topics, and subscribe topics', () => {
    const output = renderer.renderTable([planner]);
    expect(output).toContain('| planner |');
    expect(output).toContain('Plans tasks');
    expect(output).toContain('task.created');
    expect(output).toContain('goal.received');
  });

  it('uses em-dash for empty publish topics', () => {
    const output = renderer.renderTable([reporter]);
    const reporterRow = output.split('\n').find((l) => l.includes('reporter'));
    expect(reporterRow).toContain('—');
  });

  it('uses em-dash for empty subscribe topics', () => {
    const noSubs = makeHat({ id: 'noSubs', publishTopics: ['x'], subscribeTopics: [] });
    const output = renderer.renderTable([noSubs]);
    const row = output.split('\n').find((l) => l.includes('noSubs'));
    expect(row).toContain('—');
  });

  it('renders multiple hats in order', () => {
    const output = renderer.renderTable([planner, executor, reporter]);
    const lines = output.split('\n');
    const plannerIdx = lines.findIndex((l) => l.includes('planner'));
    const executorIdx = lines.findIndex((l) => l.includes('executor'));
    const reporterIdx = lines.findIndex((l) => l.includes('reporter'));
    expect(plannerIdx).toBeLessThan(executorIdx);
    expect(executorIdx).toBeLessThan(reporterIdx);
  });

  it('returns only header rows for empty hat list', () => {
    const output = renderer.renderTable([]);
    const lines = output.split('\n');
    expect(lines).toHaveLength(2);
  });

  it('joins multiple publish topics with comma', () => {
    const multi = makeHat({ id: 'multi', publishTopics: ['a', 'b', 'c'] });
    const output = renderer.renderTable([multi]);
    expect(output).toContain('a, b, c');
  });
});

// ─── renderDataFlowDescription ────────────────────────────────────────────────

describe('HatTopologyRenderer.renderDataFlowDescription', () => {
  const renderer = new HatTopologyRenderer();

  it('describes flow between connected hats', () => {
    const topology = makeTopology([planner, executor]);
    const output = renderer.renderDataFlowDescription(topology);
    expect(output).toContain('`planner` publishes `task.created` → consumed by `executor`');
  });

  it('returns no-connections message when no topics match', () => {
    const a = makeHat({ id: 'a', publishTopics: ['x'], subscribeTopics: [] });
    const b = makeHat({ id: 'b', publishTopics: [], subscribeTopics: ['y'] });
    const topology = makeTopology([a, b]);
    const output = renderer.renderDataFlowDescription(topology);
    expect(output).toBe('**Data flow:** No topic connections defined between hats.');
  });

  it('returns no-connections message for empty topology', () => {
    const output = renderer.renderDataFlowDescription({ hats: [], edges: {} });
    expect(output).toBe('**Data flow:** No topic connections defined between hats.');
  });

  it('excludes self-loops', () => {
    const selfLoop = makeHat({
      id: 'self',
      publishTopics: ['loop.topic'],
      subscribeTopics: ['loop.topic'],
    });
    const topology = makeTopology([selfLoop]);
    const output = renderer.renderDataFlowDescription(topology);
    expect(output).toBe('**Data flow:** No topic connections defined between hats.');
  });

  it('describes multi-hop chain', () => {
    const topology = makeTopology([planner, executor, reporter]);
    const output = renderer.renderDataFlowDescription(topology);
    expect(output).toContain('`planner` publishes `task.created` → consumed by `executor`');
    expect(output).toContain('`executor` publishes `task.done` → consumed by `reporter`');
  });
});

// ─── validateReachability ─────────────────────────────────────────────────────

describe('HatTopologyRenderer.validateReachability', () => {
  const renderer = new HatTopologyRenderer();

  it('returns valid for solo active hat', () => {
    const topology = makeTopology([planner]);
    const result = renderer.validateReachability(topology, ['planner']);
    expect(result.valid).toBe(true);
    expect(result.isolatedHatIds).toEqual([]);
  });

  it('returns valid for empty activeHatIds', () => {
    const topology = makeTopology([planner, executor]);
    const result = renderer.validateReachability(topology, []);
    expect(result.valid).toBe(true);
    expect(result.isolatedHatIds).toEqual([]);
  });

  it('returns valid for fully connected hats', () => {
    const topology = makeTopology([planner, executor]);
    const result = renderer.validateReachability(topology, ['planner', 'executor']);
    expect(result.valid).toBe(true);
    expect(result.isolatedHatIds).toEqual([]);
  });

  it('flags isolated hat in multi-hat session', () => {
    const topology = makeTopology([planner, executor, isolated]);
    const result = renderer.validateReachability(topology, ['planner', 'executor', 'isolated']);
    expect(result.valid).toBe(false);
    expect(result.isolatedHatIds).toContain('isolated');
  });

  it('does not flag inactive hats', () => {
    const topology = makeTopology([planner, executor, isolated]);
    const result = renderer.validateReachability(topology, ['planner', 'executor']);
    expect(result.valid).toBe(true);
    expect(result.isolatedHatIds).toEqual([]);
  });

  it('flags hat that only publishes to no-subscriber topic', () => {
    const noSubscriber = makeHat({
      id: 'noSub',
      publishTopics: ['orphan.topic'],
      subscribeTopics: [],
    });
    const topology = makeTopology([planner, noSubscriber]);
    const result = renderer.validateReachability(topology, ['planner', 'noSub']);
    expect(result.isolatedHatIds).toContain('noSub');
  });

  it('considers hat reachable when it can receive from another hat', () => {
    // reporter subscribes to task.done (published by executor)
    const topology = makeTopology([executor, reporter]);
    const result = renderer.validateReachability(topology, ['executor', 'reporter']);
    expect(result.valid).toBe(true);
    expect(result.isolatedHatIds).toEqual([]);
  });
});

// ─── filterInstructions ───────────────────────────────────────────────────────

describe('HatTopologyRenderer.filterInstructions', () => {
  const renderer = new HatTopologyRenderer();

  it('returns only hats in activeHatIds', () => {
    const result = renderer.filterInstructions([planner, executor, reporter], ['planner', 'reporter']);
    expect(result.map((h) => h.id)).toEqual(['planner', 'reporter']);
  });

  it('preserves original order from hats array', () => {
    const result = renderer.filterInstructions([planner, executor, reporter], ['reporter', 'planner']);
    expect(result.map((h) => h.id)).toEqual(['planner', 'reporter']);
  });

  it('returns empty array when activeHatIds is empty', () => {
    const result = renderer.filterInstructions([planner, executor], []);
    expect(result).toEqual([]);
  });

  it('returns empty array when hats is empty', () => {
    const result = renderer.filterInstructions([], ['planner']);
    expect(result).toEqual([]);
  });

  it('ignores activeHatIds that do not match any hat', () => {
    const result = renderer.filterInstructions([planner], ['planner', 'nonexistent']);
    expect(result.map((h) => h.id)).toEqual(['planner']);
  });
});
