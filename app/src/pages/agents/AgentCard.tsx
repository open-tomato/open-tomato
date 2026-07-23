import {
  AgentTitle,
  Badge,
  FormattedRelativeTime,
  Icon,
  ModelFooter,
  RowContextAction,
  Switch,
  Tag,
  cn,
} from '@open-tomato/ui-components';

/** ui-components `DateInput` is not re-exported at the package root. */
type DateInput = Date | string | number;

/**
 * AgentCard — a reusable-persona card for the Agents grid.
 *
 * CATALOG GAP: `@open-tomato/ui-components` v0.7.0 does not export the WS04
 * `AgentCard` organism (it exists in the breakdown repo but was not part of
 * the published catalog). Rebuilt app-local here composing library atoms /
 * molecules (AgentTitle, ModelFooter, Badge, Tag, Switch, Icon,
 * RowContextAction), faithful to the reference. Flag for promotion into a
 * future ui-components release so the Agents page can drop this local copy.
 *
 * Three rows: header (agent-title + running/off badge + context menu),
 * content (description + up to 5 tool badges with `+x more`), footer (dotted
 * rule, model-footer · last-run relative time · run count, plus an on/off
 * toggle shown only when the persona is not running).
 */

/** Spec fallback: show up to this many tool badges, then `+x more`. */
const MAX_TOOL_BADGES = 5;

export interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  model: string;
  /** Tool display labels; up to 5 render as badges, the rest collapse. */
  tools: string[];
  enabled: boolean;
  /** Live instances right now; > 0 renders the running badge. */
  running: number;
  /** Last run/use — null renders `never`. */
  lastRunAt: DateInput | null;
  runs: number;
  /** Frozen clock for the relative-time render (determinism). */
  now?: DateInput;
  onRun?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  /** Fired by the footer on/off toggle (shown only when not running). */
  onToggle?: (enabled: boolean) => void;
}

export const AgentCard = ({
  id,
  name,
  description,
  model,
  tools,
  enabled,
  running,
  lastRunAt,
  runs,
  now,
  onRun,
  onEdit,
  onDuplicate,
  onArchive,
  onToggle,
}: AgentCardProps) => {
  const isRunning = running > 0;
  const shownTools = tools.slice(0, MAX_TOOL_BADGES);
  const overflow = tools.length - shownTools.length;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border-soft bg-surface-1 p-4',
        'shadow-xs transition-shadow duration-150 hover:shadow-sm',
        !enabled && 'opacity-70',
      )}
    >
      {/* header */}
      <div className="flex items-start gap-2">
        <AgentTitle className="flex-1" name={name} subtitle={id} />
        <div className="flex shrink-0 items-center gap-1">
          {isRunning
            ? <Badge tone="success" size="sm" dot>{running}</Badge>
            : !enabled
              ? <Badge tone="neutral" size="sm">off</Badge>
              : null}
          <RowContextAction
            entityType="agent"
            entityName={name}
            actions={[
              { icon: 'play', title: 'Run session', onClick: () => onRun?.() },
              { icon: 'pen-line', title: 'Edit agent', onClick: () => onEdit?.() },
              { icon: 'copy-plus', title: 'Duplicate', onClick: () => onDuplicate?.() },
            ]}
            destructive={{ icon: 'archive', title: 'Archive', onClick: () => onArchive?.() }}
          />
        </div>
      </div>

      {/* content */}
      <p className="m-0 line-clamp-3 text-[13px] leading-normal text-fg2 [text-wrap:pretty]">
        {description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {shownTools.map((tool) => (
          <Tag key={tool} tone="neutral" mono>{tool}</Tag>
        ))}
        {overflow > 0 && (
          <span className="inline-flex items-center px-1 font-mono text-[11px] text-fg3">
            +{overflow} more
          </span>
        )}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between gap-2 border-t border-dashed border-border-soft pt-2.5">
        <div className="flex min-w-0 items-center gap-3 font-mono text-[11px] text-fg3">
          <ModelFooter name={model} />
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={11} />
            {lastRunAt != null
              ? <FormattedRelativeTime date={lastRunAt} now={now} />
              : 'never'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="history" size={11} />
            {runs} runs
          </span>
        </div>
        {!isRunning && (
          <Switch
            checked={enabled}
            onChange={onToggle}
            size="sm"
            aria-label={`${enabled
              ? 'Disable'
              : 'Enable'} ${name}`}
          />
        )}
      </div>
    </div>
  );
};

AgentCard.displayName = 'AgentCard';
