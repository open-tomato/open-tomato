import type { SessionDetail, SessionStatus } from '../../data';
import type { ReactNode } from 'react';

import {
  AgentTitle,
  Badge,
  Button,
  FilesChanged,
  FormattedCurrency,
  FormattedDuration,
  FormattedRelativeTime,
  Icon,
  IconButton,
  RowContextAction,
  SectionCard,
  SmallStatCard,
  Sparkline,
  UsageChart,
  cn,
} from '@open-tomato/ui-components';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { api, POC_NOW } from '../../data';
import { withBase, workspaceBase } from '../../routes/paths';

import { SessionTimeline } from './SessionTimeline';

const STATUS_BADGE: Record<SessionStatus, { tone: 'success' | 'warning' | 'danger' | 'info'; dot: boolean }> = {
  running: { tone: 'success', dot: true },
  waiting: { tone: 'warning', dot: false },
  done: { tone: 'info', dot: false },
  failed: { tone: 'danger', dot: false },
};

/** The runner-metadata `label-and-text` row (spec's KV list). */
const MetaRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <>
    <dt className="m-0 text-fg3">{label}</dt>
    <dd className="m-0 text-right text-fg1">{children}</dd>
  </>
);

MetaRow.displayName = 'MetaRow';

/**
 * SessionViewPage — the View Session full page (WS07 session 2). Spec:
 * UI-Sessions.md "Sub Page: View Session" — the TIMELINE-FIRST layout,
 * rebuilt as app code over `api.sessions.detail(id)`.
 *
 * Header (status + id badges, title, Fork + context menu, description, a
 * roadmap-task link), a collapsed Result card for finished runs, then a
 * two-column body: the timeline + files touched on the left; runner
 * metadata, a session-scoped Tokens SmallStatCard, and the single-line
 * tool-calls UsageChart on the right. The SessionTimeline is an app-local
 * catalog-gap component (see ./SessionTimeline). All handlers are PoC
 * mocks; Fork / Export navigate to their sub-routes.
 */
export const SessionViewPage = () => {
  const { workspaceId, sessionId } = useParams<{ workspaceId?: string; sessionId: string }>();
  const navigate = useNavigate();
  const base = workspaceBase(workspaceId ?? undefined);

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [resultExpanded, setResultExpanded] = useState(false);

  useEffect(() => {
    if (sessionId == null) return undefined;
    let cancelled = false;
    void api.sessions.detail(sessionId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('session detail load failed', error);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const goTo = (relative: string): void => {
    void navigate(withBase(base, relative));
  };

  if (detail == null) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading session">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-surface-sunk" aria-hidden />
        <div className="grid grid-cols-[1fr_320px] gap-5 max-lg:grid-cols-1">
          <div className="h-[420px] animate-pulse rounded-lg border border-border-soft bg-surface-sunk" aria-hidden />
          <div className="h-[320px] animate-pulse rounded-lg border border-border-soft bg-surface-sunk" aria-hidden />
        </div>
      </div>
    );
  }

  const { session } = detail;
  const finished = session.status === 'done' || session.status === 'failed';
  const badge = STATUS_BADGE[session.status];

  return (
    <div className="flex flex-col gap-5">
      {/* header — title left; fork + contextual options right */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <Badge tone={badge.tone} dot={badge.dot}>{session.status}</Badge>
          <Badge tone="neutral">{session.agentInstanceId}</Badge>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="m-0 min-w-0 font-display !text-[32px] font-bold tracking-[-0.02em] text-fg1">
            {session.title}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeading={<Icon name="git-branch" size={15} />}
              onClick={() => goTo(`/sessions/${session.id}/fork`)}
            >
              Fork
            </Button>
            <RowContextAction
              entityType="session"
              entityName={session.title}
              actions={[
                { icon: 'copy', title: 'Copy session ID', onClick: () => { void navigator.clipboard?.writeText(session.id); } },
                { icon: 'download', title: 'Export transcript', onClick: () => goTo(`/sessions/${session.id}/export`) },
              ]}
              destructive={{ icon: 'archive', title: 'Archive', onClick: () => {} }}
            />
          </div>
        </div>
        {session.description != null && (
          <p className="m-0 max-w-[760px] text-sm leading-relaxed text-fg2">
            {session.description}
          </p>
        )}
        {detail.roadmapTaskLabel != null && (
          <button
            type="button"
            onClick={() => goTo('/tasks')}
            className="inline-flex w-fit items-center gap-1.5 border-none bg-transparent p-0 text-[13px] font-semibold text-accent hover:underline"
          >
            <Icon name="list" size={14} />
            {detail.roadmapTaskLabel}
          </button>
        )}
      </div>

      {/* finished runs open with the (collapsed) result card */}
      {finished && (
        <SectionCard
          title="Result"
          subtitle={(
            <>
              <FormattedDuration seconds={detail.elapsedSeconds} />
              {' · '}
              {session.toolCalls} tool calls · {session.filesChanged} files
            </>
          )}
          action={(
            <span className="flex items-center gap-2">
              <Badge tone={session.status === 'done'
                ? 'success'
                : 'danger'}>
                {session.status === 'done'
                  ? 'ok'
                  : 'failed'}
              </Badge>
              <IconButton
                icon={<Icon name={resultExpanded
                  ? 'chevron-up'
                  : 'chevron-down'} size={16} />}
                label={resultExpanded
                  ? 'Collapse result'
                  : 'Expand result'}
                onClick={() => setResultExpanded((v) => !v)}
              />
            </span>
          )}
        >
          <p className={cn('m-0 text-sm leading-[1.55] text-fg1', !resultExpanded && 'line-clamp-1')}>
            {detail.summary}
          </p>
        </SectionCard>
      )}

      <div className="grid grid-cols-[1fr_320px] items-start gap-5 max-lg:grid-cols-1">
        {/* main column — timeline first, then files touched */}
        <div className="flex min-w-0 flex-col gap-4">
          <SectionCard
            title="Timeline"
            subtitle={`${detail.timeline.length} events · started ${detail.timeline[0]?.time ?? ''}`}
          >
            <SessionTimeline events={detail.timeline} />
          </SectionCard>
          {detail.files.length > 0 && (
            <FilesChanged title="Files touched" files={detail.files} />
          )}
        </div>

        {/* right column — runner metadata, session tokens, tool calls */}
        <div className="flex flex-col gap-3.5">
          <SectionCard>
            <div className="flex flex-col gap-3">
              <AgentTitle name={detail.agentName} subtitle="runner" />
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-2 border-t border-border-soft pt-3 font-mono text-xs">
                <MetaRow label="model">{session.model}</MetaRow>
                <MetaRow label="started">
                  <FormattedRelativeTime date={session.startedAt} now={POC_NOW} />
                </MetaRow>
                <MetaRow label={finished
                  ? 'finished'
                  : 'status'}>
                  {finished
                    ? <FormattedRelativeTime date={detail.finishedAt} now={POC_NOW} />
                    : session.status}
                </MetaRow>
                <MetaRow label="elapsed">
                  <FormattedDuration seconds={detail.elapsedSeconds} />
                </MetaRow>
                <MetaRow label="cost">
                  <FormattedCurrency value={session.costUsd} currency="usd" />
                </MetaRow>
                <MetaRow label="files">{session.filesChanged} touched</MetaRow>
                <MetaRow label="commits">
                  {detail.commits} on {session.branch ?? 'main'}
                </MetaRow>
              </dl>
            </div>
          </SectionCard>
          <SmallStatCard
            title="Tokens"
            decoration={<Icon name="cpu" size={13} className="text-fg3" />}
            value={session.tokensUsed}
            goal={session.tokenQuota}
            footer={<Sparkline data={detail.tokenSpark} label="tokens over the run" />}
          />
          {detail.toolCalls.length > 0 && (
            <UsageChart
              title="Tool calls"
              subtitle={`${session.toolCalls} total`}
              mode="single"
              items={detail.toolCalls}
            />
          )}
        </div>
      </div>
    </div>
  );
};

SessionViewPage.displayName = 'SessionViewPage';
