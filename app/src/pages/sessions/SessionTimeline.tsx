import type { SessionTimelineEvent, SessionTimelineLevel } from '../../data';

import { Icon, cn, type IconName } from '@open-tomato/ui-components';

/**
 * SessionTimeline — the chronological session event feed (left rail with
 * level-toned nodes, mono time column, event text + optional meta line).
 *
 * CATALOG GAP: the WS04 `SessionTimeline` molecule is not (yet) part of the
 * published `@open-tomato/ui-components` catalog (v0.7.0). Rebuilt app-local
 * here composing the library `Icon` atom + tokens, faithful to the
 * reference. Flag for promotion into a future ui-components release so the
 * View Session page can drop this local copy.
 */

const LEVEL_ICON: Record<SessionTimelineLevel, IconName> = {
  info: 'play',
  tool: 'wrench',
  think: 'sparkles',
  ok: 'check',
  err: 'x',
  done: 'flag',
};

/** Node ink per level (18% tint over the bg, level colour as glyph ink).
    `think` uses fg2 — a theme-safe neutral, mirroring the reference. */
const NODE_TONE: Record<SessionTimelineLevel, string> = {
  info: 'text-info',
  tool: 'text-accent',
  think: 'text-fg2',
  ok: 'text-success',
  err: 'text-danger',
  done: 'text-primary',
};

const TEXT_TONE: Record<SessionTimelineLevel, string> = {
  info: 'font-mono font-medium',
  tool: 'font-mono font-medium',
  think: 'font-medium',
  ok: 'font-semibold',
  err: 'font-semibold',
  done: 'font-semibold',
};

export interface SessionTimelineProps {
  events: SessionTimelineEvent[];
  className?: string;
}

export const SessionTimeline = ({ events, className }: SessionTimelineProps) => (
  <div className={cn('relative pl-3.5', className)}>
    <div className="absolute bottom-1 left-[7px] top-1 w-px bg-border-soft" aria-hidden />
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {events.map((event, i) => (
        <li key={i} className="relative flex gap-3">
          <span
            className={cn(
              'absolute -left-3.5 top-1.5 flex size-3.5 items-center justify-center',
              'rounded-full border-2 border-bg',
              'bg-[color-mix(in_oklab,currentColor_18%,var(--bg))]',
              NODE_TONE[event.level],
            )}
            aria-hidden
          >
            <Icon name={(event.icon as IconName) ?? LEVEL_ICON[event.level]} size={8} />
          </span>
          <span className="w-[60px] shrink-0 pt-0.5 font-mono text-[11px] text-fg3">
            {event.time}
          </span>
          <div className="min-w-0 flex-1">
            <div className={cn('text-[13px] leading-[1.5] text-fg1', TEXT_TONE[event.level])}>
              {event.text}
            </div>
            {event.meta != null && (
              <div className="mt-0.5 font-mono text-[11px] text-fg3">{event.meta}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  </div>
);

SessionTimeline.displayName = 'SessionTimeline';
