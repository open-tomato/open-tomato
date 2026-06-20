import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/atoms/Button';
import { Popover } from '@/molecules/Popover';
import { Calendar } from '@/organisms/Calendar';

import {
  datePickerVariants,
  type DatePickerVariants,
} from './date-picker.variants';

type ResolvedSize = NonNullable<DatePickerVariants['size']>;

/**
 * Direct passthrough lookup table from the DatePicker's `size` axis to the
 * composed Button atom's `size` axis. The two axes share the same union shape
 * so the mapping is trivially identity — kept as an explicit table to match
 * the canonical template-authoring lookup-table pattern and to surface any
 * future axis divergence at compile time.
 */
const buttonSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;

/**
 * Direct passthrough lookup table from `size` to the composed Popover
 * molecule's `size` axis. Drives the portaled surface's width via Popover's
 * own cva (sm → w-56, md → w-72, lg → w-96).
 */
const popoverSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;

/**
 * Direct passthrough lookup table from `size` to the composed Calendar
 * organism's `size` axis. Drives every per-cell subpart (caption label,
 * navigation button, weekday header, day button, footer) via Calendar's own
 * cva.
 */
const calendarSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;

const defaultFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });
const defaultFormat = (date: Date): string => defaultFormatter.format(date);

/**
 * DatePicker — compound-widget template composing the Popover molecule
 * (open / close + portaled surface) with the Calendar organism (date grid)
 * to expose a single date-selection control. The trigger renders a Button
 * atom decorated with a calendar icon plus either the formatted selected
 * date or a placeholder; clicking opens a popover containing the Calendar in
 * `mode="single"`; selecting a day fires `onValueChange`, closes the
 * popover, and surfaces the formatted date on the trigger.
 *
 * @remarks
 * DatePicker lives at the template layer (rather than the organism layer)
 * because the organism-composes-organism guard forbids Calendar (organism) +
 * Popover (molecule) composition from inside an organism. Promoting to the
 * template layer is the sanctioned escape and the canonical demonstration of
 * the **promote-to-template-because-organism-can't-compose-organism** path.
 *
 * All visual customization flows through the single `size` axis, which
 * propagates 1:1 to the composed Button atom's `size`, the composed
 * Popover molecule's `size`, and the composed Calendar organism's `size`
 * via three separate lookup tables. There is no `className` escape hatch.
 *
 * Implements the canonical **controlled-passthrough across two composed
 * pieces** pattern documented in the template-authoring skill. Two state
 * machines — date selection (`value` / `defaultValue` / `onValueChange`)
 * and popover open/close (`open` / `defaultOpen` / `onOpenChange`) — are
 * coordinated by the template so consumers see a single unified API. When
 * uncontrolled, the template owns each piece's state via
 * `React.useState`; when controlled, the template delegates to the
 * external value and never flips its own state. Selecting a date always
 * closes the popover (via the same controlled-passthrough plumbing) so
 * the second piece's state machine stays consistent with the first's.
 *
 * @example
 * ```tsx
 * <DatePicker
 *   placeholder="Pick a date"
 *   onValueChange={(date) => console.log(date)}
 * />
 *
 * <DatePicker
 *   size="lg"
 *   value={selectedDate}
 *   onValueChange={setSelectedDate}
 *   format={(date) => date.toISOString().slice(0, 10)}
 * />
 *
 * <DatePicker disabled defaultValue={new Date()} />
 * ```
 */
export interface DatePickerProps extends DatePickerVariants {
  /** Controlled selected date. Pair with `onValueChange`. */
  value?: Date;
  /** Uncontrolled initial date. */
  defaultValue?: Date;
  /** Fires when the selected date changes (or clears, with `undefined`). */
  onValueChange?: (date: Date | undefined) => void;
  /**
   * Trigger placeholder rendered inside the Button when no date is
   * selected. Receives a `data-placeholder="true"` data attribute on the
   * trigger for descendant-selector styling.
   */
  placeholder?: React.ReactNode;
  /**
   * Custom formatter for the selected date displayed on the trigger.
   * Defaults to `Intl.DateTimeFormat(undefined, { dateStyle: 'long' })`
   * (e.g. `May 24, 2026`). Pass a custom function to use a project's
   * date-fns / dayjs / Luxon formatter, or a deterministic ISO format
   * for tests.
   */
  format?: (date: Date) => string;
  /** Disables the trigger button. */
  disabled?: boolean;
  /** Controlled popover open state. Pair with `onOpenChange`. */
  open?: boolean;
  /** Uncontrolled initial popover open state. */
  defaultOpen?: boolean;
  /** Fires when the popover open state changes. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Accessible label for the trigger button. The trigger renders the
   * formatted date or the placeholder as its visible content; pass
   * `aria-label` when the visible content isn't a sufficient accessible
   * name on its own (e.g. when `placeholder` is a decorative icon).
   */
  'aria-label'?: string;
  /**
   * Override the auto-generated id used for the trigger button. Defaults
   * to a `React.useId()`-derived value.
   */
  id?: string;
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      size,
      value,
      defaultValue,
      onValueChange,
      placeholder,
      format,
      disabled,
      open,
      defaultOpen,
      onOpenChange,
      'aria-label': ariaLabel,
      id,
    },
    ref,
  ) => {
    const resolvedSize: ResolvedSize = size ?? 'md';
    const autoId = React.useId();
    const baseId = id ?? autoId;
    const resolvedFormat = format ?? defaultFormat;

    // Touch the variants helper so the cva block is referenced at the call
    // site even though DatePicker's visible styling lives entirely in the
    // composed Button + Popover + Calendar. Keeps `datePickerVariants` in
    // the type graph for the `DatePickerVariants` export and stops
    // tree-shakers from pruning the cva block if a future axis grows real
    // classes.
    void datePickerVariants({ size: resolvedSize });

    const isValueControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<Date | undefined>(
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

    const handleOpenChange = (next: boolean): void => {
      if (!isOpenControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    };

    const handleValueChange = (next: Date | undefined): void => {
      if (!isValueControlled) setUncontrolledValue(next);
      onValueChange?.(next);
      // Coordinated close: selecting a date always closes the popover via
      // the same controlled-passthrough plumbing so the two state machines
      // stay consistent with each other.
      handleOpenChange(false);
    };

    const hasSelection = resolvedValue !== undefined;
    const triggerLabel = hasSelection
      ? resolvedFormat(resolvedValue)
      : placeholder;

    const triggerElement = (
      <Button
        ref={ref}
        id={baseId}
        variant="outline"
        size={buttonSizeForSize[resolvedSize]}
        disabled={disabled}
        leadingIcon={<CalendarIcon aria-hidden />}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={resolvedOpen}
        data-slot="datepicker-trigger"
        data-size={resolvedSize}
        data-state={resolvedOpen
          ? 'open'
          : 'closed'}
        data-placeholder={hasSelection
          ? undefined
          : 'true'}
      >
        <span data-slot="datepicker-trigger-value">{triggerLabel}</span>
      </Button>
    );

    const popoverAriaLabel = ariaLabel ?? 'Choose date';

    return (
      <Popover
        open={resolvedOpen}
        onOpenChange={handleOpenChange}
        size={popoverSizeForSize[resolvedSize]}
        trigger={triggerElement}
        contentProps={{ 'aria-label': popoverAriaLabel }}
      >
        <Calendar
          mode="single"
          selected={resolvedValue}
          onSelect={handleValueChange}
          defaultMonth={resolvedValue}
          size={calendarSizeForSize[resolvedSize]}
        />
      </Popover>
    );
  },
);
DatePicker.displayName = 'DatePicker';
