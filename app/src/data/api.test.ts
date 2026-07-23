import { describe, expect, test } from 'vitest';

import { api } from './api';
import { DEFAULT_WORKSPACE_ID, SESSIONS } from './fixtures';

describe('mock api', () => {
  test('sessions.list returns the deterministic fixture set', async () => {
    const sessions = await api.sessions.list();
    expect(sessions.map((s) => s.id)).toEqual(SESSIONS.map((s) => s.id));
    expect(sessions[0]?.startedAt).toBe('2026-07-20T09:30:00Z');
  });

  test('list results are copies — callers cannot mutate fixtures', async () => {
    const first = await api.sessions.list();
    const second = await api.sessions.list();
    expect(first).toEqual(second);
    expect(first[0]).not.toBe(second[0]);
  });

  test('list filters by workspace id', async () => {
    const sessions = await api.sessions.list(DEFAULT_WORKSPACE_ID);
    expect(sessions.length).toBeGreaterThan(0);
    expect(
      sessions.every((s) => s.workspaceId === DEFAULT_WORKSPACE_ID),
    ).toBe(true);
  });

  test('get resolves a known entity and rejects unknown ids', async () => {
    const agent = await api.agents.get('agt-planner');
    expect(agent.name).toBe('planner');
    await expect(api.agents.get('agt-nope')).rejects.toThrow(
      'agent "agt-nope" not found',
    );
  });

  test('usage.stats resolves per workspace', async () => {
    const stats = await api.usage.stats(DEFAULT_WORKSPACE_ID);
    expect(stats.week.tokenLimit).toBe(4_000_000);
  });

  test('search.suggest covers all five suggestion kinds', async () => {
    const suggestions = await api.search.suggest();
    const kinds = new Set(suggestions.map((s) => s.kind));
    expect([...kinds].sort()).toEqual(
      ['agent', 'doc', 'session', 'task', 'tool'],
    );
  });

  test('search.suggest filters by query', async () => {
    const suggestions = await api.search.suggest('planner');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(
      suggestions.every((s) => `${s.label} ${s.sub ?? ''}`.toLowerCase().includes('planner')),
    ).toBe(true);
  });
});
