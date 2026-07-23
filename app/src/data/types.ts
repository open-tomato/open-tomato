/**
 * Typed entity contracts for the webapp's mock data layer (WS07 session 0).
 *
 * These shapes double as the draft backend API requirements — every field
 * here is something a page (per docs/plans/poc-release/reference/UI-*.md)
 * needs the backend to serve. The human-readable version of this contract
 * lives in app/docs/data-contracts.md; keep both in sync.
 *
 * Deliberately UI-free: no imports from @open-tomato/ui-components. Where a
 * spec'd table column maps to a cellTypes entry (session-cell, agent-cell,
 * tokens-progress, spend-over-time, user-inline, …) the fields below are
 * chosen so pages can project them into those cell props without extra
 * lookups.
 */

/* ---- shared scalars ------------------------------------------------------ */

/** ISO-8601 UTC timestamp ("2026-07-20T09:30:00Z"). */
export type IsoDateTime = string;

export type ThemePreference = 'light' | 'dark' | 'system';

/* ---- workspace & user ---------------------------------------------------- */

export interface Workspace {
  id: string;
  name: string;
  /** URL-safe identifier (also the settings → workspaces anchor). */
  slug: string;
  /** Member count, shown in the workspace switcher rows. */
  members: number;
  /** Identity-block accent used by the UI's WorkspaceMark. */
  tone: 'accent' | 'primary' | 'gold';
}

export type UserRole = 'owner' | 'admin' | 'member';

export interface UserPreferences {
  /** `system` hides the theme switcher (app-shell spec: Top Bar). */
  theme: ThemePreference;
  /** Drives the calendar heatmap's first row (UI-Overview spec). */
  weekStartsOn: 'monday' | 'sunday';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  preferences: UserPreferences;
}

/* ---- sessions ------------------------------------------------------------ */

export type SessionStatus = 'running' | 'waiting' | 'done' | 'failed';

export interface Session {
  id: string;
  workspaceId: string;
  /** Export filename stem (UI-Sessions spec: Export transcript). */
  slug: string;
  title: string;
  description?: string;
  status: SessionStatus;
  /** Runner agent (coordinates the session). */
  agentId: string;
  /** Per-run agent instance id (session-cell's agentInstanceId) — distinct
      per session even when the same agent runs concurrently. */
  agentInstanceId: string;
  /** Model actually used by the run — feeds model-cell / Known Entity. */
  model: string;
  /** One session per roadmap task (UI-Sessions spec: Fork). */
  taskId?: string;
  branch?: string;
  /** User who started the session — feeds the "By" user-inline column. */
  createdBy: string;
  startedAt: IsoDateTime;
  finishedAt?: IsoDateTime;
  /** Tokens consumed so far — feeds tokens-progress with `tokenQuota`. */
  tokensUsed: number;
  /** Absent means the "no limit" toggle was on. */
  tokenQuota?: number;
  costUsd: number;
  toolCalls: number;
  filesChanged: number;
  commits: number;
}

/* ---- session detail (View Session sub-page) ------------------------------ */

/** SessionTimeline event flavour — drives the node tone + text treatment
    (mirrors the ui-components SessionTimeline levels; kept as a plain union
    so this contract stays UI-free). */
export type SessionTimelineLevel =
  | 'info'
  | 'tool'
  | 'think'
  | 'ok'
  | 'err'
  | 'done';

/** One row of the session event feed (UI-Sessions spec: View Session). */
export interface SessionTimelineEvent {
  /** Wall-clock stamp, pre-formatted (`12:04:21`). */
  time: string;
  level: SessionTimelineLevel;
  /** Lucide glyph name (page maps it onto the Icon atom). */
  icon?: string;
  text: string;
  /** Greyed mono second line (`1,284 tokens`, `exit 0 · 14 passed`). */
  meta?: string;
}

/** One touched file (FilesChanged card). Field-compatible with the
    ui-components `FileChange` shape. */
export interface SessionFileChange {
  path: string;
  additions: number;
  deletions: number;
}

/** One tool-call tally for the session's single-line UsageChart. */
export interface SessionToolCall {
  name: string;
  value: number;
  tone: ChartToneName;
}

/**
 * Everything the View Session sub-page renders beyond the base `Session`:
 * the event timeline, files touched, a tool-call breakdown, a token
 * sparkline, and the resolved runner/roadmap labels. Deterministic —
 * derived from the session's own fields against a frozen clock.
 */
export interface SessionDetail {
  session: Session;
  /** Runner agent display name (resolved from `session.agentId`). */
  agentName: string;
  /** Roadmap task label (`tsk-004 · Auth middleware …`) — absent when the
      session has no linked task. */
  roadmapTaskLabel?: string;
  /** Result summary (collapsed result card). */
  summary: string;
  /** End time — the session's `finishedAt` or the frozen now for live runs. */
  finishedAt: IsoDateTime;
  /** Run duration in seconds (finished span, or now − start for live runs). */
  elapsedSeconds: number;
  /** Cumulative token draw over the run (SmallStatCard sparkline). */
  tokenSpark: number[];
  timeline: SessionTimelineEvent[];
  files: SessionFileChange[];
  toolCalls: SessionToolCall[];
  /** Commits landed (runner-metadata list). */
  commits: number;
}

/* ---- new / fork session form option sources ------------------------------ */

/** A roadmap task offered by the New Session task suggest (ready-for-dev
    only, per UI-Sessions spec). Drives quota + subagent preselection. */
export interface ReadyTaskOption {
  id: string;
  title: string;
  /** Branch-prefix hint derived from the task tags (`feat` / `fix` / `chore`). */
  type: 'feat' | 'fix' | 'chore';
  estimatedTokens: number;
  /** Suggested subagent display names. */
  suggestedAgents: string[];
}

/** Option sources for the New / Fork Session form. */
export interface NewSessionOptions {
  /** Tasks in `ready-for-dev` status (the only ones the suggest offers). */
  readyTasks: ReadyTaskOption[];
  /** Runner agent display names. */
  runnerAgents: string[];
  /** Allowed-subagent display names (same pool as runners). */
  subagents: string[];
}

/* ---- agent editor option sources ----------------------------------------- */

export type AgentModelSpeed = 'fast' | 'medium' | 'slow';

/** A model the Agent editor offers — capability groups gate the tool
    surface, the blended rate sizes the budget slider. */
export interface AgentModelDef {
  id: string;
  /** Full display name (`claude-sonnet-4-5`). */
  name: string;
  speed: AgentModelSpeed;
  /** Capability groups this model unlocks (keys into the tool groups). */
  caps: string[];
  /** Blended $/MTok — sizes the token-budget slider. */
  blendedUsdPerMTok: number;
  description: string;
  /** Human pricing line (`$3/MTok in · $15/MTok out`). */
  cost: string;
}

/** One tool the Agent editor can toggle. */
export interface AgentToolDef {
  id: string;
  label: string;
  description: string;
  /** Lucide glyph name (page maps it onto the Icon atom). */
  icon: string;
}

/** A capability group of tools (`code`, `web`, `db`, …). */
export interface AgentToolGroup {
  cap: string;
  tools: AgentToolDef[];
}

/** Option sources for the New / Edit / Clone Agent editor. */
export interface AgentEditorOptions {
  models: AgentModelDef[];
  /** All tool groups, in display order (page filters to the model's caps). */
  toolGroups: AgentToolGroup[];
}

/* ---- agents -------------------------------------------------------------- */

export type AgentStatus = 'enabled' | 'disabled';

export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  model: string;
  status: AgentStatus;
  /** Running instance count (AgentCard header badge). */
  runningCount: number;
  /** Tools this agent may call (AgentCard badges, ToolPicker). */
  toolIds: string[];
  /** Token budget per run (New Agent modal slider). */
  tokenBudgetPerRun: number;
  totalRuns: number;
  lastRunAt?: IsoDateTime;
}

/* ---- roadmap tasks ------------------------------------------------------- */

export type TaskStatus =
  | 'todo'
  | 'ready-for-dev'
  | 'in-progress'
  | 'blocked'
  | 'done';

export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  ownerId?: string;
  tags: string[];
  /** ETA — feeds the relative-time column (UI-Roadmap table config). */
  eta?: IsoDateTime;
  parentId?: string;
  subtaskIds: string[];
  /** Red relations group (UI-Roadmap spec). */
  blockedBy: string[];
  blocking: string[];
  /** Drives quota preselection in the New Session modal. */
  estimatedTokens?: number;
  suggestedAgentIds: string[];
}

/* ---- tools --------------------------------------------------------------- */

export type ToolType = 'api-client' | 'mcp-server' | 'skill-set';

export type ToolStatus = 'connected' | 'needs-attention' | 'disabled';

export interface Tool {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  type: ToolType;
  status: ToolStatus;
  /** stdio:// | http(s):// address, webhook endpoint, or skills source. */
  uri: string;
  /** System events that fire this tool (ToolCard webhook list). */
  events: string[];
  /** "x tools" (MCP) / "x skills" (skill-set); absent for API clients. */
  itemCount?: number;
  /** Total tracked uses in this workspace; 0 renders "never used". */
  uses: number;
}

/* ---- notifications ------------------------------------------------------- */

export type NotificationLevel = 'ok' | 'warn' | 'err' | 'info';

export interface NotificationRecord {
  id: string;
  workspaceId: string;
  level: NotificationLevel;
  title: string;
  body: string;
  /** Provider/source shown on the notifications page table. */
  source?: string;
  createdAt: IsoDateTime;
  unread: boolean;
  /** Workspace-relative link to the acted-on resource ("/sessions/…"). */
  href?: string;
}

/* ---- usage stats --------------------------------------------------------- */

export interface WeekSummary {
  /** Healthy while `tokensUsed <= tokenLimit` (sidebar widget pill). */
  status: 'healthy' | 'unhealthy';
  tokensUsed: number;
  tokenLimit: number;
}

export interface UsageStats {
  workspaceId: string;
  /** Sessions currently running ("Live now" stat card). */
  activeSessions: number;
  /** Non-active sessions executed today ("Today" stat card). */
  runsToday: number;
  tokensToday: number;
  costTodayUsd: number;
  week: WeekSummary;
}

/* ---- overview usage series ----------------------------------------------- */

/**
 * Chart accent token name — a data-level mirror of the ui-components chart
 * palette (`ChartTone`). Kept as a plain string union so this contract
 * stays UI-free (same pattern as `Workspace.tone`); pages map it onto the
 * library's `ChartTone` prop directly.
 */
export type ChartToneName =
  | 'accent'
  | 'primary'
  | 'gold'
  | 'info'
  | 'success'
  | 'danger'
  | 'neutral'
  | 'muted';

/** Time window for the Overview usage series (toolbar Segmented). */
export type UsageRange = '7d' | '30d' | '90d' | 'year';

/**
 * One bucket of the usage time-series — a day for the 7/30/90d ranges, a
 * calendar month for `year`.
 */
export interface UsageSeriesPoint {
  /** Bucket start (UTC midnight of the day, or the 1st for months). */
  date: IsoDateTime;
  /** Sparse axis label ("Jul 23" for days, "Jul" for months). */
  label: string;
  /** Tokens per model id — keys match `UsageModelSeries.model`. */
  tokensByModel: Record<string, number>;
  totalTokens: number;
  sessions: number;
  costUsd: number;
}

/** Model metadata for the tokens-by-model line chart legend + tones. */
export interface UsageModelSeries {
  /** Model id — a key into `UsageSeriesPoint.tokensByModel`. */
  model: string;
  /** Short display label ("sonnet"). */
  label: string;
  tone: ChartToneName;
}

/** A tool-call tally over the selected range (tool-calls chart). */
export interface ToolCallStat {
  name: string;
  calls: number;
  tone: ChartToneName;
}

/** Spend + activity for one agent over the range (spend-by-agent chart). */
export interface AgentUsageStat {
  agentId: string;
  name: string;
  sessions: number;
  tokens: number;
  costUsd: number;
  tone: ChartToneName;
}

/**
 * One heatmap cell (when-agents-run grid). `day` is a local calendar day
 * (`YYYY-MM-DD`) — the CalendarHeatmap parses date-only strings as local
 * calendar dates, so no timezone drift. Always the current week,
 * range-independent (matches the "this week" grid in the spec).
 */
export interface ActivityCell {
  day: string;
  hour: number;
  value: number;
}

/** A top-spending session row (top-5 sessions card). */
export interface TopSessionStat {
  sessionId: string;
  title: string;
  agentInstanceId: string;
  model: string;
  modelTone: ChartToneName;
  status: SessionStatus;
  tokens: number;
  costUsd: number;
}

/**
 * Monthly token budget with month-to-date usage and an end-of-month
 * forecast projected from the selected range's run rate.
 */
export interface BudgetSummary {
  /** Monthly token cap. */
  cap: number;
  /** Tokens used in the selected range. */
  usedTokens: number;
  /** Spend (USD) in the selected range. */
  spentUsd: number;
  /** Projected end-of-month tokens from the range run rate. */
  forecastTokens: number;
  /** Meter end labels ("Jul 1" / "Jul 31"). */
  periodStartLabel: string;
  periodEndLabel: string;
}

/** Everything the Overview page renders for one workspace + range. */
export interface UsageOverview {
  workspaceId: string;
  range: UsageRange;
  series: UsageSeriesPoint[];
  models: UsageModelSeries[];
  toolCalls: ToolCallStat[];
  agents: AgentUsageStat[];
  activity: ActivityCell[];
  /** Frozen ISO end-of-week anchor for the heatmap grid (deterministic —
      never falls back to the wall clock, even for zero-activity workspaces). */
  activityEnd: string;
  topSessions: TopSessionStat[];
  budget: BudgetSummary;
  totals: {
    tokens: number;
    sessions: number;
    costUsd: number;
  };
}

/* ---- search -------------------------------------------------------------- */

/** Mirrors the ui-components SearchSuggestionKind union. */
export type SearchSuggestionKind =
  | 'agent'
  | 'session'
  | 'task'
  | 'tool'
  | 'doc';

export interface SearchSuggestionRecord {
  kind: SearchSuggestionKind;
  /** Id of the underlying entity (or doc slug). */
  id: string;
  label: string;
  /** Mono context line ("running · agent-7d2f"). */
  sub?: string;
  /**
   * Workspace-relative destination ("/sessions/ses-001") — the app
   * prefixes the active workspace base. `doc` suggestions carry an
   * absolute https:// URL instead.
   */
  href: string;
}
