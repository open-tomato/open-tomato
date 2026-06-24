import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import {
  DayPicker,
  type DateRange,
  type DayPickerProps,
  type Matcher,
} from 'react-day-picker';

import { cn } from '@/particles/cn';

import {
  calendarCaptionLabelVariants,
  calendarDayButtonVariants,
  calendarDayVariants,
  calendarDisabledModifierVariants,
  calendarFooterVariants,
  calendarMonthCaptionVariants,
  calendarMonthGridVariants,
  calendarMonthsVariants,
  calendarMonthVariants,
  calendarNavButtonVariants,
  calendarNavVariants,
  calendarOutsideModifierVariants,
  calendarRangeEndModifierVariants,
  calendarRangeMiddleModifierVariants,
  calendarRangeStartModifierVariants,
  calendarSelectedModifierVariants,
  calendarTodayModifierVariants,
  calendarVariants,
  calendarWeekdayVariants,
  calendarWeekdaysVariants,
  calendarWeekVariants,
  type CalendarVariants,
} from './calendar.variants';

type ResolvedSize = NonNullable<CalendarVariants['size']>;

type SharedDayPickerProps = Omit<
  DayPickerProps,
  | 'mode'
  | 'selected'
  | 'onSelect'
  | 'required'
  | 'className'
  | 'classNames'
  | 'modifiersClassNames'
  | 'components'
  | 'fromDate'
  | 'toDate'
  | 'disabled'
  | 'startMonth'
  | 'endMonth'
>;

interface CalendarBaseProps extends SharedDayPickerProps, CalendarVariants {
  /**
   * Earliest selectable date. Forwarded to `react-day-picker`'s `startMonth`
   * for navigation bounds AND appended to the `disabled` matcher list as
   * `{ before: fromDate }` so out-of-range days cannot be selected even if
   * the consumer navigates past the bound. Re-exposed as `fromDate` to match
   * the team vocabulary (the library renamed this in v9.x).
   */
  fromDate?: Date;
  /**
   * Latest selectable date. Forwarded to `react-day-picker`'s `endMonth` and
   * appended to the `disabled` matcher list as `{ after: toDate }`. Mirror of
   * `fromDate`.
   */
  toDate?: Date;
  /**
   * Days that cannot be selected. Accepts a single matcher or an array. The
   * organism appends the `fromDate` / `toDate` bounds (if any) to the array
   * before forwarding to the library.
   */
  disabled?: Matcher | Matcher[];
}

export interface CalendarSingleProps extends CalendarBaseProps {
  /** Single-date selection — `selected` is a single `Date | undefined`. */
  mode: 'single';
  /** Currently selected date. */
  selected?: Date;
  /** Fires with the new selection (or `undefined` when cleared). */
  onSelect?: (date: Date | undefined) => void;
}

export interface CalendarMultipleProps extends CalendarBaseProps {
  /** Multi-date selection — `selected` is a `Date[]`. */
  mode: 'multiple';
  /** Currently selected dates. */
  selected?: Date[];
  /** Fires with the new selection (or `undefined` when fully cleared). */
  onSelect?: (dates: Date[] | undefined) => void;
}

export interface CalendarRangeProps extends CalendarBaseProps {
  /** Range selection — `selected` is a `{ from, to? }` shape. */
  mode: 'range';
  /** Currently selected range. */
  selected?: DateRange;
  /** Fires with the new range (or `undefined` when fully cleared). */
  onSelect?: (range: DateRange | undefined) => void;
}

/**
 * Calendar — heavy stateful organism wrapping `react-day-picker` for date
 * selection. Owns the date-grid state (month rendering, selection
 * coordination, keyboard navigation) via the library; the wrapper's job is
 * variant propagation, accessible labeling, and exposing a discriminated
 * `mode` API.
 *
 * @remarks All visual customization flows through the `size` axis, which
 * propagates to each per-UI-element subpart cva (caption label, navigation
 * button, weekday cell, day cell, day button, footer). There is no
 * `className` escape hatch. The discriminated `mode` prop narrows `selected`
 * and `onSelect` between `Date`, `Date[]`, and `DateRange` shapes — the same
 * pattern as the Accordion organism's `type` discriminator.
 *
 * `fromDate` and `toDate` map to the library's v9+ `startMonth` / `endMonth`
 * navigation bounds AND are appended to the `disabled` matcher list as
 * `{ before }` / `{ after }` so out-of-range days cannot be selected even if
 * the consumer navigates past the bound. The library handles the rest:
 * roving-focus keyboard navigation (Arrow keys between days, PageUp/PageDown
 * between months), `aria-selected` on the day buttons, and the month-grid
 * `role="grid"` wiring. Tests can scan `container` — the library renders
 * inline and does not use a portal.
 *
 * @example
 * ```tsx
 * <Calendar
 *   mode="single"
 *   selected={date}
 *   onSelect={setDate}
 *   defaultMonth={new Date(2024, 5, 1)}
 *   fromDate={new Date(2024, 0, 1)}
 *   toDate={new Date(2024, 11, 31)}
 * />
 *
 * <Calendar mode="range" selected={range} onSelect={setRange} />
 *
 * <Calendar mode="multiple" selected={dates} onSelect={setDates} />
 * ```
 */
export type CalendarProps =
  | CalendarSingleProps
  | CalendarMultipleProps
  | CalendarRangeProps;

const buildDisabledMatchers = (
  disabled: Matcher | Matcher[] | undefined,
  fromDate: Date | undefined,
  toDate: Date | undefined,
): Matcher | Matcher[] | undefined => {
  const matchers: Matcher[] = [];
  if (disabled !== undefined) {
    if (Array.isArray(disabled)) matchers.push(...disabled);
    else matchers.push(disabled);
  }
  if (fromDate !== undefined) matchers.push({ before: fromDate });
  if (toDate !== undefined) matchers.push({ after: toDate });
  if (matchers.length === 0) return undefined;
  return matchers;
};

const buildClassNames = (
  size: ResolvedSize,
): DayPickerProps['classNames'] => ({
  months: cn(calendarMonthsVariants()),
  month: cn(calendarMonthVariants()),
  month_caption: cn(calendarMonthCaptionVariants()),
  caption_label: cn(calendarCaptionLabelVariants({ size })),
  nav: cn(calendarNavVariants()),
  button_previous: cn(calendarNavButtonVariants({ size })),
  button_next: cn(calendarNavButtonVariants({ size })),
  month_grid: cn(calendarMonthGridVariants()),
  weekdays: cn(calendarWeekdaysVariants()),
  weekday: cn(calendarWeekdayVariants({ size })),
  week: cn(calendarWeekVariants()),
  day: cn(calendarDayVariants({ size })),
  day_button: cn(calendarDayButtonVariants({ size })),
  footer: cn(calendarFooterVariants({ size })),
});

const modifierClassNames: DayPickerProps['modifiersClassNames'] = {
  selected: cn(calendarSelectedModifierVariants()),
  today: cn(calendarTodayModifierVariants()),
  outside: cn(calendarOutsideModifierVariants()),
  disabled: cn(calendarDisabledModifierVariants()),
  range_start: cn(calendarRangeStartModifierVariants()),
  range_middle: cn(calendarRangeMiddleModifierVariants()),
  range_end: cn(calendarRangeEndModifierVariants()),
};

const CalendarChevron = ({
  orientation,
}: { orientation?: string }): React.JSX.Element => (
  orientation === 'right'
    ? <ChevronRight aria-hidden />
    : <ChevronLeft aria-hidden />
);

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  (props, ref) => {
    const {
      size,
      mode,
      selected,
      onSelect,
      fromDate,
      toDate,
      disabled,
      ...rest
    } = props as CalendarBaseProps & {
      mode: CalendarProps['mode'];
      selected?: Date | Date[] | DateRange;
      onSelect?:
        | ((date: Date | undefined) => void)
        | ((dates: Date[] | undefined) => void)
        | ((range: DateRange | undefined) => void);
    };

    const resolvedSize: ResolvedSize = size ?? 'md';
    const resolvedClassNames = React.useMemo(
      () => buildClassNames(resolvedSize),
      [resolvedSize],
    );
    const resolvedDisabled = buildDisabledMatchers(disabled, fromDate, toDate);

    const sharedDayPickerProps = {
      ...rest,
      startMonth: fromDate,
      endMonth: toDate,
      disabled: resolvedDisabled,
      classNames: resolvedClassNames,
      modifiersClassNames: modifierClassNames,
      components: { Chevron: CalendarChevron },
    };

    return (
      <div
        ref={ref}
        data-slot="calendar-root"
        data-size={resolvedSize}
        data-mode={mode}
        className={cn(calendarVariants({ size: resolvedSize }))}
      >
        {mode === 'range'
          ? (
            <DayPicker
              mode="range"
              selected={selected as DateRange | undefined}
              onSelect={onSelect as
                | ((range: DateRange | undefined) => void)
                | undefined}
              {...sharedDayPickerProps}
            />
          )
          : null}
        {mode === 'multiple'
          ? (
            <DayPicker
              mode="multiple"
              selected={selected as Date[] | undefined}
              onSelect={onSelect as
                | ((dates: Date[] | undefined) => void)
                | undefined}
              {...sharedDayPickerProps}
            />
          )
          : null}
        {mode === 'single'
          ? (
            <DayPicker
              mode="single"
              selected={selected as Date | undefined}
              onSelect={onSelect as
                | ((date: Date | undefined) => void)
                | undefined}
              {...sharedDayPickerProps}
            />
          )
          : null}
      </div>
    );
  },
);
Calendar.displayName = 'Calendar';

export { Calendar };
export type { DateRange, Matcher } from 'react-day-picker';
