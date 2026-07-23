import type { Task, TaskPriority, TaskStatus, TeamMember } from '../../data';
import type { BadgeProps, Column } from '@open-tomato/ui-components';

import {
  Badge,
  Button,
  Icon,
  renderCellContent,
  SearchInput,
  Select,
  Table,
  Toolbar,
  ToolbarControls,
} from '@open-tomato/ui-components';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router';

import { api, DEFAULT_WORKSPACE_ID, POC_NOW } from '../../data';
import { withBase, workspaceBase } from '../../routes/paths';
import { PageHead } from '../shared/PageHead';

import { RoadmapSkeleton } from './RoadmapSkeleton';

/** Status → table/badge label (app has a `ready-for-dev` status the WS04
    reference didn't; the roadmap surfaces all five). */
const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'todo',
  'ready-for-dev': 'ready',
  'in-progress': 'in progress',
  blocked: 'blocked',
  done: 'done',
};

const STATUS_TONE: Record<TaskStatus, NonNullable<BadgeProps['tone']>> = {
  todo: 'neutral',
  'ready-for-dev': 'info',
  'in-progress': 'warning',
  blocked: 'danger',
  done: 'success',
};

const PRIORITY_TONE: Record<TaskPriority, NonNullable<BadgeProps['tone']>> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

type StatusFilter = 'all' | TaskStatus;
type PriorityFilter = 'all' | TaskPriority;

/** Blocking column — blocked-by (danger) and blocks (warning) counts. */
const BlockingBadges = ({ task }: { task: Task }) => {
  if (task.blockedBy.length === 0 && task.blocking.length === 0) {
    return <span className="font-mono text-[12.5px] text-fg3">—</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      {task.blockedBy.length > 0 && (
        <Badge tone="danger" size="sm">
          <Icon name="octagon-alert" size={11} />
          {task.blockedBy.length}
        </Badge>
      )}
      {task.blocking.length > 0 && (
        <Badge tone="warning" size="sm">
          <Icon name="circle-alert" size={11} />
          {task.blocking.length}
        </Badge>
      )}
    </span>
  );
};

interface RoadmapData {
  tasks: Task[];
  members: TeamMember[];
}

/**
 * RoadmapPage (`/tasks`) — WS07 session 3. Spec: the WS04 reference
 * RoadmapPage (UI-Roadmap.md), rebuilt as app code over `api.tasks.list`
 * (+ `api.members.list` to resolve owner handles).
 *
 * A detached toolbar (search + status/priority Selects) over a
 * registry-driven Table following the UI-Roadmap column config: mono id,
 * task-cell, status/blocking/priority badges, user-inline owner,
 * relative-time ETA, and a trailing context menu (status/priority
 * quick-sets + Archive). New / Edit open TaskFormModal via the sub-routes
 * rendered into the `<Outlet/>` (`/tasks/new`, `/tasks/:taskId/edit`). All
 * mutating handlers are PoC mocks.
 */
export const RoadmapPage = () => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const navigate = useNavigate();
  const base = workspaceBase(workspaceId);
  const activeWorkspaceId = workspaceId ?? DEFAULT_WORKSPACE_ID;

  const [data, setData] = useState<RoadmapData | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [priority, setPriority] = useState<PriorityFilter>('all');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.tasks.list(activeWorkspaceId),
      api.members.list(),
    ])
      .then(([tasks, members]) => { if (!cancelled) setData({ tasks, members }); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('roadmap load failed', error);
      });
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const goTo = (relative: string): void => {
    void navigate(withBase(base, relative));
  };

  const tasks = useMemo(() => data?.tasks ?? [], [data]);

  // Resolve owner handles from the served roster (an absent owner is an
  // agent-owned task; an unknown id degrades to the bare id).
  const ownerHandle = useMemo(() => {
    const byId = new Map((data?.members ?? []).map((m) => [m.id, m.handle]));
    return (ownerId?: string): string => (ownerId == null
      ? 'agent'
      : byId.get(ownerId) ?? ownerId);
  }, [data]);

  const filtered = useMemo(
    () => tasks
      .filter((task) => status === 'all' || task.status === status)
      .filter((task) => priority === 'all' || task.priority === priority)
      .filter((task) => {
        if (query === '') return true;
        const haystack = `${task.id} ${task.title} ${task.tags.join(' ')}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [tasks, status, priority, query],
  );

  const columns: Column<Task>[] = [
    {
      key: 'id',
      header: 'Id',
      width: 80,
      sortable: true,
      sortAccessor: (t) => t.id,
      cell: (t) => <span className="font-mono text-[12.5px] text-fg3">{t.id}</span>,
    },
    {
      key: 'task',
      header: 'Task',
      sortable: true,
      sortAccessor: (t) => t.title,
      cell: (t) => renderCellContent('task-cell', { title: t.title, tags: t.tags }),
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      sortable: true,
      sortAccessor: (t) => t.status,
      cell: (t) => renderCellContent('badge', {
        label: STATUS_LABEL[t.status],
        tone: STATUS_TONE[t.status],
      }),
    },
    {
      key: 'blocking',
      header: 'Blocking',
      width: 108,
      cell: (t) => <BlockingBadges task={t} />,
    },
    {
      key: 'owner',
      header: 'Owner',
      width: 104,
      cell: (t) => renderCellContent('user-inline', { handle: ownerHandle(t.ownerId) }),
    },
    {
      key: 'priority',
      header: 'Priority',
      width: 96,
      sortable: true,
      sortAccessor: (t) => t.priority,
      cell: (t) => renderCellContent('badge', {
        label: t.priority,
        tone: PRIORITY_TONE[t.priority],
      }),
    },
    {
      key: 'eta',
      header: 'ETA',
      width: 110,
      sortable: true,
      sortAccessor: (t) => (t.eta != null
        ? new Date(t.eta).getTime()
        : Infinity),
      cell: (t) => (t.eta != null
        ? renderCellContent('relative-time', { date: t.eta, now: POC_NOW })
        : <span className="font-mono text-[12.5px] text-fg3">—</span>),
    },
    {
      key: 'menu',
      header: '',
      width: 52,
      align: 'end',
      cell: (t) => renderCellContent('context-menu', {
        entityType: 'task',
        entityName: t.id,
        actions: [
          { icon: 'play', title: 'Run session', onClick: () => goTo('/sessions/new') },
          { icon: 'pen-line', title: 'Edit task', onClick: () => goTo(`/tasks/${t.id}/edit`) },
          { icon: 'list-todo', title: 'Set status: To-do', onClick: () => {} },
          { icon: 'circle-dot', title: 'Set status: In progress', onClick: () => {} },
          { icon: 'shield-alert', title: 'Set status: Blocked', onClick: () => {} },
          { icon: 'circle-check-big', title: 'Set status: Done', onClick: () => {} },
          { icon: 'flame', title: 'Set priority: High', onClick: () => {} },
          { icon: 'circle-alert', title: 'Set priority: Medium', onClick: () => {} },
          { icon: 'chevron-down', title: 'Set priority: Low', onClick: () => {} },
        ],
        destructive: { icon: 'archive', title: 'Archive', onClick: () => {} },
      }),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Roadmap"
        tags={['tasks', 'seed an agent from any of them']}
        sub="Tasks your team is tracking — seed an agent from any of them."
        action={(
          <Button
            variant="primary"
            iconLeading={<Icon name="plus" size={16} />}
            onClick={() => goTo('/tasks/new')}
          >
            New task
          </Button>
        )}
      />

      {data == null
        ? <RoadmapSkeleton />
        : (
          <>
            <Toolbar>
              <ToolbarControls>
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Search tasks by name…"
                  aria-label="Search tasks"
                  className="max-w-[280px]"
                />
                <div className="ml-auto flex items-center gap-2">
                  <Select
                    value={status}
                    onChange={(v) => setStatus(v as StatusFilter)}
                    width={160}
                    ariaLabel="Filter by status"
                    options={[
                      { value: 'all', label: 'all statuses' },
                      { value: 'todo', label: 'todo' },
                      { value: 'ready-for-dev', label: 'ready for dev' },
                      { value: 'in-progress', label: 'in progress' },
                      { value: 'blocked', label: 'blocked' },
                      { value: 'done', label: 'done' },
                    ]}
                  />
                  <Select
                    value={priority}
                    onChange={(v) => setPriority(v as PriorityFilter)}
                    width={150}
                    ariaLabel="Filter by priority"
                    options={[
                      { value: 'all', label: 'all priorities' },
                      { value: 'high', label: 'high' },
                      { value: 'medium', label: 'medium' },
                      { value: 'low', label: 'low' },
                    ]}
                  />
                </div>
              </ToolbarControls>
            </Toolbar>

            <Table
              columns={columns}
              data={filtered}
              getRowId={(t) => t.id}
              layout="fit"
            />
          </>
        )}

      {/* new / edit sub-routes render the task form modal here */}
      <Outlet />
    </div>
  );
};

RoadmapPage.displayName = 'RoadmapPage';
