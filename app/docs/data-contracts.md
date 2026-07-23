# Webapp data contracts — draft backend API requirements

**Status:** WS07 session 2 (Sessions + Agents). Source of truth for the shapes is
[`app/src/data/types.ts`](../src/data/types.ts); the provider surface is
[`app/src/data/api.ts`](../src/data/api.ts). This document is the handoff
artifact for backend planning: every entity and method here is consumed by
the webapp against mock fixtures today and must eventually be served by a
real API with the same semantics. Field shapes derive from the WS04/WS07
page specs (`docs/plans/poc-release/reference/UI-*.md`).

Conventions:

- Timestamps are ISO-8601 UTC strings (`IsoDateTime`).
- Ids are opaque strings; fixture ids use readable prefixes (`ses-`, `agt-`,
  `tsk-`, `tol-`, `ntf-`, `usr-`, `ws-`) purely for debuggability.
- All list endpoints accept an optional workspace scope; entity payloads
  carry their `workspaceId` explicitly.
- Mock providers return deep copies — consumers never share references with
  the store. Real implementations get this for free over the wire.

## Entities

### Workspace

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | Switcher rows + identity block |
| `slug` | string | URL-safe identifier |
| `members` | number | Member count under the name in the switcher |
| `tone` | `'accent' \| 'primary' \| 'gold'` | WorkspaceMark accent |

Ordering: most-recent-first — the switcher lists only the first 5
(app-shell spec) and links to settings → workspaces for the rest. Users
with a single workspace never see the switcher and stay on the `/` base.

### User

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | ProfileMenu header |
| `email` | string | ProfileMenu header |
| `role` | `'owner' \| 'admin' \| 'member'` | Role badge |
| `preferences.theme` | `'light' \| 'dark' \| 'system'` | `system` hides the ThemeSwitcher |
| `preferences.weekStartsOn` | `'monday' \| 'sunday'` | Calendar-heatmap first row (UI-Overview) |

### Session

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `workspaceId` | string | |
| `slug` | string | Export transcript filename stem |
| `title` | string | Short unique name (session-cell) |
| `description` | string? | |
| `status` | `'running' \| 'waiting' \| 'done' \| 'failed'` | Quick-filter pills + status column |
| `agentId` | string | Runner agent (agent-cell) |
| `agentInstanceId` | string | Per-run agent instance (session-cell's `agentInstanceId`) — distinct per session even for the same agent |
| `model` | string | Model actually used (Known Entity) |
| `taskId` | string? | One session per roadmap task; cleared on fork |
| `branch` | string? | Cleared on fork |
| `createdBy` | string | "By" user-inline column |
| `startedAt` | IsoDateTime | Runner metadata sidebar |
| `finishedAt` | IsoDateTime? | Absent while running/waiting |
| `tokensUsed` | number | tokens-progress numerator |
| `tokenQuota` | number? | Absent = "no limit" toggle was on |
| `costUsd` | number | spend-over-time / Top-5 rows |
| `toolCalls` | number | Result card + single-line UsageChart |
| `filesChanged` | number | Result card / FilesChanged |
| `commits` | number | Runner metadata sidebar |

### Agent

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `workspaceId` | string | |
| `name` | string | agent-title known entity |
| `description` | string | Card content row |
| `model` | string | model-footer |
| `status` | `'enabled' \| 'disabled'` | Card toggle; disabled cards dim |
| `runningCount` | number | Header badge (running instances / off) |
| `toolIds` | string[] | Card tool badges; ToolPicker selection |
| `tokenBudgetPerRun` | number | New/Edit Agent budget slider |
| `totalRuns` | number | History icon count |
| `lastRunAt` | IsoDateTime? | Clock icon relative time |

### SessionDetail (View Session sub-page)

Everything the timeline-first View Session page renders beyond the base
`Session`. In the mock layer it is **derived deterministically** from the
session's own fields against a frozen clock (`POC_NOW`) — a real backend
would serve the actual run log, files, and tool-call tallies instead.

| Field | Type | Notes |
|---|---|---|
| `session` | `Session` | The base session |
| `agentName` | string | Runner display name (resolved from `agentId`) |
| `roadmapTaskLabel` | string? | `{taskId} · {title}` — header link; absent when unlinked |
| `summary` | string | Collapsed result card body |
| `finishedAt` | IsoDateTime | `session.finishedAt`, or the frozen now for live runs |
| `elapsedSeconds` | number | Run duration (finished span, or now − start) |
| `tokenSpark` | number[] | Cumulative token draw (SmallStatCard sparkline) |
| `timeline` | `SessionTimelineEvent[]` | Event feed (see below) |
| `files` | `SessionFileChange[]` | `{path, additions, deletions}` — FilesChanged |
| `toolCalls` | `SessionToolCall[]` | `{name, value, tone}` — single-line UsageChart |
| `commits` | number | Runner-metadata list |

`SessionTimelineEvent`: `{ time: 'HH:MM:SS', level: 'info'|'tool'|'think'|'ok'|'err'|'done', icon?: string (lucide glyph), text: string, meta?: string }`.

### NewSessionOptions (New / Fork Session form)

Option sources for the session composer, scoped to a workspace.

| Field | Type | Notes |
|---|---|---|
| `readyTasks` | `ReadyTaskOption[]` | Tasks in `ready-for-dev` **only** (the suggest offers that status). Each: `{id, title, type: 'feat'\|'fix'\|'chore', estimatedTokens, suggestedAgents: string[]}` — effort drives quota + subagent preselection |
| `runnerAgents` | string[] | Runner-agent display names |
| `subagents` | string[] | Allowed-subagent names (same pool) |

### AgentEditorOptions (New / Edit / Clone Agent form)

Config-level catalog (workspace-independent) behind the agent editor.

| Field | Type | Notes |
|---|---|---|
| `models` | `AgentModelDef[]` | `{id, name, speed, caps: string[], blendedUsdPerMTok, description, cost}` — caps gate the tool surface; blended rate sizes the budget slider |
| `toolGroups` | `AgentToolGroup[]` | `{cap, tools: {id, label, description, icon}[]}` — the page shows the groups the selected model's caps unlock |

> Note: the editor's capability tools (`fs`, `shell`, `git`, …) are a
> distinct surface from `Agent.toolIds` (workspace Tool entities shown as
> card badges). The PoC keeps them separate; a real backend would unify the
> two so an agent's editable tool selection matches what its card renders.

### Task (Roadmap)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Id column |
| `workspaceId` | string | |
| `title` | string | task-cell |
| `description` | string? | |
| `status` | `'todo' \| 'ready-for-dev' \| 'in-progress' \| 'blocked' \| 'done'` | Status badge; New Session suggests only `ready-for-dev` |
| `priority` | `'high' \| 'medium' \| 'low'` | Priority badge |
| `ownerId` | string? | Owner user-inline |
| `tags` | string[] | ChipList (`allowNew`) |
| `eta` | IsoDateTime? | relative-time column |
| `parentId` | string? | Parent-task single ChipList |
| `subtaskIds` | string[] | Subtasks multi ChipList |
| `blockedBy` | string[] | Red relations group |
| `blocking` | string[] | Red relations group + Blocking badge |
| `estimatedTokens` | number? | Drives New Session quota preselection |
| `suggestedAgentIds` | string[] | Estimated-effort agent hints |

### Tool

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `workspaceId` | string | |
| `name` | string | tool-title known entity |
| `description` | string | 1–3 line card paragraph |
| `type` | `'api-client' \| 'mcp-server' \| 'skill-set'` | Filter badges + ToolTypeSelector |
| `status` | `'connected' \| 'needs-attention' \| 'disabled'` | Header badge; Test Connection pulses `connecting` transiently (UI state, not stored) |
| `uri` | string | Summary top line (`stdio://` \| `http(s)://` \| webhook URL \| skills source) |
| `events` | string[] | Webhooks that fire this tool |
| `itemCount` | number? | "x tools" (MCP) / "x skills" (skill-set) |
| `uses` | number | Footer counter; 0 renders "never used" |

Not yet modeled (needed for New/Edit Tool, session 3): credentials blob /
auth scheme (stored encrypted, write-only), auto-start flag, per-skill
enable map from "load skills".

### Notification (`NotificationRecord`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `workspaceId` | string | |
| `level` | `'ok' \| 'warn' \| 'err' \| 'info'` | Popover grouping order + type badge |
| `title` | string | Double-line title |
| `body` | string | Double-line description |
| `source` | string? | Falls back as title provider when absent |
| `createdAt` | IsoDateTime | Date column / time chip |
| `unread` | boolean | Red bell dot when any true; mark-all-read flips all |
| `href` | string? | Workspace-relative link to the resource |

### UsageStats / WeekSummary

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | string | |
| `activeSessions` | number | "Live now" stat card |
| `runsToday` | number | "Today" stat card |
| `tokensToday` | number | "Tokens today" stat card |
| `costTodayUsd` | number | "Cost today" stat card |
| `week.status` | `'healthy' \| 'unhealthy'` | Sidebar week-summary pill |
| `week.tokensUsed` | number | Progress numerator |
| `week.tokenLimit` | number | Progress denominator |

### UsageOverview (Overview dashboard)

Time-series + aggregates for the Overview page, scoped to a workspace and a
`range` (`'7d' | '30d' | '90d' | 'year'`). Deterministic per range: the
7/30/90d ranges are daily buckets, `year` is 12 calendar-month buckets.
Served by `api.usage.overview(workspaceId, range)`.

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | string | |
| `range` | `'7d' \| '30d' \| '90d' \| 'year'` | Echoes the requested range |
| `series` | `UsageSeriesPoint[]` | One bucket per day (or month for `year`) |
| `models` | `UsageModelSeries[]` | Line-chart legend + tones (`model`, `label`, `tone`) |
| `toolCalls` | `ToolCallStat[]` | `name`, `calls`, `tone` — tool-calls chart |
| `agents` | `AgentUsageStat[]` | `agentId`, `name`, `sessions`, `tokens`, `costUsd`, `tone` — spend-by-agent |
| `activity` | `ActivityCell[]` | `day` (`YYYY-MM-DD` local), `hour` (0–23), `value` — when-agents-run heatmap; always the current week, range-independent |
| `activityEnd` | IsoDateTime | Frozen end-of-week anchor for the heatmap grid (deterministic — the client never falls back to the wall clock) |
| `topSessions` | `TopSessionStat[]` | Top-5 sessions by spend (all-time); `sessionId`/`title`/`agentInstanceId`/`model`/`modelTone`/`status`/`tokens`/`costUsd` |
| `budget` | `BudgetSummary` | `cap`, `usedTokens`, `spentUsd`, `forecastTokens`, `periodStartLabel`, `periodEndLabel` — **monthly** figures, range-independent |
| `totals` | `{ tokens; sessions; costUsd }` | Range-window totals (hero stat cards) |

`UsageSeriesPoint`: `date` (IsoDateTime bucket start), `label` (sparse axis
label), `tokensByModel` (`Record<modelId, number>`), `totalTokens`,
`sessions`, `costUsd`. `ChartToneName` is a data-level mirror of the UI
chart palette (`'accent' | 'primary' | 'gold' | 'info' | 'success' |
'danger' | 'neutral' | 'muted'`) so this contract stays UI-free.

Backend requirement: aggregate real usage into the same shapes; `range` must
change the series granularity and every derived total. **`budget` is a monthly
concept, decoupled from `range`** — `cap`/`usedTokens` are the workspace's
monthly budget and month-to-date usage (the PoC mock projects the weekly
sidebar figures to a month, so `usedTokens/cap` mirrors the week pill's
healthy/unhealthy ratio per workspace); `forecastTokens` is a month-end
projection from the month-to-date pace. `activity` grids the current week in
the workspace's configured week-start (`monday` for the PoC).

PoC mock limitation (tracked, not a contract requirement): the mock scales the
global usage series by a per-workspace factor derived from each workspace's
weekly usage, so figures differ per workspace; a real backend returns
genuinely per-workspace aggregates and need not replicate that scaling.

### SearchSuggestionRecord

| Field | Type | Notes |
|---|---|---|
| `kind` | `'agent' \| 'session' \| 'task' \| 'tool' \| 'doc'` | The five suggest kinds, each with its own accent |
| `id` | string | Underlying entity id / doc slug |
| `label` | string | Row label |
| `sub` | string? | Mono context line |
| `href` | string | Workspace-relative path; `doc` rows carry absolute URLs (new tab) |

## Provider surface (`api`)

Error semantics beyond unknown-id rejection are **deferred past session 0**: the shell currently logs load failures in dev and stays on its empty defaults — real transports must add user-visible error states before shipping.

Every method returns a Promise; `get` rejects with an Error for unknown
ids. `workspaceId` filters are optional — omitting them returns all rows
the caller may see.

| Method | Returns | Backend requirement |
|---|---|---|
| `api.workspaces.list()` | `Workspace[]` | Most-recent-first ordering |
| `api.workspaces.get(id)` | `Workspace` | 404 → rejection |
| `api.workspaces.defaultId()` | `string` | The single-workspace `/` base target |
| `api.users.me()` | `User` | Authenticated user + preferences |
| `api.sessions.list(workspaceId?)` | `Session[]` | Filterable by status/user/agent later |
| `api.sessions.get(id)` | `Session` | |
| `api.sessions.detail(id)` | `SessionDetail` | View Session page; timeline/files/tool-calls/runner metadata (backend serves the real run log) |
| `api.sessions.newSessionOptions(workspaceId)` | `NewSessionOptions` | New/Fork form: ready-for-dev tasks + agent pools |
| `api.agents.list(workspaceId?)` | `Agent[]` | |
| `api.agents.get(id)` | `Agent` | |
| `api.agents.editorOptions()` | `AgentEditorOptions` | New/Edit/Clone form: model catalog + grouped tool surface (workspace-independent) |
| `api.tasks.list(workspaceId?)` | `Task[]` | New Session needs `status = ready-for-dev` subset |
| `api.tasks.get(id)` | `Task` | |
| `api.tools.list(workspaceId?)` | `Tool[]` | |
| `api.tools.get(id)` | `Tool` | |
| `api.notifications.list(workspaceId?)` | `NotificationRecord[]` | Newest-first; needs mark-all-read mutation endpoint later |
| `api.usage.stats(workspaceId)` | `UsageStats` | Cheap summary for shell + stat cards |
| `api.usage.overview(workspaceId, range?)` | `UsageOverview` | Overview dashboard; `range` defaults to `'30d'`, must alter series granularity + every total |
| `api.search.suggest(query?)` | `SearchSuggestionRecord[]` | Substring match across all five kinds; empty query = default set |

Known gaps deliberately deferred (mutations arrive with their pages): the
Sessions + Agents read surfaces landed in session 2 (`sessions.detail`,
`sessions.newSessionOptions`, `agents.editorOptions`), but their **write**
side stays mocked — create/fork/archive session, create/edit/clone/toggle
agent all resolve client-side only. Still outstanding for sessions 3+: task
CRUD + status/priority updates, tool CRUD + test connection, notification
mark-read, export endpoints (JSONL transcript, usage report), and the full
`/search` results query. The status/tone maps and quota-slider constants
(Opus reference rate, $10 session cap / $15 agent cap) are PoC UI constants,
not backend contract — the real version reads workspace settings.
