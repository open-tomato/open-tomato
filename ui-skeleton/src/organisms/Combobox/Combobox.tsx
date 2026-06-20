import * as React from 'react';

import { Input } from '@/atoms/Input';
import { Popover } from '@/molecules/Popover';
import { cn } from '@/particles/cn';

import {
  comboboxEmptyVariants,
  comboboxIconVariants,
  comboboxListVariants,
  comboboxOptionVariants,
  comboboxSearchWrapperVariants,
  comboboxTriggerVariants,
  type ComboboxVariants,
} from './combobox.variants';

/**
 * Selectable Combobox row descriptor. `value` doubles as the React key, the
 * `data-value` selector on the rendered option, and the `onValueChange`
 * payload — collisions inside a single items[] break selection.
 */
export interface ComboboxItem {
  /** Stable identifier — React key + onValueChange payload. */
  value: string;
  /**
   * Visible label rendered both in the option row and inside the trigger
   * when the row is selected. Filtering matches against `label` only when
   * it's a string; otherwise use `keywords` to expose synonyms to the
   * search.
   */
  label: React.ReactNode;
  /**
   * Extra strings scored by the filter alongside `value` and a string
   * `label`. Useful for aliases ("logout" matching "sign out") and i18n
   * synonyms.
   */
  keywords?: string[];
  /**
   * Disables this individual row — skipped during keyboard traversal,
   * cannot be selected, and rendered with `data-disabled="true"`.
   */
  disabled?: boolean;
}

/**
 * Combobox — stateful organism composing the Popover molecule (open / close
 * + portaled surface) and the Input atom (type-ahead search field), then
 * rendering a native `<ul role="listbox">` of `<li role="option">` rows
 * filtered against the current search query. Single-select with controlled
 * and uncontrolled `value` / `defaultValue` / `onValueChange` shapes.
 *
 * @remarks All visual customization flows through the single `size` axis,
 * which propagates to the composed Popover (`popover.size`), Input
 * (`input.size`), and every internal subpart cva. There is no `className`
 * escape hatch.
 *
 * Owns three internal states via controlled-passthrough: the open state
 * (passed through to the composed Popover), the search query (always
 * internal — resets when the popover closes), and the keyboard-focused
 * option value (resets when the search query or filtered list changes).
 * Selecting an option fires `onValueChange` with the row's `value` and
 * closes the popover.
 *
 * @example
 * ```tsx
 * <Combobox
 *   placeholder="Pick a framework"
 *   searchPlaceholder="Search frameworks…"
 *   emptyMessage="No framework found."
 *   items={[
 *     { value: 'next', label: 'Next.js' },
 *     { value: 'remix', label: 'Remix' },
 *     { value: 'astro', label: 'Astro', keywords: ['static', 'ssg'] },
 *     { value: 'gatsby', label: 'Gatsby', disabled: true },
 *   ]}
 *   onValueChange={(value) => console.log(value)}
 * />
 *
 * <Combobox
 *   size="lg"
 *   value={value}
 *   onValueChange={setValue}
 *   items={items}
 * />
 * ```
 */
export interface ComboboxProps extends ComboboxVariants {
  /** Rows rendered into the filterable listbox. */
  items: ComboboxItem[];
  /** Controlled selected value. Pair with `onValueChange`. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Fires when the selected value changes. */
  onValueChange?: (value: string) => void;
  /**
   * Trigger placeholder rendered inside the button when no value is
   * selected. Tinted via the wrapper-frame's `data-placeholder` selector.
   */
  placeholder?: React.ReactNode;
  /** Placeholder for the search Input inside the portaled popover. */
  searchPlaceholder?: string;
  /**
   * Message rendered when no items match the active search query. Falls
   * back to a literal `'No results found.'` so the listbox never collapses
   * to an empty surface without an explanation.
   */
  emptyMessage?: React.ReactNode;
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  /** Fires when the popover open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Disables the trigger button. */
  disabled?: boolean;
  /**
   * Override the auto-generated base id used for the trigger button and the
   * listbox's `aria-controls` wiring. Defaults to a `React.useId()`-derived
   * value.
   */
  id?: string;
  /**
   * Accessible label for the trigger button. Forwarded to the listbox's
   * `aria-label` as well so the listbox role always has a name.
   */
  'aria-label'?: string;
}

type ResolvedSize = NonNullable<ComboboxVariants['size']>;

const inputSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const popoverSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;

/**
 * Pure helper exported for unit testing. Returns true when the query is
 * empty OR the item's value, string label, or any keyword contains the
 * normalized query as a case-insensitive substring.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const matchesQuery = (item: ComboboxItem, query: string): boolean => {
  if (query.length === 0) return true;
  const normalized = query.toLowerCase();
  if (item.value.toLowerCase().includes(normalized)) return true;
  if (typeof item.label === 'string'
    && item.label.toLowerCase().includes(normalized)) return true;
  if (item.keywords?.some((k) => k.toLowerCase().includes(normalized))) return true;
  return false;
};

const ChevronsUpDownIcon = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </svg>
);

const CheckIcon = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      size,
      items,
      value,
      defaultValue,
      onValueChange,
      placeholder,
      searchPlaceholder,
      emptyMessage,
      open,
      defaultOpen,
      onOpenChange,
      disabled,
      id,
      'aria-label': ariaLabel,
    },
    ref,
  ) => {
    const resolvedSize: ResolvedSize = size ?? 'md';
    const autoId = React.useId();
    const baseId = id ?? autoId;
    const listboxId = `${baseId}-listbox`;
    const optionId = (val: string): string => `${baseId}-option-${val}`;

    const isValueControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string | undefined>(
      defaultValue,
    );
    const resolvedValue = isValueControlled
      ? value
      : uncontrolledValue;

    const isOpenControlled = open !== undefined;
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(
      defaultOpen ?? false,
    );
    const resolvedOpen = isOpenControlled
      ? open
      : uncontrolledOpen;

    const [searchQuery, setSearchQuery] = React.useState<string>('');

    const filteredItems = React.useMemo(
      () => items.filter((item) => matchesQuery(item, searchQuery)),
      [items, searchQuery],
    );

    const firstEnabledFilteredValue = React.useMemo(
      () => filteredItems.find((it) => !it.disabled)?.value,
      [filteredItems],
    );

    // Derive focus state during render rather than via useEffect: whenever the
    // first enabled filtered value changes, snap the keyboard focus to it. See
    // https://react.dev/reference/react/useState#storing-information-from-previous-renders.
    const [focusedValue, setFocusedValue] = React.useState<string | undefined>(
      firstEnabledFilteredValue,
    );
    const [prevFirstEnabledFilteredValue, setPrevFirstEnabledFilteredValue]
      = React.useState<string | undefined>(firstEnabledFilteredValue);
    if (prevFirstEnabledFilteredValue !== firstEnabledFilteredValue) {
      setPrevFirstEnabledFilteredValue(firstEnabledFilteredValue);
      setFocusedValue(firstEnabledFilteredValue);
    }

    const searchInputRef = React.useRef<HTMLInputElement>(null);

    const handleOpenChange = (next: boolean): void => {
      if (!isOpenControlled) setUncontrolledOpen(next);
      if (!next) {
        setSearchQuery('');
        setFocusedValue(undefined);
      }
      onOpenChange?.(next);
    };

    const handleSelectValue = (next: string): void => {
      if (!isValueControlled) setUncontrolledValue(next);
      onValueChange?.(next);
      handleOpenChange(false);
    };

    const handleSearchKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>,
    ): void => {
      const enabledItems = filteredItems.filter((it) => !it.disabled);
      if (enabledItems.length === 0) {
        if (event.key === 'Enter') event.preventDefault();
        return;
      }
      const focusedIndex = focusedValue !== undefined
        ? enabledItems.findIndex((it) => it.value === focusedValue)
        : -1;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = focusedIndex < enabledItems.length - 1
          ? focusedIndex + 1
          : 0;
        setFocusedValue(enabledItems[nextIndex]?.value);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex = focusedIndex > 0
          ? focusedIndex - 1
          : enabledItems.length - 1;
        setFocusedValue(enabledItems[nextIndex]?.value);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (focusedValue !== undefined) {
          handleSelectValue(focusedValue);
        }
      } else if (event.key === 'Home') {
        event.preventDefault();
        setFocusedValue(enabledItems[0]?.value);
      } else if (event.key === 'End') {
        event.preventDefault();
        setFocusedValue(enabledItems[enabledItems.length - 1]?.value);
      }
    };

    const handleOpenAutoFocus = (event: Event): void => {
      event.preventDefault();
      searchInputRef.current?.focus();
    };

    const selectedItem = items.find((it) => it.value === resolvedValue);
    const hasSelection = selectedItem !== undefined;
    const triggerLabel = hasSelection
      ? selectedItem.label
      : placeholder;
    const activeDescendant = focusedValue !== undefined
      ? optionId(focusedValue)
      : undefined;

    const triggerElement = (
      <button
        ref={ref}
        id={baseId}
        type="button"
        role="combobox"
        aria-controls={resolvedOpen
          ? listboxId
          : undefined}
        aria-expanded={resolvedOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-activedescendant={resolvedOpen
          ? activeDescendant
          : undefined}
        disabled={disabled}
        data-slot="combobox-trigger"
        data-size={resolvedSize}
        data-state={resolvedOpen
          ? 'open'
          : 'closed'}
        data-placeholder={hasSelection
          ? undefined
          : 'true'}
        className={comboboxTriggerVariants({ size: resolvedSize })}
      >
        <span data-slot="combobox-trigger-value">{triggerLabel}</span>
        <span
          aria-hidden
          data-slot="combobox-trigger-chevron"
          className={cn(comboboxIconVariants({ size: resolvedSize }), 'opacity-50')}
        >
          <ChevronsUpDownIcon />
        </span>
      </button>
    );

    const listboxLabel = ariaLabel ?? 'Suggestions';
    const hasResults = filteredItems.length > 0;
    const resolvedEmptyMessage = emptyMessage ?? 'No results found.';

    return (
      <Popover
        open={resolvedOpen}
        onOpenChange={handleOpenChange}
        size={popoverSizeForSize[resolvedSize]}
        trigger={triggerElement}
        contentProps={{
          onOpenAutoFocus: handleOpenAutoFocus,
          'aria-label': listboxLabel,
        }}
      >
        <div
          data-slot="combobox-search"
          className={cn(comboboxSearchWrapperVariants())}
        >
          <Input
            ref={searchInputRef}
            type="search"
            size={inputSizeForSize[resolvedSize]}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
            aria-label={searchPlaceholder ?? 'Search'}
            data-slot="combobox-search-input"
          />
        </div>
        {hasResults
          ? (
            <ul
              id={listboxId}
              role="listbox"
              aria-label={listboxLabel}
              data-slot="combobox-list"
              data-size={resolvedSize}
              className={cn(comboboxListVariants({ size: resolvedSize }))}
            >
              {filteredItems.map((item) => {
                const isSelected = resolvedValue === item.value;
                const isFocused = focusedValue === item.value;
                const isDisabled = item.disabled ?? false;
                return (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- aria-activedescendant pattern parks focus on the search Input; keyboard activation lives there (Enter handler in handleSearchKeyDown), not per-option.
                  <li
                    key={item.value}
                    id={optionId(item.value)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={isDisabled
                      ? true
                      : undefined}
                    data-slot="combobox-option"
                    data-value={item.value}
                    data-focused={isFocused
                      ? 'true'
                      : 'false'}
                    data-disabled={isDisabled
                      ? 'true'
                      : 'false'}
                    data-selected={isSelected
                      ? 'true'
                      : 'false'}
                    onClick={() => {
                      if (!isDisabled) handleSelectValue(item.value);
                    }}
                    onMouseEnter={() => {
                      if (!isDisabled) setFocusedValue(item.value);
                    }}
                    className={cn(comboboxOptionVariants({ size: resolvedSize }))}
                  >
                    <span
                      data-slot="combobox-option-label"
                      className="flex-1 truncate"
                    >
                      {item.label}
                    </span>
                    {isSelected
                      ? (
                        <span
                          aria-hidden
                          data-slot="combobox-option-indicator"
                          className={cn(comboboxIconVariants({ size: resolvedSize }))}
                        >
                          <CheckIcon />
                        </span>
                      )
                      : null}
                  </li>
                );
              })}
            </ul>
          )
          : (
            <div
              data-slot="combobox-empty"
              className={cn(comboboxEmptyVariants({ size: resolvedSize }))}
              role="status"
              aria-live="polite"
            >
              {resolvedEmptyMessage}
            </div>
          )}
      </Popover>
    );
  },
);
Combobox.displayName = 'Combobox';
