import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  dropdownMenuContentVariants,
  dropdownMenuIconVariants,
  dropdownMenuItemVariants,
  dropdownMenuLabelVariants,
  dropdownMenuSeparatorVariants,
  type DropdownMenuVariants,
} from './dropdown-menu.variants';

type RadixDropdownMenuRootProps = React.ComponentPropsWithoutRef<
  typeof RadixDropdownMenu.Root
>;
type RadixDropdownMenuContentProps = React.ComponentPropsWithoutRef<
  typeof RadixDropdownMenu.Content
>;

/**
 * Selectable row descriptor. `value` doubles as the React key, a stable
 * `data-value` selector, and the consumer's per-item identifier — collisions
 * inside a single items[] (including nested group items) break the rendering
 * branch coverage.
 */
export interface DropdownMenuItemEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'item';
  /** Stable identifier; used as the React key and `data-value` selector. */
  value: string;
  /** Visible row label. */
  label: React.ReactNode;
  /**
   * Leading slot (icon, avatar, badge). Rendered raw inside an
   * `aria-hidden` span sized by the `size` axis — the icon is decorative
   * because the row's accessible name comes from `label`.
   */
  leading?: React.ReactNode;
  /**
   * Trailing slot (kbd shortcut, chevron, badge). Decorative — same
   * accessible-name story as `leading`.
   */
  trailing?: React.ReactNode;
  /**
   * Disables this individual item. Radix renders it with `data-disabled`
   * and removes it from keyboard focus traversal.
   */
  disabled?: boolean;
  /**
   * Fires when the item is activated (click or Enter). Receives the native
   * Radix selection event so consumers can `event.preventDefault()` to
   * keep the menu open after activation.
   */
  onSelect?: (event: Event) => void;
}

/** Decorative thin rule between sections. */
export interface DropdownMenuSeparatorEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'separator';
}

/** Standalone section heading rendered at the root items[] level. */
export interface DropdownMenuLabelEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'label';
  /** Visible heading text — Radix renders with `role="presentation"`. */
  label: React.ReactNode;
}

/**
 * Entries valid inside a group's `items` — root-level groups are explicitly
 * not nested (the union below excludes `DropdownMenuGroupEntry`) so the
 * menu tree stays one level deep. Sub-menus belong to a future Sub-menu
 * organism rather than the items[] descriptor surface.
 */
export type DropdownMenuLeafEntry =
  | DropdownMenuItemEntry
  | DropdownMenuSeparatorEntry
  | DropdownMenuLabelEntry;

/** Semantic group of items rendered under an optional heading. */
export interface DropdownMenuGroupEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'group';
  /** Optional heading rendered above the group's items. */
  label?: React.ReactNode;
  /** Leaf items inside the group — groups cannot nest other groups. */
  items: DropdownMenuLeafEntry[];
}

/**
 * Root-level items[] descriptor union. The required `type` discriminator
 * narrows each entry in `items.map(...)` between item / separator / label /
 * group branches.
 */
export type DropdownMenuItem =
  | DropdownMenuLeafEntry
  | DropdownMenuGroupEntry;

/**
 * DropdownMenu — portal-based, items[]-driven organism that wraps
 * `@radix-ui/react-dropdown-menu` for a click-triggered action menu. Pairs
 * a consumer-supplied `trigger` with a portaled Content rendering each
 * descriptor in the discriminated items[] union as the matching Radix
 * sub-component.
 *
 * @remarks All visual customization flows through `size`, `align`, and
 * `side`. There is no `className` escape hatch. `align` and `side` map
 * directly to Radix Content's `align` / `side` props — Radix may flip them
 * after collision detection, and the resolved value is reflected on the
 * Content as `data-side` / `data-align`. The organism mirrors the
 * consumer-supplied prop values on the same element so tests can assert
 * propagation independently of Radix's post-collision math.
 *
 * `trigger` is wrapped internally via `<RadixDropdownMenu.Trigger asChild>` —
 * pass a `Button` atom (or any single React element with an accessible
 * name) so Radix can project its event handlers and ARIA attributes.
 *
 * Radix renders the Content with `role="menu"` and each enabled item with
 * `role="menuitem"`. Tests MUST scan `document.body` with axe, not
 * `container` — Radix portals into `document.body` and a container-scoped
 * scan misses the portaled Content.
 *
 * @example
 * ```tsx
 * <DropdownMenu
 *   trigger={<Button>Open menu</Button>}
 *   items={[
 *     { type: 'label', label: 'Account' },
 *     { type: 'item', value: 'profile', label: 'Profile' },
 *     { type: 'item', value: 'settings', label: 'Settings' },
 *     { type: 'separator' },
 *     {
 *       type: 'group',
 *       label: 'Workspace',
 *       items: [
 *         { type: 'item', value: 'invite', label: 'Invite user' },
 *         { type: 'item', value: 'team', label: 'Team', disabled: true },
 *       ],
 *     },
 *   ]}
 * />
 *
 * <DropdownMenu
 *   size="lg"
 *   side="right"
 *   align="start"
 *   trigger={<Button variant="ghost">More</Button>}
 *   items={[
 *     { type: 'item', value: 'edit', label: 'Edit', onSelect: handleEdit },
 *     { type: 'item', value: 'delete', label: 'Delete', onSelect: handleDelete },
 *   ]}
 * />
 * ```
 */
export interface DropdownMenuProps
  extends Omit<RadixDropdownMenuRootProps, 'children'>,
  DropdownMenuVariants {
  /**
   * Trigger element wrapped internally via Radix Trigger `asChild`. Must be
   * a single React element — fragments, strings, arrays, or `null` throw
   * at runtime when Radix calls `React.cloneElement` on the slot.
   */
  trigger: React.ReactElement;
  /**
   * Discriminated items[] union rendered into the portaled Content. The
   * required `type` tag selects between item / separator / label / group
   * rendering branches.
   */
  items: DropdownMenuItem[];
  /**
   * Pass-through props for the underlying Radix Content (collision
   * boundary, side offsets, focus handlers, etc.). `className`,
   * `children`, `side`, and `align` are owned by the organism and excluded.
   */
  contentProps?: Omit<
    RadixDropdownMenuContentProps,
    'className' | 'children' | 'side' | 'align'
  >;
}

type ResolvedSize = NonNullable<DropdownMenuVariants['size']>;

const renderLeaf = (
  item: DropdownMenuLeafEntry,
  index: number,
  size: ResolvedSize,
): React.ReactNode => {
  if (item.type === 'separator') {
    return (
      <RadixDropdownMenu.Separator
        key={`dropdown-menu-separator-${index}`}
        data-slot="dropdown-menu-separator"
        className={cn(dropdownMenuSeparatorVariants())}
      />
    );
  }
  if (item.type === 'label') {
    return (
      <RadixDropdownMenu.Label
        key={`dropdown-menu-label-${index}`}
        data-slot="dropdown-menu-label"
        className={cn(dropdownMenuLabelVariants({ size }))}
      >
        {item.label}
      </RadixDropdownMenu.Label>
    );
  }
  const iconClass = cn(dropdownMenuIconVariants({ size }));
  return (
    <RadixDropdownMenu.Item
      key={item.value}
      disabled={item.disabled}
      onSelect={item.onSelect}
      data-slot="dropdown-menu-item"
      data-value={item.value}
      className={cn(dropdownMenuItemVariants({ size }))}
    >
      {item.leading !== undefined
        ? (
          <span
            aria-hidden
            data-slot="dropdown-menu-item-leading"
            className={iconClass}
          >
            {item.leading}
          </span>
        )
        : null}
      <span data-slot="dropdown-menu-item-label" className="flex-1">
        {item.label}
      </span>
      {item.trailing !== undefined
        ? (
          <span
            aria-hidden
            data-slot="dropdown-menu-item-trailing"
            className={iconClass}
          >
            {item.trailing}
          </span>
        )
        : null}
    </RadixDropdownMenu.Item>
  );
};

const renderEntry = (
  item: DropdownMenuItem,
  index: number,
  size: ResolvedSize,
): React.ReactNode => {
  if (item.type === 'group') {
    return (
      <RadixDropdownMenu.Group
        key={`dropdown-menu-group-${index}`}
        data-slot="dropdown-menu-group"
      >
        {item.label !== undefined
          ? (
            <RadixDropdownMenu.Label
              data-slot="dropdown-menu-group-label"
              className={cn(dropdownMenuLabelVariants({ size }))}
            >
              {item.label}
            </RadixDropdownMenu.Label>
          )
          : null}
        {item.items.map((leaf, leafIndex) => renderLeaf(leaf, leafIndex, size))}
      </RadixDropdownMenu.Group>
    );
  }
  return renderLeaf(item, index, size);
};

export const DropdownMenu = React.forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({
    size,
    align,
    side,
    trigger,
    items,
    contentProps,
    ...rest
  }, ref) => {
    const resolvedSize: ResolvedSize = size ?? 'md';
    const resolvedAlign: NonNullable<DropdownMenuVariants['align']> = align ?? 'center';
    const resolvedSide: NonNullable<DropdownMenuVariants['side']> = side ?? 'bottom';

    return (
      <RadixDropdownMenu.Root {...rest}>
        <RadixDropdownMenu.Trigger asChild>{trigger}</RadixDropdownMenu.Trigger>
        <RadixDropdownMenu.Portal>
          <RadixDropdownMenu.Content
            ref={ref}
            side={resolvedSide}
            align={resolvedAlign}
            data-slot="dropdown-menu-content"
            data-size={resolvedSize}
            data-align={resolvedAlign}
            data-side={resolvedSide}
            className={cn(dropdownMenuContentVariants({
              size: resolvedSize,
              align: resolvedAlign,
              side: resolvedSide,
            }))}
            {...contentProps}
          >
            {items.map((item, index) => renderEntry(item, index, resolvedSize))}
          </RadixDropdownMenu.Content>
        </RadixDropdownMenu.Portal>
      </RadixDropdownMenu.Root>
    );
  },
);
DropdownMenu.displayName = 'DropdownMenu';
