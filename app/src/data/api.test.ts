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

  test('usage.overview honors the range param', async () => {
    const week = await api.usage.overview(DEFAULT_WORKSPACE_ID, '7d');
    const month = await api.usage.overview(DEFAULT_WORKSPACE_ID, '30d');
    const year = await api.usage.overview(DEFAULT_WORKSPACE_ID, 'year');

    expect(week.series).toHaveLength(7);
    expect(month.series).toHaveLength(30);
    expect(year.series).toHaveLength(12);
    // Wider windows accumulate more tokens + tool calls.
    expect(month.totals.tokens).toBeGreaterThan(week.totals.tokens);
    const weekCalls = week.toolCalls.reduce((a, t) => a + t.calls, 0);
    const monthCalls = month.toolCalls.reduce((a, t) => a + t.calls, 0);
    expect(monthCalls).toBeGreaterThan(weekCalls);
  });

  test('usage.overview is deterministic and returns copies', async () => {
    const a = await api.usage.overview(DEFAULT_WORKSPACE_ID, '30d');
    const b = await api.usage.overview(DEFAULT_WORKSPACE_ID, '30d');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.series[0]).not.toBe(b.series[0]);
  });

  test('usage.overview returns the top 5 sessions by spend, descending', async () => {
    const { topSessions } = await api.usage.overview(DEFAULT_WORKSPACE_ID, '30d');
    expect(topSessions.length).toBeLessThanOrEqual(5);
    const costs = topSessions.map((s) => s.costUsd);
    expect(costs).toEqual([...costs].sort((x, y) => y - x));
  });

  test('usage.overview defaults to the 30-day range', async () => {
    const overview = await api.usage.overview(DEFAULT_WORKSPACE_ID);
    expect(overview.range).toBe('30d');
    expect(overview.series).toHaveLength(30);
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
