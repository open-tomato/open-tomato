/**
 * Sessions detail + form-option fixtures (WS07 session 2).
 *
 * Derives the View Session sub-page payload and the New/Fork Session form
 * option sources from the base `Session` / `Task` / `Agent` fixtures — no
 * forked entity shapes. Fully deterministic: every timestamp is computed
 * from the session's own fields against the frozen `POC_NOW`, so stories,
 * tests and visual baselines never touch the wall clock.
 */

import type {
  Agent,
  ChartToneName,
  NewSessionOptions,
  ReadyTaskOption,
  Session,
  SessionDetail,
  SessionFileChange,
  SessionTimelineEvent,
  SessionToolCall,
} from './types';

import { AGENTS, POC_NOW, SESSIONS, TASKS } from './fixtures';

/** Agent id → chart accent (agent-cell glyph tile). Mirrors the Overview's
    per-agent tones so the same agent reads the same colour everywhere. */
export const AGENT_TONE: Record<string, ChartToneName> = {
  'agt-planner': 'primary',
  'agt-frontend': 'accent',
  'agt-debugger': 'gold',
  'agt-docs': 'info',
};

export const agentTone = (agentId: string): ChartToneName => AGENT_TONE[agentId] ?? 'neutral';

/** Compact number string (mirrors ui-components `formatNumber({short})`). */
const short = (value: number): string => new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(value);

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Runtime span in seconds: finished span, or now − start for live runs. */
export const sessionElapsedSeconds = (session: Session): number => {
  const start = new Date(session.startedAt).getTime();
  const end = session.finishedAt != null
    ? new Date(session.finishedAt).getTime()
    : POC_NOW.getTime();
  return Math.max(0, Math.round((end - start) / 1000));
};

const agentNameOf = (agentId: string): string => AGENTS.find((a: Agent) => a.id === agentId)?.name ?? agentId;

const taskLabelOf = (taskId?: string): string | undefined => {
  if (taskId == null) return undefined;
  const task = TASKS.find((t) => t.id === taskId);
  return task != null
    ? `${task.id} · ${task.title}`
    : undefined;
};

/** Branch stem for synthetic file paths (`feat/auth-refactor` → `auth-refactor`). */
const branchStem = (session: Session): string => (session.branch ?? session.slug).split('/').pop() ?? session.slug;

/** Wall-clock `HH:MM:SS` at `start + offsetSeconds`. */
const clockAt = (startMs: number, offsetSeconds: number): string => {
  const t = new Date(startMs + offsetSeconds * 1000);
  return `${pad2(t.getUTCHours())}:${pad2(t.getUTCMinutes())}:${pad2(t.getUTCSeconds())}`;
};

/**
 * Deterministic event log for a session — derived only from its own fields
 * (start, elapsed, model, quota, status, files, tokens) so the header and
 * the timeline always agree, whichever session is on view.
 */
/** Cap the synthetic event cadence so a long-running session's log stays a
    tight, in-order sequence (the metadata `elapsed` remains the true span). */
const MAX_TIMELINE_SPAN_S = 25 * 60;

const buildTimeline = (session: Session, elapsed: number): SessionTimelineEvent[] => {
  const startMs = new Date(session.startedAt).getTime();
  const span = Math.min(elapsed, MAX_TIMELINE_SPAN_S);
  const at = (fraction: number): string => clockAt(startMs, Math.round(span * fraction));
  const stem = branchStem(session);
  const budget = session.tokenQuota != null
    ? short(session.tokenQuota)
    : 'no limit';
  const readTokens = Math.max(120, Math.round(session.tokensUsed * 0.03));
  const totals = `${short(session.tokensUsed)} tokens · $${session.costUsd.toFixed(2)}`;

  const events: SessionTimelineEvent[] = [
    { time: at(0), level: 'info', icon: 'play', text: 'Session started', meta: `model=${session.model} · budget=${budget}` },
  ];

  if (session.tokensUsed > 0) {
    events.push(
      { time: at(0.06), level: 'tool', icon: 'folder', text: `fs.read src/${stem}/index.ts`, meta: `${readTokens.toLocaleString('en-US')} tokens` },
      { time: at(0.1), level: 'tool', icon: 'folder', text: `fs.read src/${stem}/${stem}.ts`, meta: `${Math.round(readTokens * 0.7).toLocaleString('en-US')} tokens` },
      { time: at(0.22), level: 'think', icon: 'sparkles', text: `Scoped ${session.title} to ${session.branch ?? 'the working tree'}; working the plan one meaningful step at a time.` },
    );
  }

  if (session.filesChanged > 0) {
    events.push(
      { time: at(0.4), level: 'tool', icon: 'pencil', text: `fs.edit src/${stem}/${stem}.ts`, meta: `+${session.filesChanged * 9 + 6} / −${session.filesChanged * 2 + 1}` },
      { time: at(0.62), level: 'tool', icon: 'terminal', text: 'shell.exec npm test', meta: session.status === 'failed'
        ? 'exit 1 · 2 failed'
        : 'exit 0 · all passed' },
    );
    if (session.status !== 'failed') {
      events.push({ time: at(0.7), level: 'ok', icon: 'check', text: 'test suite green' });
    }
  }

  if (session.commits > 0) {
    events.push({ time: at(0.86), level: 'tool', icon: 'git-branch', text: `git.commit "${session.title}"`, meta: `${session.commits} commit${session.commits === 1
      ? ''
      : 's'}` });
  }

  if (session.status === 'done') {
    events.push({ time: at(1), level: 'done', icon: 'flag', text: 'Session ended ok', meta: `${totals}` });
  } else if (session.status === 'failed') {
    events.push({ time: at(1), level: 'err', icon: 'x', text: 'Session ended failed', meta: `${totals}` });
  } else if (session.status === 'waiting') {
    events.push({ time: at(1), level: 'info', icon: 'clock', text: 'Waiting — workspace token limit reached' });
  }
  // running: newest tool event sits last, no terminal event.
  return events;
};

/** Synthetic touched-file list, `session.filesChanged` entries deep. */
const buildFiles = (session: Session): SessionFileChange[] => {
  const stem = branchStem(session);
  const names = ['index.ts', `${stem}.ts`, 'session.ts', 'middleware.ts', 'refresh.ts', 'types.ts', '__tests__/session.test.ts', 'utils.ts', 'config.ts', 'handlers.ts'];
  return Array.from({ length: session.filesChanged }, (_, i) => ({
    path: `src/${stem}/${names[i % names.length]}`,
    additions: ((i * 37 + 11) % 120) + 4,
    deletions: (i * 13 + 2) % 24,
  }));
};

/** Split `session.toolCalls` across a fixed tool mix (single-line UsageChart). */
const TOOL_MIX: { name: string; share: number; tone: ChartToneName }[] = [
  { name: 'fs.read', share: 0.34, tone: 'accent' },
  { name: 'fs.edit', share: 0.24, tone: 'primary' },
  { name: 'shell', share: 0.18, tone: 'gold' },
  { name: 'git', share: 0.14, tone: 'info' },
  { name: 'tests', share: 0.1, tone: 'success' },
];

const buildToolCalls = (session: Session): SessionToolCall[] => TOOL_MIX
  .map((t) => ({ name: t.name, value: Math.round(session.toolCalls * t.share), tone: t.tone }))
  .filter((t) => t.value > 0);

/** Cumulative token draw (14-point ramp to `session.tokensUsed`). */
const buildTokenSpark = (session: Session): number[] => {
  const points = 14;
  return Array.from({ length: points }, (_, i) => {
    const p = (i + 1) / points;
    // ease-out so the curve front-loads like a real run.
    return Math.round(session.tokensUsed * (1 - (1 - p) ** 1.7));
  });
};

const summaryOf = (session: Session): string => {
  const files = `${session.filesChanged} file${session.filesChanged === 1
    ? ''
    : 's'}`;
  if (session.status === 'done') {
    return `Completed ${session.title}: touched ${files} across ${session.commits} commit${session.commits === 1
      ? ''
      : 's'} on ${session.branch ?? 'the working branch'}, keeping the suite green between logical steps. Spent ${short(session.tokensUsed)} tokens ($${session.costUsd.toFixed(2)}).`;
  }
  if (session.status === 'failed') {
    return `Run failed on ${session.title} after ${files} and ${session.toolCalls} tool calls — the test step exited non-zero. ${short(session.tokensUsed)} tokens ($${session.costUsd.toFixed(2)}) spent before the abort; no commits landed.`;
  }
  if (session.status === 'waiting') {
    return `Paused on ${session.title} — the workspace token budget is exhausted. The run resumes automatically when capacity frees up.`;
  }
  return `Live: ${session.title} is running on ${session.branch ?? 'the working branch'} — ${files} touched so far across ${session.toolCalls} tool calls.`;
};

/** Assemble the full View Session payload for a base session. */
export const buildSessionDetail = (session: Session): SessionDetail => {
  const elapsed = sessionElapsedSeconds(session);
  return {
    session,
    agentName: agentNameOf(session.agentId),
    roadmapTaskLabel: taskLabelOf(session.taskId),
    summary: summaryOf(session),
    finishedAt: session.finishedAt ?? POC_NOW.toISOString(),
    elapsedSeconds: elapsed,
    tokenSpark: buildTokenSpark(session),
    timeline: buildTimeline(session, elapsed),
    files: buildFiles(session),
    toolCalls: buildToolCalls(session),
    commits: session.commits,
  };
};

/* ---- new / fork session form options ------------------------------------- */

/** Tag → branch-prefix hint (feat / fix / chore). */
const taskType = (tags: string[]): ReadyTaskOption['type'] => {
  if (tags.some((t) => /bug|fix|flak/i.test(t))) return 'fix';
  if (tags.some((t) => /chore|infra|clean/i.test(t))) return 'chore';
  return 'feat';
};

/** New/Fork Session option sources, scoped to a workspace. Ready tasks come
    from `ready-for-dev` status only (UI-Sessions spec: the suggest offers
    that status); agent pools come from the workspace's agents. */
export const buildNewSessionOptions = (workspaceId: string): NewSessionOptions => {
  const agents = AGENTS.filter((a) => a.workspaceId === workspaceId);
  const agentName = (id: string): string => agents.find((a) => a.id === id)?.name ?? id;
  const readyTasks: ReadyTaskOption[] = TASKS
    .filter((t) => t.workspaceId === workspaceId && t.status === 'ready-for-dev')
    .map((t) => ({
      id: t.id,
      title: t.title,
      type: taskType(t.tags),
      estimatedTokens: t.estimatedTokens ?? 100_000,
      suggestedAgents: t.suggestedAgentIds.map(agentName),
    }));
  const names = agents.map((a) => a.name);
  return { readyTasks, runnerAgents: names, subagents: names };
};

/** Look up a base session by id (used by the routed sub-pages/modals). */
export const findSession = (id: string): Session | undefined => SESSIONS.find((s) => s.id === id);

/**
 * Sanitized, low-verbosity JSONL for the Export transcript sub-page (spec:
 * "mostly metadata and summary"), built from the session detail so header
 * and body always agree. One head record + one record per timeline event.
 */
export const exportJsonl = (detail: SessionDetail): string => {
  const { session } = detail;
  const head = JSON.stringify({
    kind: 'session',
    id: session.id,
    slug: session.slug,
    title: session.title,
    status: session.status,
    agent: detail.agentName,
    model: session.model,
    tokens: session.tokensUsed,
    cost_usd: session.costUsd,
  });
  const events = detail.timeline.map((event) => JSON.stringify({
    kind: 'event',
    t: event.time,
    level: event.level,
    summary: event.text,
  }));
  return [head, ...events].join('\n');
};
