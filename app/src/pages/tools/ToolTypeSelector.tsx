import type { IconName } from '@open-tomato/ui-components';

import { cn, Icon } from '@open-tomato/ui-components';

/**
 * ToolTypeSelector — a radiogroup of type cards on an auto-fit grid.
 *
 * CATALOG GAP: the WS04 `ToolTypeSelector` organism is not (yet) in the
 * published `@open-tomato/ui-components` catalog (v0.7.0). Rebuilt app-local
 * here (faithful to the reference: icon + name side by side, description
 * below, the selected card tints from the type's accent). Flag for
 * promotion so the Tools editor can drop this local copy.
 *
 * a11y ledger (deliberate gap, matches the reference): the radios use
 * per-option tab stops rather than roving-tabindex + arrow-key nav — NOT a
 * trap (every option is Tab+Enter reachable, `aria-checked` is correct).
 */

type ToolTypeTone = 'info' | 'accent' | 'primary';

export interface ToolTypeOption {
  value: string;
  label: string;
  description: string;
  icon: IconName;
  tone: ToolTypeTone;
}

export interface ToolTypeSelectorProps {
  options: ToolTypeOption[];
  value: string;
  onChange: (value: string) => void;
  /** Disable the whole group (Edit mode locks the static segment). */
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

/** Selected-card border + wash, per type accent (CVA-equivalent, kept local). */
const SELECTED_TINT: Record<ToolTypeTone, string> = {
  info: 'border-info bg-[color-mix(in_oklab,var(--info)_10%,var(--surface-1))]',
  accent: 'border-accent bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface-1))]',
  primary: 'border-primary bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface-1))]',
};

/** Icon-tile text color (drives the tile's currentColor-mix background). */
const TILE_TEXT: Record<ToolTypeTone, string> = {
  info: 'text-info',
  accent: 'text-accent',
  primary: 'text-primary',
};

export const ToolTypeSelector = ({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel = 'Tool type',
  className,
}: ToolTypeSelectorProps) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className={cn('grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2', className)}
  >
    {options.map((option) => {
      const selected = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex flex-col gap-1.5 rounded-md border p-3 text-left outline-none transition-colors duration-150',
            'focus-visible:border-border-focus',
            selected
              ? SELECTED_TINT[option.tone]
              : 'border-border-soft bg-surface-1 hover:bg-surface-sunk',
            disabled
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer',
          )}
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-[30px] shrink-0 items-center justify-center rounded-sm',
                'bg-[color-mix(in_oklab,currentColor_16%,transparent)]',
                TILE_TEXT[option.tone],
              )}
            >
              <Icon name={option.icon} size={16} />
            </span>
            <span className="min-w-0 truncate text-[13px] font-semibold text-fg1">
              {option.label}
            </span>
          </span>
          <span className="text-[11px] leading-[1.4] text-fg3">
            {option.description}
          </span>
        </button>
      );
    })}
  </div>
);

ToolTypeSelector.displayName = 'ToolTypeSelector';
