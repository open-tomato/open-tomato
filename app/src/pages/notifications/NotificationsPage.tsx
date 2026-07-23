import type { NotificationCategory, NotificationRecord } from '../../data';
import type { BadgeProps, Column } from '@open-tomato/ui-components';

import {
  FormattedDate,
  Icon,
  renderCellContent,
  Table,
} from '@open-tomato/ui-components';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import { api, DEFAULT_WORKSPACE_ID } from '../../data';
import { withBase, workspaceBase } from '../../routes/paths';
import { PageHead } from '../shared/PageHead';

/** Category → Badge tone (PoC interpretation, mirrors the data contract). */
const CATEGORY_TONE: Record<NotificationCategory, NonNullable<BadgeProps['tone']>> = {
  session: 'info',
  agent: 'accent',
  tool: 'warning',
  billing: 'danger',
  member: 'success',
  system: 'neutral',
};

/** First line — the title, falling back to the provider/source (spec). */
const titleLine = (n: NotificationRecord): string => (n.title.trim() === ''
  ? n.source ?? 'notification'
  : n.title);

/**
 * NotificationsPage (`/notifications`) — WS07 session 3. Spec: the WS04
 * reference NotificationsPage + the POC-RELEASE-PLANS notifications
 * guidelines. The full-page target of the topbar NotificationsBell "see
 * all".
 *
 * A registry-driven Table: category → `badge`; notification text →
 * `double-line` whose title falls back to the provider/source when the
 * record carries no title; source (mono); date (FormattedDate); and a
 * trailing link to the acted-on resource (base-prefixed router Link).
 */
export const NotificationsPage = () => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const base = workspaceBase(workspaceId);
  const activeWorkspaceId = workspaceId ?? DEFAULT_WORKSPACE_ID;

  const [rows, setRows] = useState<NotificationRecord[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void api.notifications.list(activeWorkspaceId)
      .then((data) => { if (!cancelled) setRows(data); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('notifications load failed', error);
      });
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const columns: Column<NotificationRecord>[] = useMemo(() => [
    {
      key: 'category',
      header: 'Type',
      width: 104,
      cell: (n) => renderCellContent('badge', {
        label: n.category,
        tone: CATEGORY_TONE[n.category],
      }),
    },
    {
      key: 'text',
      header: 'Notification',
      cell: (n) => renderCellContent('double-line', {
        title: titleLine(n),
        subtitle: n.body,
      }),
    },
    {
      key: 'source',
      header: 'Source',
      width: 128,
      sortable: true,
      sortAccessor: (n) => n.source ?? '',
      cell: (n) => (
        <span className="font-mono text-[12.5px] text-fg3">{n.source ?? '—'}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      width: 132,
      sortable: true,
      sortAccessor: (n) => new Date(n.createdAt).getTime(),
      cell: (n) => (
        <FormattedDate
          date={n.createdAt}
          dateStyle="medium"
          className="font-mono text-[12.5px] text-fg3"
        />
      ),
    },
    {
      key: 'action',
      header: '',
      width: 96,
      align: 'end',
      cell: (n) => (n.href != null
        ? (
          <Link
            to={withBase(base, n.href)}
            aria-label={`Open ${titleLine(n)}`}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent no-underline hover:underline"
          >
            Open
            <Icon name="arrow-right" size={13} />
          </Link>
        )
        : null),
    },
  ], [base]);

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Notifications"
        tags={['events', 'across every source']}
        sub="Everything your workspace raised — sessions, tools, billing and more."
      />
      {rows != null && (
        <Table
          columns={columns}
          data={rows}
          getRowId={(n) => n.id}
          layout="fit"
          initialSort={{ key: 'date', dir: 'desc' }}
        />
      )}
    </div>
  );
};

NotificationsPage.displayName = 'NotificationsPage';
