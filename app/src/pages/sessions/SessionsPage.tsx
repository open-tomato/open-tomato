import type {
  Agent,
  ChartToneName,
  Session,
  SessionStatus,
  UsageStats,
} from '../../data';
import type { CellStatusProps, Column } from '@open-tomato/ui-components';

import {
  Button,
  FormattedCurrency,
  Icon,
  SearchInput,
  Select,
  SmallStatCard,
  StatusIndicator,
  Table,
  Toolbar,
  ToolbarControls,
  renderCellContent,
} from '@open-tomato/ui-components';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router';

import { agentTone, api, DEFAULT_WORKSPACE_ID, POC_NOW, sessionElapsedSeconds } from '../../data';
import { withBase, workspaceBase } from '../../routes/paths';
import { FilterBadge } from '../shared/FilterBadge';
import { PageHead } from '../shared/PageHead';

import { SessionsSkeleton } from './SessionsSkeleton';

type StatusFilter = 'all' | SessionStatus;

const STATUS_FILTERS: SessionStatus[] = ['running', 'waiting', 'done', 'failed'];

/** Session status → CellStatus tone (spec ok/warn/err/info/disabled). */
const STATUS_TONE: Record<SessionStatus, NonNullable<CellStatusProps['tone']>> = {
  running: 'ok',
  waiting: 'warn',
  done: 'info',
  failed: 'err',
};

/** `usr-jess` → `jess`. */
const handleOf = (userId: string): string => userId.replace(/^usr-/, '');

interface SessionsData {
  sessions: Session[];
  agents: Agent[];
  stats: UsageStats | null;
}

/**
 * SessionsPage — the Sessions list (WS07 session 2). Spec: UI-Sessions.md;
 * composition mirrors the WS04 reference SessionsPage, rebuilt as app code
 * over the mock api (`api.sessions.list` + `api.usage.stats` +
 * `api.agents.list`).
 *
 * Stat row, a detached filter toolbar (text filter, status quick-pills with
 * counts, user select — list only, no grid toggle per spec), and the
 * registry-driven Table (session-cell / agent-cell / status /
 * tokens-progress / spend-over-time / user-inline / context-menu). Row
 * actions: Open / Fork / Copy ID / Export + a destructive Archive.
 *
 * The New / Fork / Export sub-routes render into the `<Outlet/>` below as
 * modals over this list (`/sessions/new`, `/sessions/:id/fork`,
 * `/sessions/:id/export`); `/sessions/:id` is a separate full page. All
 * mutating handlers are PoC mocks (Copy ID writes the clipboard; Archive is
 * a no-op behind the row menu's ConfirmPopover).
 */
export const SessionsPage = () => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const navigate = useNavigate();
  const base = workspaceBase(workspaceId);
  const activeWorkspaceId = workspaceId ?? DEFAULT_WORKSPACE_ID;

  const [data, setData] = useState<SessionsData | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [user, setUser] = useState('everyone');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.sessions.list(activeWorkspaceId),
      api.agents.list(activeWorkspaceId),
      api.usage.stats(activeWorkspaceId).catch(() => null),
    ])
      .then(([sessions, agents, stats]) => {
        if (!cancelled) setData({ sessions, agents, stats });
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('sessions load failed', error);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  const goTo = (relative: string): void => {
    void navigate(withBase(base, relative));
  };

  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const agents = useMemo(() => data?.agents ?? [], [data]);

  const agentName = useMemo(() => {
    const map = new Map(agents.map((a) => [a.id, a.name]));
    return (id: string): string => map.get(id) ?? id;
  }, [agents]);

  const counts = useMemo(() => {
    const byStatus = (s: SessionStatus): number => sessions.filter((row) => row.status === s).length;
    return {
      all: sessions.length,
      running: byStatus('running'),
      waiting: byStatus('waiting'),
      done: byStatus('done'),
      failed: byStatus('failed'),
    };
  }, [sessions]);

  const users = useMemo(
    () => [...new Set(sessions.map((s) => handleOf(s.createdBy)))].sort(),
    [sessions],
  );

  const filtered = useMemo(
    () => sessions
      .filter((row) => status === 'all' || row.status === status)
      .filter((row) => user === 'everyone' || handleOf(row.createdBy) === user)
      .filter((row) => {
        if (query === '') return true;
        const haystack = `${row.title} ${row.id} ${row.agentInstanceId} ${agentName(row.agentId)} ${row.branch ?? ''}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [sessions, status, user, query, agentName],
  );

  const columns: Column<Session>[] = [
    {
      key: 'session',
      header: 'Session',
      width: 230,
      sortable: true,
      sortAccessor: (r) => r.title,
      cell: (r) => renderCellContent('session-cell', {
        name: r.title,
        status: r.status,
        agentInstanceId: r.agentInstanceId,
        branch: r.branch,
      }),
    },
    {
      key: 'agent',
      header: 'Agent/Model',
      cell: (r) => renderCellContent('agent-cell', {
        name: agentName(r.agentId),
        model: r.model,
        tone: agentTone(r.agentId) as ChartToneName,
      }),
    },
    {
      key: 'status',
      header: 'Status',
      width: 104,
      sortable: true,
      sortAccessor: (r) => r.status,
      cell: (r) => renderCellContent('status', {
        tone: STATUS_TONE[r.status],
        text: r.status,
        pulse: r.status === 'running',
      }),
    },
    {
      key: 'tokens',
      header: 'Tokens',
      width: 130,
      sortable: true,
      sortAccessor: (r) => r.tokensUsed,
      // No quota == the "no limit" toggle was on — render the bare count
      // (tokens-progress requires a quota to key its threshold colour).
      cell: (r) => (r.tokenQuota != null
        ? renderCellContent('tokens-progress', { used: r.tokensUsed, quota: r.tokenQuota })
        : renderCellContent('value', { value: r.tokensUsed, unit: 'tokens' })),
    },
    {
      key: 'spend',
      header: 'Spend/Time',
      width: 150,
      sortable: true,
      sortAccessor: (r) => r.costUsd,
      cell: (r) => renderCellContent('spend-over-time', {
        cost: r.costUsd,
        seconds: sessionElapsedSeconds(r),
        date: r.startedAt,
        now: POC_NOW,
      }),
    },
    {
      key: 'by',
      header: 'By',
      width: 96,
      cell: (r) => renderCellContent('user-inline', { handle: handleOf(r.createdBy) }),
    },
    {
      key: 'menu',
      header: '',
      width: 52,
      align: 'end',
      cell: (r) => renderCellContent('context-menu', {
        entityType: 'session',
        entityName: r.title,
        actions: [
          { icon: 'eye', title: 'Open', onClick: () => goTo(`/sessions/${r.id}`) },
          { icon: 'git-branch', title: 'Fork session', onClick: () => goTo(`/sessions/${r.id}/fork`) },
          {
            icon: 'copy',
            title: 'Copy session ID',
            onClick: () => { void navigator.clipboard?.writeText(r.id); },
          },
          { icon: 'download', title: 'Export transcript', onClick: () => goTo(`/sessions/${r.id}/export`) },
        ],
        destructive: { icon: 'archive', title: 'Archive', onClick: () => {} },
      }),
    },
  ];

  const stats = data?.stats;

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Sessions"
        sub="What's cooking in the workspace, which sessions are active, and which runs are pulling the most weight — where did we fail?"
        action={(
          <Button
            variant="primary"
            iconLeading={<Icon name="plus" size={16} />}
            onClick={() => goTo('/sessions/new')}
          >
            New session
          </Button>
        )}
      />

      {data == null
        ? <SessionsSkeleton />
        : (
          <>
            {/* stat row (from usage.stats) */}
            <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
              <SmallStatCard
                title="Live now"
                decoration={<StatusIndicator tone="ok" pulse label="live" />}
                value={stats?.activeSessions ?? 0}
              />
              <SmallStatCard
                title="Today"
                decoration={<Icon name="terminal" size={13} className="text-fg3" />}
                value={stats?.runsToday ?? 0}
                unit="runs"
              />
              <SmallStatCard
                title="Tokens today"
                decoration={<Icon name="cpu" size={13} className="text-fg3" />}
                value={stats?.tokensToday ?? 0}
              />
              <SmallStatCard
                title="Cost today"
                decoration={<Icon name="dollar-sign" size={13} className="text-fg3" />}
                value={<FormattedCurrency value={stats?.costTodayUsd ?? 0} currency="usd" />}
              />
            </div>

            {/* detached filter toolbar — list only (spec drops the raw grid toggle) */}
            <Toolbar>
              <ToolbarControls>
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Filter by name, id, agent, branch…"
                  aria-label="Filter sessions"
                  className="max-w-[280px]"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <FilterBadge
                    selected={status === 'all'}
                    onClick={() => setStatus('all')}
                    label="all"
                    count={counts.all}
                  />
                  {STATUS_FILTERS.map((s) => (
                    <FilterBadge
                      key={s}
                      selected={status === s}
                      onClick={() => setStatus(s)}
                      label={s}
                      count={counts[s]}
                      decoration={(
                        <StatusIndicator
                          tone={STATUS_TONE[s]}
                          size="sm"
                          pulse={s === 'running'}
                        />
                      )}
                    />
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="font-mono text-[11px] text-fg3">by</span>
                  <Select
                    value={user}
                    onChange={setUser}
                    width={150}
                    ariaLabel="Filter by user"
                    options={[
                      { value: 'everyone', label: 'everyone' },
                      ...users.map((u) => ({ value: u, label: `@${u}` })),
                    ]}
                  />
                </div>
              </ToolbarControls>
            </Toolbar>

            <Table
              columns={columns}
              data={filtered}
              getRowId={(r) => r.id}
              layout="fit"
            />
          </>
        )}

      {/* new / fork / export sub-routes render here as modals over the list */}
      <Outlet />
    </div>
  );
};

SessionsPage.displayName = 'SessionsPage';
