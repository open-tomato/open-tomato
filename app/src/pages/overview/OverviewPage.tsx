import type {
  ChartToneName,
  SessionStatus,
  UsageOverview,
  UsageRange,
} from '../../data';

import {
  Button,
  CalendarHeatmap,
  CellDoubleLine,
  CellLabel,
  CellValue,
  FormattedCurrency,
  HumanReadableValue,
  Icon,
  LineChart,
  Menu,
  MenuContent,
  MenuItem,
  MenuSep,
  MenuTrigger,
  Modal,
  ModelCell,
  RowStatCard,
  RowStatCardMeter,
  SectionCard,
  Segmented,
  SmallStatCard,
  Sparkline,
  UsageChart,
  cn,
} from '@open-tomato/ui-components';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { api, DEFAULT_WORKSPACE_ID } from '../../data';
import { chartToneClass, formatCompact } from '../../lib';
import { workspaceBase, withBase } from '../../routes/paths';
import { PageHead } from '../shared/PageHead';

import { OverviewSkeleton } from './OverviewSkeleton';

/** Spec toolbar ranges: 7 / 30 / 90 days, this year. */
const RANGES: { key: UsageRange; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'year', label: 'this year' },
];

/** Spec export menu: PDF / JSON / YAML / CSV, then the Share modal. */
const EXPORT_FORMATS = ['PDF', 'JSON', 'YAML', 'CSV'];

const DEFAULT_RANGE: UsageRange = '30d';

/** Session status → accent label tone for the Top-5 status labels. */
const STATUS_LABEL_TONE: Record<SessionStatus, ChartToneName> = {
  running: 'success',
  waiting: 'gold',
  done: 'info',
  failed: 'danger',
};

/**
 * OverviewPage — the real webapp Overview dashboard (WS07 session 1).
 * Spec: docs/plans/poc-release/reference/UI-Overview.md + Snippets.md;
 * composition mirrors the WS04 reference OverviewPage, rebuilt as app code
 * over the mock `api.usage.overview(workspaceId, range)`.
 *
 * The time-range Segmented drives an api re-fetch (deterministic per
 * range); the Export menu + Share modal are visual-only mocks per PoC
 * scope. Loading uses a skeleton and, consistent with the shell, error UI
 * is deferred (load failures log in dev — see app/docs/data-contracts.md).
 */
export const OverviewPage = () => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const navigate = useNavigate();
  const base = workspaceBase(workspaceId);
  const activeWorkspaceId = workspaceId ?? DEFAULT_WORKSPACE_ID;

  const [range, setRange] = useState<UsageRange>(DEFAULT_RANGE);
  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // A range change re-fetches through the api param (spec: the toolbar
    // re-slices the series). Previous data stays on screen until the new
    // payload lands; the skeleton only shows on the first load (null init).
    void api.usage
      .overview(activeWorkspaceId, range)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((error: unknown) => {
        // Error UI deferred past PoC (see data-contracts.md); real
        // transports must not strand the page on a blank skeleton.
        if (import.meta.env.DEV) console.error('overview load failed', error);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, range]);

  const rangeIndex = RANGES.findIndex((r) => r.key === range);

  const toolbar = (
    <>
      <Segmented
        size="sm"
        items={RANGES.map((r) => ({ key: r.key, label: r.label }))}
        index={rangeIndex < 0
          ? 1
          : rangeIndex}
        onChange={(i) => setRange(RANGES[i]?.key ?? DEFAULT_RANGE)}
        aria-label="Time range"
      />
      <Menu modal={false}>
        <MenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            iconLeading={<Icon name="download" size={15} />}
          >
            Export
          </Button>
        </MenuTrigger>
        <MenuContent size="md" align="end">
          {EXPORT_FORMATS.map((format) => (
            <MenuItem key={format} icon={<Icon name="file-down" size={15} />}>
              Export as {format}
            </MenuItem>
          ))}
          <MenuSep />
          <MenuItem
            icon={<Icon name="share-2" size={15} />}
            onSelect={() => setShareOpen(true)}
          >
            Share…
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Overview"
        tags={['tokens', 'sessions', 'spend']}
        sub="What we're spending tokens on, where the budget sits, and which runs are pulling the most weight."
        action={toolbar}
      />

      {overview == null
        ? <OverviewSkeleton />
        : (
          <OverviewBody
            overview={overview}
            range={range}
            onSeeAllSessions={() => void navigate(withBase(base, '/sessions'))}
          />
        )}

      {/* share modal (spec: Export menu → Share modal) — mock content */}
      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        eyebrow="Export"
        title="Share this overview"
        footerStatus="link scoped to this workspace"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setShareOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              iconLeading={<Icon name="link" size={15} />}
              onClick={() => setShareOpen(false)}
            >
              Copy link
            </Button>
          </>
        )}
      >
        <div className="flex flex-col gap-3">
          <p className="m-0">
            Anyone in the workspace with the link sees this dashboard with
            the current time range applied.
          </p>
          <code className="block truncate rounded-md border border-border-soft bg-surface-sunk px-3 py-2 font-mono text-xs text-fg1">
            https://app.open-tomato.dev
            {base}
            ?range=
            {range}
          </code>
        </div>
      </Modal>
    </div>
  );
};

OverviewPage.displayName = 'OverviewPage';

interface OverviewBodyProps {
  overview: UsageOverview;
  range: UsageRange;
  onSeeAllSessions: () => void;
}

/** The loaded dashboard content — split out so the range/skeleton swap
 * stays readable and every hook here runs against a present payload. */
const OverviewBody = ({ overview, range, onSeeAllSessions }: OverviewBodyProps) => {
  const {
    series, models, toolCalls, agents, activity, topSessions, budget, totals,
  } = overview;

  const usedRatio = totals.tokens / budget.cap;
  const forecastRatio = Math.min(0.99, budget.forecastTokens / budget.cap);

  const lineSeries = useMemo(
    () => models.map((m) => ({
      id: m.model,
      label: m.label,
      tone: m.tone,
      data: series.map((p) => p.tokensByModel[m.model] ?? 0),
    })),
    [models, series],
  );
  const labels = useMemo(() => series.map((p) => p.label), [series]);

  const toolTotal = toolCalls.reduce((a, t) => a + t.calls, 0);
  const bucketNoun = range === 'year'
    ? 'months'
    : 'days';

  const activityEnd = activity.length > 0
    ? activity[activity.length - 1]!.day
    : undefined;

  return (
    <>
      {/* hero stats — 4 across */}
      <div className="grid grid-cols-4 gap-3.5 max-lg:grid-cols-2">
        <SmallStatCard
          title="tokens used"
          value={totals.tokens}
          goal={budget.cap}
          footer={<Sparkline data={series.map((d) => d.totalTokens)} label="tokens per bucket" />}
        />
        <SmallStatCard
          title="sessions"
          value={totals.sessions}
          trend={0.12}
          footer={<Sparkline data={series.map((d) => d.sessions)} label="sessions per bucket" />}
        />
        <SmallStatCard
          title="spend"
          value={<FormattedCurrency value={totals.costUsd} currency="usd" />}
          trend={0.08}
          footer={<Sparkline data={series.map((d) => d.costUsd)} label="spend per bucket" />}
        />
        <SmallStatCard
          title="avg / session"
          value={totals.sessions > 0
            ? Math.round(totals.tokens / totals.sessions)
            : 0}
          unit="tokens"
        />
      </div>

      {/* monthly budget — used + forecast meter */}
      <RowStatCard
        title="Monthly budget"
        subtitle={(
          <>
            {formatCompact(totals.tokens)}
            {' of '}
            {formatCompact(budget.cap)}
            {' tokens used · $'}
            {budget.spentUsd.toFixed(2)}
            {' spent so far'}
          </>
        )}
        stats={[
          { title: 'used', value: `${Math.round(usedRatio * 100)}%` },
          {
            title: 'forecast',
            value: formatCompact(budget.forecastTokens),
            tone: 'muted',
          },
        ]}
        action={(
          <Button
            variant="secondary"
            size="sm"
            iconLeading={<Icon name="settings" size={15} />}
          >
            Adjust
          </Button>
        )}
        footer={(
          <RowStatCardMeter
            value={usedRatio}
            marker={{ ratio: forecastRatio, label: 'forecast end-of-month' }}
            startLabel={budget.periodStartLabel}
            endLabel={budget.periodEndLabel}
            label={`${Math.round(usedRatio * 100)}% of monthly budget used`}
          />
        )}
      />

      {/* tokens by model + tool calls */}
      <div className="grid grid-cols-[1.7fr_1fr] items-stretch gap-4 max-lg:grid-cols-1">
        <LineChart
          title="Tokens by model"
          subtitle={`${range === 'year'
            ? 'Monthly'
            : 'Daily'} totals · ${series.length} ${bucketNoun}`}
          series={lineSeries}
          labels={labels}
        />
        <UsageChart
          title="Tool calls"
          subtitle={`${toolTotal.toLocaleString('en-US')} calls`}
          mode="simple"
          items={toolCalls.map((t) => ({
            name: t.name,
            value: t.calls,
            tone: t.tone,
          }))}
        />
      </div>

      {/* spend by agent + when agents run */}
      <div className="grid grid-cols-[1.4fr_1fr] items-stretch gap-4 max-lg:grid-cols-1">
        <UsageChart
          title="Spend by agent"
          subtitle={`${agents.length} active`}
          mode="multi"
          items={agents
            .slice()
            .sort((a, b) => b.costUsd - a.costUsd)
            .map((agent) => ({
              name: agent.name,
              value: agent.costUsd,
              displayValue: <FormattedCurrency value={agent.costUsd} currency="usd" />,
              tone: agent.tone,
              meta: `${agent.sessions} runs`,
              decoration: (
                <span
                  className={cn(
                    'flex size-[26px] items-center justify-center rounded-sm',
                    'bg-[color-mix(in_oklab,currentColor_14%,transparent)]',
                    chartToneClass(agent.tone),
                  )}
                >
                  <Icon name="bot" size={13} />
                </span>
              ),
              columns: [<HumanReadableValue key="tokens" value={agent.tokens} short />],
            }))}
        />
        <CalendarHeatmap
          title="When agents run"
          subtitle="Local time · this week"
          range="week"
          weekStart="monday"
          data={activity.map((c) => ({ date: c.day, hour: c.hour, value: c.value }))}
          end={activityEnd}
          unit="runs"
        />
      </div>

      {/* top 5 sessions by spend */}
      <SectionCard
        title="Top 5 sessions by spend"
        subtitle="Click for the full transcript"
        padded={false}
        action={(
          <Button
            variant="ghost"
            size="sm"
            iconTrailing={<Icon name="arrow-right" size={15} />}
            onClick={onSeeAllSessions}
          >
            See all sessions
          </Button>
        )}
      >
        <div>
          {topSessions.map((session, i) => (
            <div
              key={session.sessionId}
              className={cn(
                'grid grid-cols-[36px_1.4fr_0.9fr_0.7fr_0.9fr_0.7fr] items-center gap-3 px-[18px] py-3',
                'transition-colors hover:bg-surface-sunk',
                i > 0 && 'border-t border-border-soft',
              )}
            >
              <CellLabel
                labels={String(i + 1).padStart(2, '0')}
                tone="accent"
                bg="soft"
              />
              <CellDoubleLine title={session.title} subtitle={session.agentInstanceId} />
              <ModelCell name={session.model} tone={session.modelTone} />
              <CellLabel
                labels={session.status}
                tone={STATUS_LABEL_TONE[session.status]}
              />
              <CellValue value={session.tokens} unit="tokens" />
              <CellValue align="end">
                <FormattedCurrency value={session.costUsd} currency="usd" />
              </CellValue>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
};

OverviewBody.displayName = 'OverviewBody';
