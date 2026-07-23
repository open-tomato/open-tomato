import type { ReactNode } from 'react';

import { Touchable, cn } from '@open-tomato/ui-components';

export interface FilterBadgeProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  /** Count shown as a greyed mono suffix. */
  count?: number;
  /** Leading decoration — a type icon or status dot. */
  decoration?: ReactNode;
}

/**
 * FilterBadge — the selectable count-pill used by the Sessions status
 * quick-filters (with a StatusIndicator decoration) and the Agents filter
 * row. Composed page-side from the library `Touchable`.
 *
 * CATALOG GAP: the WS04 references shipped this as two separate page-local
 * pills (`StatusPill` + `FilterBadge`); consolidated here into one, and
 * flagged for promotion into a library `FilterChip` primitive so the two
 * surfaces cannot drift.
 */
export const FilterBadge = ({
  selected,
  onClick,
  label,
  count,
  decoration,
}: FilterBadgeProps) => (
  <Touchable
    inline
    rounded="full"
    aria-pressed={selected}
    onClick={onClick}
    className={cn(
      'gap-[7px] border px-3 py-[5px] text-xs font-semibold text-fg1',
      selected
        ? 'border-border-strong bg-surface-sunk'
        : 'border-border-soft bg-transparent',
    )}
  >
    {decoration != null && (
      <span className="inline-flex shrink-0 items-center text-fg3">{decoration}</span>
    )}
    <span>{label}</span>
    {count != null && (
      <span className="font-mono text-[11px] font-normal text-fg3">{count}</span>
    )}
  </Touchable>
);

FilterBadge.displayName = 'FilterBadge';
