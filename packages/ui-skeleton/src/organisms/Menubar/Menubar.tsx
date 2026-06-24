import * as RadixMenubar from '@radix-ui/react-menubar';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  menubarContentVariants,
  menubarIconVariants,
  menubarItemVariants,
  menubarLabelVariants,
  menubarSeparatorVariants,
  menubarTriggerVariants,
  menubarVariants,
  type MenubarVariants,
} from './menubar.variants';

type RadixMenubarRootProps = React.ComponentPropsWithoutRef<
  typeof RadixMenubar.Root
>;
type RadixMenubarContentProps = React.ComponentPropsWithoutRef<
  typeof RadixMenubar.Content
>;

/**
 * Selectable row inside a menu's Content. Mirrors DropdownMenu's item
 * descriptor — `value` doubles as the React key and a stable `data-value`
 * selector. Collisions inside a single menu's items[] break the rendering
 * branch coverage.
 */
export interface MenubarItemEntry {
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

/** Decorative thin rule between sections inside a menu's Content. */
export interface MenubarSeparatorEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'separator';
}

/** Standalone section heading rendered inside a menu's Content. */
export interface MenubarMenuLabelEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'label';
  /** Visible heading text — Radix renders with `role="presentation"`. */
  label: React.ReactNode;
}

/**
 * Entries valid inside a group's `items` — groups deliberately do NOT nest
 * other groups (mirrors DropdownMenu) to keep the menu tree one level deep.
 */
export type MenubarLeafEntry =
  | MenubarItemEntry
  | MenubarSeparatorEntry
  | MenubarMenuLabelEntry;

/** Semantic group of items rendered under an optional heading. */
export interface MenubarGroupEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'group';
  /** Optional heading rendered above the group's items. */
  label?: React.ReactNode;
  /** Leaf items inside the group — groups cannot nest other groups. */
  items: MenubarLeafEntry[];
}

/**
 * Per-menu Content descriptor union. The required `type` discriminator
 * narrows each entry in `menu.items.map(...)` between item / separator /
 * label / group branches.
 */
export type MenubarMenuContentItem = MenubarLeafEntry | MenubarGroupEntry;

/**
 * Top-level menu descriptor. Each entry renders as a Radix `Menu` containing
 * a `Trigger` (the visible button in the bar) and a portaled `Content`
 * built from the nested `items` array.
 */
export interface MenubarMenuEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'menu';
  /** Stable identifier; used as the React key, `data-value` selector, and Radix Menu `value`. */
  value: string;
  /** Visible trigger label rendered in the bar. */
  label: React.ReactNode;
  /** Content entries for this menu's portaled dropdown. */
  items: MenubarMenuContentItem[];
  /**
   * Disables this menu's trigger. Radix marks the button with
   * `data-disabled` and skips it during roving-focus traversal.
   */
  disabled?: boolean;
  /**
   * Pass-through props for this menu's Radix Content (collision boundary,
   * focus handlers, escape-key handlers, side, align). `className` and
   * `children` are owned by the organism and excluded.
   */
  contentProps?: Omit<
    RadixMenubarContentProps,
    'className' | 'children'
  >;
}

/**
 * Root-level items[] descriptor union. Today this is just `MenubarMenuEntry`
 * — separators between top-level menus belong to future iterations once a
 * concrete use case appears.
 */
export type MenubarItem = MenubarMenuEntry;

/**
 * Menubar — items[]-driven organism that wraps `@radix-ui/react-menubar` for
 * a desktop-style application menu bar (File / Edit / View / ...). Each
 * top-level descriptor renders as a Radix `Menu` with its own trigger and
 * portaled Content built from a nested items[] array that mirrors
 * DropdownMenu's union shape.
 *
 * @remarks All visual customization flows through `size` and `density`.
 * There is no `className` escape hatch.
 *
 * Radix Menubar wires keyboard navigation between the top-level triggers
 * via a roving-focus group: `ArrowRight` / `ArrowLeft` cycle through the
 * triggers, `Home` / `End` jump to the first / last enabled trigger, and
 * once a trigger is open `ArrowDown` / `ArrowUp` move into the Content.
 *
 * Tests MUST scan `document.body` with axe, not `container` — Radix portals
 * the per-menu Content outside the bound render container and a
 * container-scoped scan misses the portaled DOM.
 *
 * @example
 * ```tsx
 * <Menubar
 *   items={[
 *     {
 *       type: 'menu',
 *       value: 'file',
 *       label: 'File',
 *       items: [
 *         { type: 'item', value: 'new', label: 'New' },
 *         { type: 'item', value: 'open', label: 'Open…' },
 *         { type: 'separator' },
 *         { type: 'item', value: 'save', label: 'Save' },
 *       ],
 *     },
 *     {
 *       type: 'menu',
 *       value: 'edit',
 *       label: 'Edit',
 *       items: [
 *         { type: 'label', label: 'Clipboard' },
 *         { type: 'item', value: 'cut', label: 'Cut' },
 *         { type: 'item', value: 'copy', label: 'Copy' },
 *         { type: 'item', value: 'paste', label: 'Paste' },
 *       ],
 *     },
 *   ]}
 * />
 * ```
 */
export interface MenubarProps
  extends Omit<RadixMenubarRootProps, 'children' | 'className'>,
  MenubarVariants {
  /** Top-level menu descriptors rendered horizontally in the bar. */
  items: MenubarItem[];
}

type ResolvedSize = NonNullable<MenubarVariants['size']>;
type ResolvedDensity = NonNullable<MenubarVariants['density']>;

const renderLeaf = (
  item: MenubarLeafEntry,
  index: number,
  size: ResolvedSize,
  density: ResolvedDensity,
): React.ReactNode => {
  if (item.type === 'separator') {
    return (
      <RadixMenubar.Separator
        key={`menubar-separator-${index}`}
        data-slot="menubar-separator"
        className={cn(menubarSeparatorVariants())}
      />
    );
  }
  if (item.type === 'label') {
    return (
      <RadixMenubar.Label
        key={`menubar-label-${index}`}
        data-slot="menubar-label"
        className={cn(menubarLabelVariants({ size }))}
      >
        {item.label}
      </RadixMenubar.Label>
    );
  }
  const iconClass = cn(menubarIconVariants({ size }));
  return (
    <RadixMenubar.Item
      key={item.value}
      disabled={item.disabled}
      onSelect={item.onSelect}
      data-slot="menubar-item"
      data-value={item.value}
      className={cn(menubarItemVariants({ size, density }))}
    >
      {item.leading !== undefined
        ? (
          <span
            aria-hidden
            data-slot="menubar-item-leading"
            className={iconClass}
          >
            {item.leading}
          </span>
        )
        : null}
      <span data-slot="menubar-item-label" className="flex-1">
        {item.label}
      </span>
      {item.trailing !== undefined
        ? (
          <span
            aria-hidden
            data-slot="menubar-item-trailing"
            className={iconClass}
          >
            {item.trailing}
          </span>
        )
        : null}
    </RadixMenubar.Item>
  );
};

const renderEntry = (
  item: MenubarMenuContentItem,
  index: number,
  size: ResolvedSize,
  density: ResolvedDensity,
): React.ReactNode => {
  if (item.type === 'group') {
    return (
      <RadixMenubar.Group
        key={`menubar-group-${index}`}
        data-slot="menubar-group"
      >
        {item.label !== undefined
          ? (
            <RadixMenubar.Label
              data-slot="menubar-group-label"
              className={cn(menubarLabelVariants({ size }))}
            >
              {item.label}
            </RadixMenubar.Label>
          )
          : null}
        {item.items.map((leaf, leafIndex) => renderLeaf(leaf, leafIndex, size, density))}
      </RadixMenubar.Group>
    );
  }
  return renderLeaf(item, index, size, density);
};

export const Menubar = React.forwardRef<HTMLDivElement, MenubarProps>(
  ({
    size,
    density,
    items,
    ...rest
  }, ref) => {
    const resolvedSize: ResolvedSize = size ?? 'md';
    const resolvedDensity: ResolvedDensity = density ?? 'comfortable';

    return (
      <RadixMenubar.Root
        ref={ref}
        data-slot="menubar-root"
        data-size={resolvedSize}
        data-density={resolvedDensity}
        className={cn(menubarVariants({
          size: resolvedSize,
          density: resolvedDensity,
        }))}
        {...rest}
      >
        {items.map((menu) => (
          <RadixMenubar.Menu key={menu.value} value={menu.value}>
            <RadixMenubar.Trigger
              disabled={menu.disabled}
              data-slot="menubar-trigger"
              data-value={menu.value}
              className={cn(menubarTriggerVariants({ size: resolvedSize }))}
            >
              {menu.label}
            </RadixMenubar.Trigger>
            <RadixMenubar.Portal>
              <RadixMenubar.Content
                data-slot="menubar-content"
                data-size={resolvedSize}
                data-density={resolvedDensity}
                data-menu-value={menu.value}
                className={cn(menubarContentVariants({
                  size: resolvedSize,
                  density: resolvedDensity,
                }))}
                {...menu.contentProps}
              >
                {menu.items.map((item, index) => renderEntry(item, index, resolvedSize, resolvedDensity))}
              </RadixMenubar.Content>
            </RadixMenubar.Portal>
          </RadixMenubar.Menu>
        ))}
      </RadixMenubar.Root>
    );
  },
);
Menubar.displayName = 'Menubar';
