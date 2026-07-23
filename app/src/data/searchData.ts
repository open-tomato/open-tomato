/**
 * Full-page search (WS07 session 3).
 *
 * The fall-through target of the topbar SearchSuggest (⌘K → Enter with no
 * selection). Projects sessions, agents, tasks and tools into
 * double-row result records and appends a small deterministic doc set,
 * then filters by the query needle. Richer than `search.suggest` (a longer
 * `description` line vs. the popover's terse mono `sub`).
 */

import type { SearchResultRecord } from './types';

import { AGENTS, SESSIONS, TASKS, TOOLS } from './fixtures';
import { resolveOwnerHandle } from './tasksData';

const TOOL_TYPE_WORD: Record<string, string> = {
  'api-client': 'API',
  'mcp-server': 'MCP',
  'skill-set': 'skill',
};

/** External docs — absolute URLs, opened in a new tab (mirrors suggest). */
const DOC_RESULTS: SearchResultRecord[] = [
  {
    id: 'doc-auth-sessions',
    kind: 'doc',
    title: 'Authenticating agent sessions',
    description: 'docs/concepts · how JWT session tokens flow through a run.',
    href: 'https://docs.open-tomato.dev/concepts/auth-sessions',
  },
  {
    id: 'doc-composting-context',
    kind: 'doc',
    title: 'Composting context between runs',
    description: 'docs/experiments · reclaiming stale context after an idle window.',
    href: 'https://docs.open-tomato.dev/experiments/composting-context',
  },
];

/** Every entity + doc projected into a result row (unfiltered). */
const buildAll = (workspaceId?: string): SearchResultRecord[] => {
  const scope = <T extends { workspaceId: string }>(rows: T[]): T[] => (workspaceId == null
    ? rows
    : rows.filter((r) => r.workspaceId === workspaceId));

  const sessions = scope(SESSIONS).map((s): SearchResultRecord => ({
    id: s.id,
    kind: 'session',
    title: s.title,
    description: `${s.status} · ${s.model}${s.branch != null
      ? ` · ${s.branch}`
      : ''} — ${s.filesChanged} files, ${s.toolCalls} tool calls.`,
    href: `/sessions/${s.id}`,
  }));

  const agents = scope(AGENTS).map((a): SearchResultRecord => ({
    id: a.id,
    kind: 'agent',
    title: a.name,
    description: a.description,
    href: `/agents/${a.id}`,
  }));

  const tasks = scope(TASKS).map((t): SearchResultRecord => ({
    id: t.id,
    kind: 'task',
    title: t.title,
    description: `${t.id} · ${t.status} · ${t.priority} priority · owner ${resolveOwnerHandle(t.ownerId)}.`,
    href: `/tasks/${t.id}`,
  }));

  const tools = scope(TOOLS).map((t): SearchResultRecord => ({
    id: t.id,
    kind: 'tool',
    title: t.name,
    description: `${TOOL_TYPE_WORD[t.type] ?? t.type} · ${t.status} — ${t.description}`,
    href: `/tools/${t.id}`,
  }));

  return [...sessions, ...agents, ...tasks, ...tools, ...DOC_RESULTS];
};

/**
 * Search results for a query, live-filtered across title, description and
 * kind. An empty/whitespace query returns nothing (the page shows its
 * empty state — the header still echoes the query).
 */
export const buildSearchResults = (
  query?: string,
  workspaceId?: string,
): SearchResultRecord[] => {
  const needle = query?.trim().toLowerCase() ?? '';
  if (needle === '') return [];
  return buildAll(workspaceId).filter(
    (r) => `${r.title} ${r.description} ${r.kind}`.toLowerCase().includes(needle),
  );
};
