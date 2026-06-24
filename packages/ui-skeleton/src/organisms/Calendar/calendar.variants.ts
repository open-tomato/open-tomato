import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root frame around the `react-day-picker` calendar grid. The library handles
 * the table layout, weekday headers, and per-day cell rendering; the cva here
 * scopes a `<div>` wrapper that pads the grid, draws the surface border, and
 * carries the resolved `data-size` hook for downstream styling. The `size`
 * axis carries an empty class string here because per-cell padding lives on
 * the day/weekday/caption subpart cvas — the wrapper itself is size-invariant.
 */
export const calendarVariants = cva(
  'inline-flex w-fit flex-col gap-2 rounded-md border border-border bg-background p-3 text-foreground shadow-elev-1',
  {
    variants: {
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type CalendarVariants = VariantProps<typeof calendarVariants>;

/**
 * Container around all displayed months. `react-day-picker` lays the months
 * out horizontally when `numberOfMonths > 1`; the cva keeps the inter-month
 * gutter and stacks the months on small viewports via a column fallback.
 */
export const calendarMonthsVariants = cva(
  'flex flex-col gap-4 sm:flex-row',
);

/** Single-month wrapper. The library nests the caption + grid inside this. */
export const calendarMonthVariants = cva('flex flex-col gap-2');

/** Caption row containing the month label and the navigation buttons. */
export const calendarMonthCaptionVariants = cva(
  'relative flex items-center justify-center pt-1',
);

/** Month label (`MMMM yyyy` by default) rendered inside the caption row. */
export const calendarCaptionLabelVariants = cva(
  'font-medium text-foreground',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** Navigation row enclosing the prev/next buttons. */
export const calendarNavVariants = cva(
  'absolute inset-x-0 flex items-center justify-between px-1',
);

/**
 * Prev / next month buttons. Mirrors the Button atom's `outline`/`size`
 * vocabulary without importing the atom component — keeping the calendar
 * frame native to `react-day-picker`'s HTML structure (see InputGroup's
 * compose-atom-primitives pattern in the organism-authoring skill).
 */
export const calendarNavButtonVariants = cva(
  'inline-flex items-center justify-center rounded-md border border-border bg-transparent p-0 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'size-6 [&_svg]:size-3',
        md: 'size-7 [&_svg]:size-4',
        lg: 'size-8 [&_svg]:size-5',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** The `<table>` rendered by `react-day-picker` for one month's grid. */
export const calendarMonthGridVariants = cva(
  'w-full border-collapse space-y-1',
);

/** Header row containing each weekday label. */
export const calendarWeekdaysVariants = cva('flex');

/** Single weekday header cell (`Mon`, `Tue`, ...). */
export const calendarWeekdayVariants = cva(
  'flex flex-1 items-center justify-center text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'h-7 text-[0.6rem]',
        md: 'h-8 text-xs',
        lg: 'h-9 text-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** One row of weekday cells inside the month grid. */
export const calendarWeekVariants = cva('mt-1 flex w-full');

/**
 * Outer cell containing one day. The library re-uses this for outside-month
 * days, range-edge days, and disabled days — the per-state styling lives on
 * the inner button (see `calendarDayButtonVariants`) and on the modifier
 * className map (see `calendarSelectedModifierVariants` and siblings), not on
 * the cell itself.
 */
export const calendarDayVariants = cva(
  'relative flex flex-1 items-center justify-center p-0 text-foreground',
  {
    variants: {
      size: {
        sm: 'h-7',
        md: 'h-8',
        lg: 'h-9',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Inner `<button>` rendered for each day. `react-day-picker` carries
 * `aria-selected` on the button; per-state surface treatment (today,
 * selected, range edges, outside, disabled) lives on the sibling
 * `*ModifierVariants` cva blocks below and is wired via `modifiersClassNames`.
 */
export const calendarDayButtonVariants = cva(
  'inline-flex aspect-square items-center justify-center rounded-md font-normal text-foreground '
  + 'transition-colors hover:bg-accent hover:text-accent-foreground '
  + 'focus-visible:outline-2 focus-visible:outline-ring',
  {
    variants: {
      size: {
        sm: 'size-7 text-xs',
        md: 'size-8 text-sm',
        lg: 'size-9 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** Selected day surface — applied to the day button via the library's
 * `selected` modifier class. */
export const calendarSelectedModifierVariants = cva(
  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
);

/** Today's day surface — applied via the `today` modifier class. */
export const calendarTodayModifierVariants = cva(
  'bg-accent text-accent-foreground',
);

/** Outside-month day surface — applied via the `outside` modifier class. */
export const calendarOutsideModifierVariants = cva(
  'text-muted-foreground opacity-50',
);

/** Disabled day surface — applied via the `disabled` modifier class. */
export const calendarDisabledModifierVariants = cva(
  'pointer-events-none opacity-50',
);

/** Range start day surface — applied via the `range_start` modifier class. */
export const calendarRangeStartModifierVariants = cva(
  'rounded-l-md bg-primary text-primary-foreground',
);

/** Range middle day surface — applied via the `range_middle` modifier class. */
export const calendarRangeMiddleModifierVariants = cva(
  'rounded-none bg-accent text-accent-foreground',
);

/** Range end day surface — applied via the `range_end` modifier class. */
export const calendarRangeEndModifierVariants = cva(
  'rounded-r-md bg-primary text-primary-foreground',
);

/** Footer slot below the grid. */
export const calendarFooterVariants = cva(
  'pt-2 text-center text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
