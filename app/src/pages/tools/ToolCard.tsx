import type { BadgeProps, IconName } from '@open-tomato/ui-components';

import {
  Badge,
  cn,
  FormattedRelativeTime,
  Icon,
  RowContextAction,
  StatusIndicator,
  ToolTitle,
} from '@open-tomato/ui-components';

/** ui-components `DateInput` / `ChartTone` are not re-exported at the root. */
type DateInput = Date | string | number;
type ChartTone = 'accent' | 'primary' | 'info';

/**
 * ToolCard — a connected-surface card for the Tools grid.
 *
 * CATALOG GAP: the WS04 `ToolCard` organism is not (yet) part of the
 * published `@open-tomato/ui-components` catalog (v0.7.0). Rebuilt app-local
 * here composing library molecules/atoms (ToolTitle, RowContextAction,
 * Badge, StatusIndicator, FormattedRelativeTime, Icon), faithful to the
 * reference. Flag for promotion into a future ui-components release so the
 * Tools page can drop this local copy — same disposition as AgentCard.
 *
 * Four rows: header (tool-title + status badge + context menu),
 * description (clamped), a decorated sunk summary strip (type icon · URI ·
 * count, with the API webhook events below), and a dotted footer (usage ·
 * last-used relative time).
 */

/** Tool connectivity state; `connecting` is the transient Test-Connection
    state (accent pulse before it settles back). */
export type ToolCardStatus = 'connected' | 'needs-attention' | 'disabled' | 'connecting';

const ToolStatusBadge = ({ status }: { status: ToolCardStatus }) => {
  if (status === 'connecting') {
    return (
      <Badge tone="info" size="sm">
        <StatusIndicator tone="info" size="sm" pulse />
        connecting
      </Badge>
    );
  }
  if (status === 'needs-attention') {
    return (
      <Badge tone="danger" size="sm">
        <Icon name="triangle-alert" size={11} />
        needs attention
      </Badge>
    );
  }
  if (status === 'disabled') {
    return (
      <Badge tone="neutral" size="sm">
        <Icon name="wrench-off" size={11} />
        disabled
      </Badge>
    );
  }
  return <Badge tone="success" size="sm" dot>connected</Badge>;
};

export interface ToolCardProps {
  id: string;
  name: string;
  description: string;
  /** Primary addressable location — endpoint / server url / source. */
  uri: string;
  /** Human type label for the title badge (`MCP`). */
  typeLabel: string;
  typeIcon: IconName;
  typeTone: ChartTone;
  typeBadgeTone?: NonNullable<BadgeProps['tone']>;
  status: ToolCardStatus;
  /** Agents currently using this tool (0 → "never used"). */
  inUse: number;
  /** MCP tool count / skill count — omit for API clients. */
  count?: number;
  countUnit?: string;
  /** API webhook events listed under the URI (omit for MCP / skills). */
  webhookEvents?: string[];
  /** Last invocation — null renders nothing on the footer right. */
  lastUsedAt?: DateInput | null;
  /** Frozen clock for the relative-time render (determinism). */
  now?: DateInput;
  onEdit?: () => void;
  onTest?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
}

export const ToolCard = ({
  id,
  name,
  description,
  uri,
  typeLabel,
  typeIcon,
  typeTone,
  typeBadgeTone = 'neutral',
  status,
  inUse,
  count,
  countUnit,
  webhookEvents,
  lastUsedAt,
  now,
  onEdit,
  onTest,
  onDuplicate,
  onArchive,
}: ToolCardProps) => (
  <div
    className={cn(
      'flex flex-col gap-3 rounded-lg border border-border-soft bg-surface-1 p-4 shadow-xs',
      status === 'disabled' && 'opacity-70',
    )}
  >
    {/* header */}
    <div className="flex items-start gap-2">
      <ToolTitle
        className="flex-1"
        name={name}
        type={typeLabel}
        slug={id}
        icon={typeIcon}
        tone={typeTone}
        badgeTone={typeBadgeTone}
      />
      <div className="flex shrink-0 items-center gap-1">
        <ToolStatusBadge status={status} />
        <RowContextAction
          entityType="tool"
          entityName={name}
          actions={[
            { icon: 'pen-line', title: 'Edit', onClick: () => onEdit?.() },
            { icon: 'refresh-cw', title: 'Test Connection', onClick: () => onTest?.() },
            { icon: 'copy-plus', title: 'Duplicate', onClick: () => onDuplicate?.() },
          ]}
          destructive={{ icon: 'archive', title: 'Archive', onClick: () => onArchive?.() }}
        />
      </div>
    </div>

    {/* description */}
    <p className="m-0 line-clamp-3 text-[13px] leading-normal text-fg2 [text-wrap:pretty]">
      {description}
    </p>

    {/* summary */}
    <div className="flex flex-1 flex-col gap-1.5 rounded-sm border border-border-soft bg-surface-sunk px-2.5 py-1.5 font-mono text-[11px]">
      <div className="flex items-center gap-2 text-fg2">
        <span className="shrink-0 text-fg3">
          <Icon name={typeIcon} size={12} />
        </span>
        <span className="min-w-0 flex-1 truncate">{uri}</span>
        {count != null && (
          <span className="shrink-0 text-fg3">
            {count} {countUnit ?? 'tools'}
          </span>
        )}
      </div>
      {webhookEvents != null && webhookEvents.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {webhookEvents.map((event) => (
            <span
              key={event}
              className="rounded-full border border-border-soft bg-surface-2 px-1.5 py-px text-[10px] text-fg2"
            >
              {event}
            </span>
          ))}
        </div>
      )}
    </div>

    {/* footer */}
    <div className="flex items-center justify-between gap-2 border-t border-dashed border-border-soft pt-2 font-mono text-[11px] text-fg3">
      <span className="inline-flex items-center gap-1">
        <Icon name="bot" size={11} />
        {inUse > 0
          ? `${inUse} agent${inUse === 1
            ? ''
            : 's'} using`
          : 'never used'}
      </span>
      {lastUsedAt != null && (
        <span className="inline-flex items-center gap-1">
          <Icon name="clock" size={11} />
          <FormattedRelativeTime date={lastUsedAt} now={now} />
        </span>
      )}
    </div>
  </div>
);

ToolCard.displayName = 'ToolCard';
