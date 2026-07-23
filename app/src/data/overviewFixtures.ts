/**
 * Overview usage fixtures (WS07 session 1) — deterministic time-series
 * backing `api.usage.overview`. Spec: docs/plans/poc-release/reference/
 * UI-Overview.md; composition reference: the WS04 OverviewPage.
 *
 * Rules (same as the rest of the mock layer): fixed ids, a frozen clock,
 * NO `Date.now()` / ambient locale. Every figure derives from a pinned
 * base year of daily data so switching range is a pure re-slice.
 */

import type {
  ActivityCell,
  AgentUsageStat,
  BudgetSummary,
  ChartToneName,
  ToolCallStat,
  TopSessionStat,
  UsageModelSeries,
  UsageOverview,
  UsageRange,
  UsageSeriesPoint,
} from './types';

import { AGENTS, DEFAULT_WORKSPACE_ID, SESSIONS, USAGE_STATS } from './fixtures';

/** Frozen reference "today" — the last bucket of every series. */
const POC_TODAY = { year: 2026, month: 6, day: 23 } as const; // 2026-07-23

/** Model series shown in the tokens-by-model line chart (stack order). */
const MODEL_SERIES: UsageModelSeries[] = [
  { model: 'sonnet-4-5', label: 'sonnet', tone: 'accent' },
  { model: 'opus-4-1', label: 'opus', tone: 'primary' },
  { model: 'haiku-4-5', label: 'haiku', tone: 'gold' },
];

/** Model id → chart tone (Top-5 model cells). */
const MODEL_TONE: Record<string, ChartToneName> = {
  'sonnet-4-5': 'accent',
  'opus-4-1': 'primary',
  'haiku-4-5': 'gold',
};

const MODEL_SPLIT: Record<string, number> = {
  'sonnet-4-5': 0.62,
  'opus-4-1': 0.22,
  'haiku-4-5': 0.16,
};

/** USD per 1M tokens — blended PoC reference rate. */
const USD_PER_MTOK = 12.5;

const DAY_MS = 24 * 60 * 60 * 1000;

const pad2 = (n: number): string => String(n).padStart(2, '0');

const localDay = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const dayLabel = (d: Date): string => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;

/** One day of the base series — deterministic from its day index. */
interface DailyBucket {
  date: Date;
  tokensByModel: Record<string, number>;
  totalTokens: number;
  sessions: number;
  costUsd: number;
}

/**
 * 365 days of daily usage ending on POC_TODAY (UTC). Weekend damping +
 * a slow ramp + index noise reproduce a believable but fixed shape.
 */
const DAILY_BASE: DailyBucket[] = (() => {
  const end = Date.UTC(POC_TODAY.year, POC_TODAY.month, POC_TODAY.day);
  const total = 365;
  const out: DailyBucket[] = [];
  for (let i = total - 1; i >= 0; i--) {
    const date = new Date(end - i * DAY_MS);
    const weekday = date.getUTCDay();
    const weekendDamp = weekday === 0 || weekday === 6
      ? 0.35
      : 1;
    const ramp = 0.6 + 0.4 * (1 - i / total);
    const noise = 0.85 + ((i * 137) % 30) / 100;
    const base = 42_000 * weekendDamp * ramp * noise;
    const tokensByModel: Record<string, number> = {};
    let totalTokens = 0;
    for (const m of MODEL_SERIES) {
      const value = Math.round(base * (MODEL_SPLIT[m.model] ?? 0));
      tokensByModel[m.model] = value;
      totalTokens += value;
    }
    out.push({
      date,
      tokensByModel,
      totalTokens,
      sessions: Math.max(0, Math.round(totalTokens / 15_000 + ((i * 7) % 3) - 1)),
      costUsd: (totalTokens / 1_000_000) * USD_PER_MTOK,
    });
  }
  return out;
})();

const emptyModelMap = (): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const m of MODEL_SERIES) map[m.model] = 0;
  return map;
};

const dailyToPoint = (b: DailyBucket): UsageSeriesPoint => ({
  date: b.date.toISOString(),
  label: dayLabel(b.date),
  tokensByModel: { ...b.tokensByModel },
  totalTokens: b.totalTokens,
  sessions: b.sessions,
  costUsd: Math.round(b.costUsd * 100) / 100,
});

/** Aggregate the base year into 12 calendar-month buckets. */
const monthlySeries = (): UsageSeriesPoint[] => {
  const buckets = new Map<string, UsageSeriesPoint>();
  const order: string[] = [];
  for (const b of DAILY_BASE) {
    const key = `${b.date.getUTCFullYear()}-${pad2(b.date.getUTCMonth() + 1)}`;
    let point = buckets.get(key);
    if (point == null) {
      const first = new Date(Date.UTC(b.date.getUTCFullYear(), b.date.getUTCMonth(), 1));
      point = {
        date: first.toISOString(),
        label: MONTHS[first.getUTCMonth()]!,
        tokensByModel: emptyModelMap(),
        totalTokens: 0,
        sessions: 0,
        costUsd: 0,
      };
      buckets.set(key, point);
      order.push(key);
    }
    for (const m of MODEL_SERIES) {
      point.tokensByModel[m.model]! += b.tokensByModel[m.model] ?? 0;
    }
    point.totalTokens += b.totalTokens;
    point.sessions += b.sessions;
    point.costUsd += b.costUsd;
  }
  return order.map((key) => {
    const p = buckets.get(key)!;
    return { ...p, costUsd: Math.round(p.costUsd * 100) / 100 };
  });
};

const RANGE_DAYS: Record<UsageRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  year: 365,
};

const seriesForRange = (range: UsageRange): UsageSeriesPoint[] => (range === 'year'
  // 365 days span 13 calendar months; keep the last 12 whole ones.
  ? monthlySeries().slice(-12)
  : DAILY_BASE.slice(-RANGE_DAYS[range]).map(dailyToPoint));

/** Per-day tool-call rates; scaled by the range's day count. */
const TOOL_RATES: { name: string; perDay: number; tone: ChartToneName }[] = [
  { name: 'fs.read', perDay: 61, tone: 'accent' },
  { name: 'fs.edit', perDay: 37, tone: 'primary' },
  { name: 'shell', perDay: 23, tone: 'gold' },
  { name: 'git', perDay: 14, tone: 'info' },
  { name: 'tests', perDay: 9, tone: 'success' },
  { name: 'github', perDay: 7, tone: 'neutral' },
  { name: 'search', perDay: 6, tone: 'danger' },
];

const toolCallsForRange = (range: UsageRange): ToolCallStat[] => {
  const days = RANGE_DAYS[range];
  return TOOL_RATES.map((t) => ({
    name: t.name,
    calls: Math.round(t.perDay * days),
    tone: t.tone,
  }));
};

/** Per-agent per-day rates keyed by the agent fixture id. */
const AGENT_RATES: Record<string, { sessions: number; tokens: number; costUsd: number; tone: ChartToneName }> = {
  'agt-planner': { sessions: 1.4, tokens: 13_700, costUsd: 0.28, tone: 'primary' },
  'agt-frontend': { sessions: 2.1, tokens: 9_400, costUsd: 0.16, tone: 'accent' },
  'agt-debugger': { sessions: 0.6, tokens: 11_200, costUsd: 0.33, tone: 'gold' },
  'agt-docs': { sessions: 1.9, tokens: 3_600, costUsd: 0.05, tone: 'info' },
};

const agentsForRange = (workspaceId: string, range: UsageRange): AgentUsageStat[] => {
  const days = RANGE_DAYS[range];
  return AGENTS.filter((a) => a.workspaceId === workspaceId)
    .map((a): AgentUsageStat | null => {
      const rate = AGENT_RATES[a.id];
      if (rate == null) return null;
      return {
        agentId: a.id,
        name: a.name,
        sessions: Math.round(rate.sessions * days),
        tokens: Math.round(rate.tokens * days),
        costUsd: Math.round(rate.costUsd * days * 100) / 100,
        tone: rate.tone,
      };
    })
    .filter((a): a is AgentUsageStat => a != null);
};

/**
 * When-agents-run heatmap for the week containing POC_TODAY (Mon-start).
 * Range-independent — the grid is always "this week" per the spec.
 */
const WEEK_ACTIVITY: ActivityCell[] = (() => {
  const today = new Date(POC_TODAY.year, POC_TODAY.month, POC_TODAY.day);
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
  const out: ActivityCell[] = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + d);
    const weekday = date.getDay();
    const sunday = weekday === 0;
    const day = localDay(date);
    for (let hr = 0; hr < 24; hr++) {
      let intensity: number;
      if (hr >= 9 && hr <= 18 && !sunday && weekday <= 5) {
        intensity = 0.55 + 0.45 * Math.sin(((hr - 9) / 9) * Math.PI);
      } else if (hr >= 7 && hr <= 22 && !sunday) {
        intensity = 0.18;
      } else {
        intensity = 0.04;
      }
      intensity += (((hr * 13 + d * 7) % 5) - 2) * 0.04;
      const value = Math.round(Math.max(0, Math.min(1, intensity)) * 100);
      if (value > 0) out.push({ day, hour: hr, value });
    }
  }
  return out;
})();

/** Top-5 sessions by spend for a workspace (range-independent, all-time). */
const topSessions = (workspaceId: string): TopSessionStat[] => SESSIONS
  .filter((s) => s.workspaceId === workspaceId)
  .slice()
  .sort((a, b) => b.costUsd - a.costUsd)
  .slice(0, 5)
  .map((s): TopSessionStat => ({
    sessionId: s.id,
    title: s.title,
    agentInstanceId: s.agentInstanceId,
    model: s.model,
    modelTone: MODEL_TONE[s.model] ?? 'neutral',
    status: s.status,
    tokens: s.tokensUsed,
    costUsd: s.costUsd,
  }));

/** Weeks per calendar month — projects the per-workspace weekly figures
    (the sidebar week widget's source) up to a monthly budget so the Overview
    budget card mirrors the week pill's healthy/unhealthy ratio per workspace,
    instead of comparing a range total against a weekly cap. */
const WEEKS_PER_MONTH = 4.345;

/** Per-workspace usage scale, so hero stats + charts differ per workspace
    rather than showing the same global series everywhere. The default
    workspace is the reference (factor 1.0), keeping its figures — and the
    api tests that assert against it — unchanged. */
const REF_WEEK_TOKENS =
  USAGE_STATS.find((u) => u.workspaceId === DEFAULT_WORKSPACE_ID)?.week.tokensUsed ?? 1;

const workspaceFactor = (workspaceId: string): number => {
  const used = USAGE_STATS.find((u) => u.workspaceId === workspaceId)?.week.tokensUsed;
  if (used == null || REF_WEEK_TOKENS === 0) return 1;
  return used / REF_WEEK_TOKENS;
};

const scalePoint = (p: UsageSeriesPoint, factor: number): UsageSeriesPoint => {
  if (factor === 1) return p;
  const tokensByModel: Record<string, number> = {};
  for (const model of Object.keys(p.tokensByModel)) {
    tokensByModel[model] = Math.round((p.tokensByModel[model] ?? 0) * factor);
  }
  return {
    ...p,
    tokensByModel,
    totalTokens: Math.round(p.totalTokens * factor),
    sessions: Math.max(0, Math.round(p.sessions * factor)),
    costUsd: Math.round(p.costUsd * factor * 100) / 100,
  };
};

/** Monthly budget derived from the workspace's weekly figures — decoupled
    from the toolbar range (a monthly budget must not swing when you toggle
    the 7d/30d chart window) and coherent with the sidebar week pill. */
const budgetFor = (workspaceId: string, avgCostPerToken: number): BudgetSummary => {
  const week = USAGE_STATS.find((u) => u.workspaceId === workspaceId)?.week;
  const usedTokens = Math.round((week?.tokensUsed ?? 0) * WEEKS_PER_MONTH);
  const cap = Math.round((week?.tokenLimit ?? 4_000_000) * WEEKS_PER_MONTH);
  const monthIdx = POC_TODAY.month;
  const daysInMonth = new Date(POC_TODAY.year, monthIdx + 1, 0).getDate();
  // Linear projection of the current month-to-date pace to month end.
  const forecastTokens = Math.round((usedTokens / POC_TODAY.day) * daysInMonth);
  return {
    cap,
    usedTokens,
    spentUsd: Math.round(usedTokens * avgCostPerToken * 100) / 100,
    forecastTokens,
    periodStartLabel: `${MONTHS[monthIdx]} 1`,
    periodEndLabel: `${MONTHS[monthIdx]} ${daysInMonth}`,
  };
};

/** Frozen end-of-day anchor for the heatmap grid — the week containing
    POC_TODAY. Never the wall clock. */
const ACTIVITY_END_ISO = new Date(
  Date.UTC(POC_TODAY.year, POC_TODAY.month, POC_TODAY.day),
).toISOString();

/** Build the full Overview payload for a workspace + range. */
export const buildOverview = (
  workspaceId: string,
  range: UsageRange,
): UsageOverview => {
  const factor = workspaceFactor(workspaceId);
  const series = seriesForRange(range).map((p) => scalePoint(p, factor));
  const totals = series.reduce(
    (acc, p) => ({
      tokens: acc.tokens + p.totalTokens,
      sessions: acc.sessions + p.sessions,
      costUsd: acc.costUsd + p.costUsd,
    }),
    { tokens: 0, sessions: 0, costUsd: 0 },
  );
  const roundedTotals = {
    tokens: totals.tokens,
    sessions: totals.sessions,
    costUsd: Math.round(totals.costUsd * 100) / 100,
  };
  const avgCostPerToken = totals.tokens > 0
    ? totals.costUsd / totals.tokens
    : 0;
  const agents = agentsForRange(workspaceId, range);
  return {
    workspaceId,
    range,
    series,
    models: MODEL_SERIES.map((m) => ({ ...m })),
    toolCalls: toolCallsForRange(range).map((t) => ({
      ...t,
      calls: Math.round(t.calls * factor),
    })),
    agents,
    activity: agents.length > 0
      ? WEEK_ACTIVITY.map((c) => ({ ...c }))
      : [],
    activityEnd: ACTIVITY_END_ISO,
    topSessions: topSessions(workspaceId),
    budget: budgetFor(workspaceId, avgCostPerToken),
    totals: roundedTotals,
  };
};
