import type { IconName } from '@open-tomato/ui-components';

import { cn, Icon, Touchable } from '@open-tomato/ui-components';

export interface SettingsNavItem {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  /** Admin-only sections (Integrations) are hidden for non-admins. */
  adminOnly?: boolean;
}

export interface SettingsNavProps {
  items: SettingsNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * SettingsNav — the Settings page's vertical sub-nav (spec: UI-Settings.md
 * "vertical navigation set of buttons … Rounded icon with background.
 * Double line row on the right with Title and Description"). App-local
 * composition built on the library `Touchable` — a Settings-shell concern,
 * and the full Settings surface is a separate future effort.
 *
 * Only the selected button carries decoration (surface-1 fill + soft
 * border + accent-tinted icon puck); the rest are undecorated with a
 * surface-sunk hover.
 */
export const SettingsNav = ({
  items,
  activeId,
  onSelect,
  className,
}: SettingsNavProps) => (
  <nav
    aria-label="Settings sections"
    className={cn('sticky top-6 flex flex-col gap-0.5', className)}
  >
    {items.map((item) => {
      const selected = item.id === activeId;
      return (
        <Touchable
          key={item.id}
          rounded="md"
          aria-current={selected
            ? 'page'
            : undefined}
          onClick={() => onSelect(item.id)}
          className={cn(
            'w-full items-start gap-3 border px-3.5 py-3 text-left',
            selected
              ? 'border-border-soft bg-surface-1'
              : 'border-transparent bg-transparent hover:bg-surface-sunk',
          )}
        >
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-sm',
              selected
                ? 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent'
                : 'bg-surface-sunk text-fg2',
            )}
          >
            <Icon name={item.icon} size={14} />
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                'block text-sm text-fg1',
                selected
                  ? 'font-bold'
                  : 'font-semibold',
              )}
            >
              {item.label}
            </span>
            <span className="mt-0.5 block text-[11px] leading-[1.4] text-fg3">
              {item.description}
            </span>
          </span>
        </Touchable>
      );
    })}
  </nav>
);

SettingsNav.displayName = 'SettingsNav';
