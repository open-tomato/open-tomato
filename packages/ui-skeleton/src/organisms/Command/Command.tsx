import {
  Command as CmdkRoot,
  CommandEmpty as CmdkEmpty,
  CommandGroup as CmdkGroup,
  CommandInput as CmdkInput,
  CommandItem as CmdkItem,
  CommandList as CmdkList,
  CommandSeparator as CmdkSeparator,
} from 'cmdk';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  commandEmptyVariants,
  commandGroupVariants,
  commandIconVariants,
  commandInputControlVariants,
  commandInputWrapperVariants,
  commandItemVariants,
  commandListVariants,
  commandSeparatorVariants,
  commandShortcutVariants,
  commandVariants,
  type CommandVariants,
} from './command.variants';

type CmdkRootProps = React.ComponentPropsWithoutRef<typeof CmdkRoot>;

/**
 * Selectable command row descriptor. `value` doubles as the React key, a
 * stable `data-value` selector on the rendered cmdk Item, and the string
 * cmdk's filter scores against (along with `keywords`). Collisions inside a
 * single items[] (including nested group items) break the cmdk selection
 * model — keep `value` unique across the whole tree.
 */
export interface CommandItemEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'item';
  /** Stable identifier scored by cmdk's filter; React key + `data-value`. */
  value: string;
  /** Visible row label. */
  label: React.ReactNode;
  /**
   * Extra strings scored by cmdk's filter alongside `value`. Useful for
   * aliases ("logout" matching "sign out") and i18n synonyms.
   */
  keywords?: string[];
  /**
   * Leading slot (icon, avatar, badge). Rendered raw inside an
   * `aria-hidden` span sized by the `size` axis — the icon is decorative
   * because the row's accessible name comes from `label`.
   */
  leading?: React.ReactNode;
  /**
   * Trailing slot (badge, status indicator). Decorative — same
   * accessible-name story as `leading`. For keyboard-shortcut hints use
   * the `shortcut` field instead so the styling stays consistent.
   */
  trailing?: React.ReactNode;
  /**
   * Keyboard-shortcut hint rendered as a decorative right-aligned span
   * (e.g. `'⌘K'`, `'Ctrl+P'`). `aria-hidden` because the row's
   * accessible name already comes from `label`. Mutually independent of
   * `trailing` — both render when supplied.
   */
  shortcut?: React.ReactNode;
  /**
   * Disables this individual item. cmdk renders it with `data-disabled`
   * and skips it during keyboard traversal.
   */
  disabled?: boolean;
  /**
   * Fires when the row is activated (click or Enter). Receives the
   * descriptor's `value` so consumers can switch on a single argument.
   */
  onSelect?: (value: string) => void;
}

/** Decorative thin rule between sections at the root or inside a group. */
export interface CommandSeparatorEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'separator';
}

/**
 * Entries valid inside a group's `items` — groups deliberately do NOT nest
 * other groups (mirrors DropdownMenu / Menubar) so the command tree stays
 * one level deep. `empty` is a top-level-only descriptor and is excluded
 * here.
 */
export type CommandLeafEntry = CommandItemEntry | CommandSeparatorEntry;

/** Semantic group of items rendered under a heading. */
export interface CommandGroupEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'group';
  /** Visible heading rendered above the group's items by cmdk. */
  heading: React.ReactNode;
  /** Leaf items inside the group — groups cannot nest other groups. */
  items: CommandLeafEntry[];
}

/**
 * Empty-state descriptor for the "no results" message rendered by cmdk
 * when the active search query matches no items. cmdk auto-renders /
 * unmounts this element based on the filter — the descriptor is the
 * organism's way of letting consumers customize the label.
 */
export interface CommandEmptyEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'empty';
  /** Visible message rendered when no items match the search query. */
  label: React.ReactNode;
}

/**
 * Root-level items[] descriptor union. The required `type` tag narrows
 * each entry between item / separator / group / empty branches.
 */
export type CommandItem =
  | CommandItemEntry
  | CommandSeparatorEntry
  | CommandGroupEntry
  | CommandEmptyEntry;

/**
 * Command — stateful items[]-driven organism that wraps `cmdk` for a
 * type-ahead command palette. Composes the Input atom's control surface
 * (via `commandInputControlVariants` mirroring the atom's
 * `inputControlVariants` — see InputGroup's
 * compose-atom-primitives-not-the-atom-component pattern in
 * `skills/organism-authoring/SKILL.md`) for the search field, then renders
 * a scrollable list below the search row built from the discriminated
 * items[] union.
 *
 * @remarks All visual customization flows through the single `size` axis.
 * There is no `className` escape hatch. cmdk owns the filter +
 * keyboard-selection state internally (`ArrowUp` / `ArrowDown` to traverse,
 * `Enter` to activate, type-ahead to filter); the organism's optional
 * `search` / `defaultSearch` / `onSearchChange` and `value` / `defaultValue`
 * / `onValueChange` props expose the controlled-passthrough surface on top.
 *
 * The `empty` descriptor renders the cmdk CommandEmpty element, which
 * cmdk mounts / unmounts based on whether the filter has zero matches —
 * the organism does not need to compute this manually.
 *
 * @example
 * ```tsx
 * <Command
 *   placeholder="Type a command…"
 *   items={[
 *     { type: 'empty', label: 'No results found.' },
 *     {
 *       type: 'group',
 *       heading: 'Suggestions',
 *       items: [
 *         { type: 'item', value: 'profile', label: 'Profile', shortcut: '⌘P' },
 *         { type: 'item', value: 'settings', label: 'Settings', shortcut: '⌘,' },
 *       ],
 *     },
 *     { type: 'separator' },
 *     {
 *       type: 'group',
 *       heading: 'Workspace',
 *       items: [
 *         {
 *           type: 'item',
 *           value: 'logout',
 *           label: 'Sign out',
 *           keywords: ['logout', 'exit'],
 *           shortcut: '⇧⌘Q',
 *         },
 *       ],
 *     },
 *   ]}
 *   onItemSelect={(value) => console.log('selected', value)}
 * />
 * ```
 */
export interface CommandProps
  extends Omit<
    CmdkRootProps,
    | 'children'
    | 'className'
    | 'value'
    | 'defaultValue'
    | 'onValueChange'
  >,
  CommandVariants {
  /** Items rendered into the cmdk list. */
  items: CommandItem[];
  /**
   * Placeholder for the search input. Falls back to the cmdk default if
   * omitted.
   */
  placeholder?: string;
  /**
   * Accessible label for the cmdk root — forwarded to cmdk's `label`
   * prop. Falls back to `'Command palette'` so the role is always named.
   */
  label?: string;
  /** Controlled search query. Pair with `onSearchChange`. */
  search?: string;
  /** Uncontrolled initial search query. */
  defaultSearch?: string;
  /** Fires when the search query changes. */
  onSearchChange?: (search: string) => void;
  /**
   * Hides the search input row. When `false`, the root becomes a static
   * list of items — useful when the filter runs in an outer host.
   * Defaults to `true`.
   */
  showSearch?: boolean;
  /** Disables the search input. */
  searchDisabled?: boolean;
  /** Controlled focused item value. Pair with `onItemValueChange`. */
  value?: string;
  /** Uncontrolled initial focused item value. */
  defaultValue?: string;
  /** Fires when the focused item changes (cmdk's `onValueChange`). */
  onItemValueChange?: (value: string) => void;
  /**
   * Convenience callback fired when any item is activated — the
   * per-descriptor `onSelect` still fires first and remains the primary
   * surface for per-item handlers.
   */
  onItemSelect?: (value: string) => void;
}

type ResolvedSize = NonNullable<CommandVariants['size']>;

const renderLeaf = (
  item: CommandLeafEntry,
  index: number,
  size: ResolvedSize,
  onItemSelect: ((value: string) => void) | undefined,
): React.ReactNode => {
  if (item.type === 'separator') {
    return (
      <CmdkSeparator
        key={`command-separator-${index}`}
        data-slot="command-separator"
        className={cn(commandSeparatorVariants())}
      />
    );
  }
  const iconClass = cn(commandIconVariants({ size }));
  const handleSelect = (selectedValue: string): void => {
    item.onSelect?.(selectedValue);
    onItemSelect?.(selectedValue);
  };
  return (
    <CmdkItem
      key={item.value}
      value={item.value}
      keywords={item.keywords}
      disabled={item.disabled}
      onSelect={handleSelect}
      data-slot="command-item"
      data-value={item.value}
      className={cn(commandItemVariants({ size }))}
    >
      {item.leading !== undefined
        ? (
          <span
            aria-hidden
            data-slot="command-item-leading"
            className={iconClass}
          >
            {item.leading}
          </span>
        )
        : null}
      <span data-slot="command-item-label" className="flex-1">
        {item.label}
      </span>
      {item.trailing !== undefined
        ? (
          <span
            aria-hidden
            data-slot="command-item-trailing"
            className={iconClass}
          >
            {item.trailing}
          </span>
        )
        : null}
      {item.shortcut !== undefined
        ? (
          <span
            aria-hidden
            data-slot="command-item-shortcut"
            className={cn(commandShortcutVariants({ size }))}
          >
            {item.shortcut}
          </span>
        )
        : null}
    </CmdkItem>
  );
};

const renderEntry = (
  item: CommandItem,
  index: number,
  size: ResolvedSize,
  onItemSelect: ((value: string) => void) | undefined,
): React.ReactNode => {
  if (item.type === 'group') {
    return (
      <CmdkGroup
        key={`command-group-${index}`}
        heading={item.heading}
        data-slot="command-group"
        className={cn(commandGroupVariants({ size }))}
      >
        {item.items.map((leaf, leafIndex) => renderLeaf(leaf, leafIndex, size, onItemSelect))}
      </CmdkGroup>
    );
  }
  if (item.type === 'empty') {
    return (
      <CmdkEmpty
        key={`command-empty-${index}`}
        data-slot="command-empty"
        className={cn(commandEmptyVariants({ size }))}
      >
        {item.label}
      </CmdkEmpty>
    );
  }
  return renderLeaf(item, index, size, onItemSelect);
};

export const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({
    size,
    items,
    placeholder,
    label,
    search,
    defaultSearch,
    onSearchChange,
    showSearch,
    searchDisabled,
    value,
    defaultValue,
    onItemValueChange,
    onItemSelect,
    ...rest
  }, ref) => {
    const resolvedSize: ResolvedSize = size ?? 'md';
    const resolvedShowSearch = showSearch ?? true;
    const resolvedLabel = label ?? 'Command palette';

    const isSearchControlled = search !== undefined;
    const [uncontrolledSearch, setUncontrolledSearch] = React.useState<string>(
      defaultSearch ?? '',
    );
    const resolvedSearch = isSearchControlled
      ? search
      : uncontrolledSearch;
    const handleSearchChange = (next: string): void => {
      if (!isSearchControlled) setUncontrolledSearch(next);
      onSearchChange?.(next);
    };

    const isValueControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(
      defaultValue ?? '',
    );
    const resolvedValue = isValueControlled
      ? value
      : uncontrolledValue;
    const handleValueChange = (next: string): void => {
      if (!isValueControlled) setUncontrolledValue(next);
      onItemValueChange?.(next);
    };

    return (
      <CmdkRoot
        ref={ref}
        label={resolvedLabel}
        value={resolvedValue}
        onValueChange={handleValueChange}
        data-slot="command-root"
        data-size={resolvedSize}
        className={cn(commandVariants({ size: resolvedSize }))}
        {...rest}
      >
        {resolvedShowSearch
          ? (
            <div
              data-slot="command-input-wrapper"
              className={cn(commandInputWrapperVariants({ size: resolvedSize }))}
            >
              <CmdkInput
                value={resolvedSearch}
                onValueChange={handleSearchChange}
                placeholder={placeholder}
                disabled={searchDisabled}
                data-slot="command-input"
                className={cn(commandInputControlVariants())}
              />
            </div>
          )
          : null}
        <CmdkList
          data-slot="command-list"
          className={cn(commandListVariants({ size: resolvedSize }))}
        >
          {items.map((item, index) => renderEntry(item, index, resolvedSize, onItemSelect))}
        </CmdkList>
      </CmdkRoot>
    );
  },
);
Command.displayName = 'Command';
