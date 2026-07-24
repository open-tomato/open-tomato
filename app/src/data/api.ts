/**
 * The mock api — a thin async facade over deterministic fixtures.
 *
 * Every method returns a Promise of a deep copy, so pages can never mutate
 * the fixtures and later sessions can swap in real fetching (same
 * signatures, real transport) without touching page code. The provider
 * surface documented in app/docs/data-contracts.md IS this object.
 */

import type {
  Agent,
  AgentEditorOptions,
  NewSessionOptions,
  NotificationRecord,
  SearchResultRecord,
  SearchSuggestionRecord,
  Session,
  SessionDetail,
  Task,
  TaskFormOptions,
  TeamMember,
  Tool,
  ToolEditorOptions,
  UsageOverview,
  UsageRange,
  UsageStats,
  User,
  Workspace,
} from './types';

import { buildAgentEditorOptions } from './agentsData';
import {
  AGENTS,
  CURRENT_USER,
  DEFAULT_WORKSPACE_ID,
  MEMBERS,
  NOTIFICATIONS,
  SESSIONS,
  TASKS,
  TOOLS,
  USAGE_STATS,
  WORKSPACES,
} from './fixtures';
import { buildOverview } from './overviewFixtures';
import { buildSearchResults } from './searchData';
import {
  buildNewSessionOptions,
  buildSessionDetail,
  findSession,
} from './sessionsData';
import { buildTaskFormOptions } from './tasksData';
import { buildToolEditorOptions } from './toolsData';

const copy = <T>(value: T): T => structuredClone(value);

const resolveCopy = <T>(value: T): Promise<T> => Promise.resolve(copy(value));

const byWorkspace = <T extends { workspaceId: string }>(
  rows: T[],
  workspaceId?: string,
): T[] => (workspaceId == null
  ? rows
  : rows.filter((row) => row.workspaceId === workspaceId));

const getOrReject = <T extends { id: string }>(
  rows: T[],
  id: string,
  entity: string,
): Promise<T> => {
  const found = rows.find((row) => row.id === id);
  return found != null
    ? resolveCopy(found)
    : Promise.reject(new Error(`${entity} "${id}" not found`));
};

/** Docs suggestions are external — absolute URLs, opened in a new tab. */
const DOC_SUGGESTIONS: SearchSuggestionRecord[] = [
  {
    kind: 'doc',
    id: 'doc-composting-context',
    label: 'Composting context between runs',
    sub: 'docs/experiments',
    href: 'https://docs.open-tomato.dev/experiments/composting-context',
  },
];

const buildSuggestions = (): SearchSuggestionRecord[] => [
  ...AGENTS.slice(0, 2).map((a): SearchSuggestionRecord => ({
    kind: 'agent',
    id: a.id,
    label: a.name,
    sub: `${a.model} · ${a.status}`,
    href: `/agents/${a.id}`,
  })),
  ...SESSIONS.slice(0, 2).map((s): SearchSuggestionRecord => ({
    kind: 'session',
    id: s.id,
    label: s.title,
    sub: `${s.status} · ${s.model}`,
    href: `/sessions/${s.id}`,
  })),
  ...TASKS.slice(0, 1).map((t): SearchSuggestionRecord => ({
    kind: 'task',
    id: t.id,
    label: t.title,
    sub: `roadmap · ${t.priority}`,
    href: `/tasks/${t.id}`,
  })),
  ...TOOLS.slice(0, 1).map((t): SearchSuggestionRecord => ({
    kind: 'tool',
    id: t.id,
    label: t.name,
    sub: `${t.type} · ${t.status}`,
    href: `/tools/${t.id}`,
  })),
  ...DOC_SUGGESTIONS,
];

const matches = (needle: string) => (s: SearchSuggestionRecord): boolean => `${s.label} ${s.sub ?? ''}`.toLowerCase().includes(needle);

export const api = {
  workspaces: {
    list: (): Promise<Workspace[]> => resolveCopy(WORKSPACES),
    get: (id: string): Promise<Workspace> => getOrReject(WORKSPACES, id, 'workspace'),
    defaultId: (): Promise<string> => Promise.resolve(DEFAULT_WORKSPACE_ID),
  },
  users: {
    me: (): Promise<User> => resolveCopy(CURRENT_USER),
  },
  members: {
    /** Workspace roster — the Roadmap owner pool + Settings → Members. */
    list: (): Promise<TeamMember[]> => resolveCopy(MEMBERS),
  },
  sessions: {
    list: (workspaceId?: string): Promise<Session[]> => resolveCopy(byWorkspace(SESSIONS, workspaceId)),
    get: (id: string): Promise<Session> => getOrReject(SESSIONS, id, 'session'),
    /** View Session sub-page payload — timeline, files, tool-calls, runner
        metadata (deterministic, derived from the session's own fields). */
    detail: (id: string): Promise<SessionDetail> => {
      const session = findSession(id);
      return session != null
        ? resolveCopy(buildSessionDetail(session))
        : Promise.reject(new Error(`session "${id}" not found`));
    },
    /** Option sources for the New / Fork Session form (ready-for-dev tasks,
        runner agents, allowed subagents). */
    newSessionOptions: (workspaceId: string): Promise<NewSessionOptions> => resolveCopy(buildNewSessionOptions(workspaceId)),
  },
  agents: {
    list: (workspaceId?: string): Promise<Agent[]> => resolveCopy(byWorkspace(AGENTS, workspaceId)),
    get: (id: string): Promise<Agent> => getOrReject(AGENTS, id, 'agent'),
    /** Model catalog + grouped tool surface for the New/Edit/Clone editor. */
    editorOptions: (): Promise<AgentEditorOptions> => resolveCopy(buildAgentEditorOptions()),
  },
  tasks: {
    list: (workspaceId?: string): Promise<Task[]> => resolveCopy(byWorkspace(TASKS, workspaceId)),
    get: (id: string): Promise<Task> => getOrReject(TASKS, id, 'task'),
    /** Option sources for the New / Edit Task form (owners, tags, and the
        task list the Relations block draws from). */
    formOptions: (workspaceId?: string): Promise<TaskFormOptions> => resolveCopy(buildTaskFormOptions(workspaceId)),
  },
  tools: {
    list: (workspaceId?: string): Promise<Tool[]> => resolveCopy(byWorkspace(TOOLS, workspaceId)),
    get: (id: string): Promise<Tool> => getOrReject(TOOLS, id, 'tool'),
    /** System events + loadable skills behind the New/Edit/Clone editor. */
    editorOptions: (): Promise<ToolEditorOptions> => resolveCopy(buildToolEditorOptions()),
  },
  notifications: {
    list: (workspaceId?: string): Promise<NotificationRecord[]> => resolveCopy(byWorkspace(NOTIFICATIONS, workspaceId)),
  },
  usage: {
    stats: (workspaceId: string): Promise<UsageStats> => {
      const found = USAGE_STATS.find((u) => u.workspaceId === workspaceId);
      return found != null
        ? resolveCopy(found)
        : Promise.reject(new Error(`usage stats for "${workspaceId}" not found`));
    },
    /**
     * Overview dashboard payload for a workspace + time range
     * (7d/30d/90d/year). Deterministic per range — the toolbar Segmented
     * re-fetches through this method on every range change.
     */
    overview: (
      workspaceId: string,
      range: UsageRange = '30d',
    ): Promise<UsageOverview> => resolveCopy(buildOverview(workspaceId, range)),
  },
  search: {
    /** Empty/absent query returns the default suggestion set. */
    suggest: (query?: string): Promise<SearchSuggestionRecord[]> => {
      const needle = query?.trim().toLowerCase() ?? '';
      const all = buildSuggestions();
      return resolveCopy(needle === ''
        ? all
        : all.filter(matches(needle)));
    },
    /** Full-page results (⌘K → Enter fall-through). Empty query → []. */
    results: (
      query?: string,
      workspaceId?: string,
    ): Promise<SearchResultRecord[]> => resolveCopy(buildSearchResults(query, workspaceId)),
  },
};

export type OpenTomatoApi = typeof api;
