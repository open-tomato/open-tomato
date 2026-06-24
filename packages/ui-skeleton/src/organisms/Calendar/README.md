# Calendar

Heavy stateful organism that wraps
[`react-day-picker`](https://daypicker.dev) for date selection. The library
owns the month rendering, selection coordination, keyboard navigation, and
ARIA wiring; the organism's job is variant propagation, accessible labeling,
and exposing a discriminated `mode` API.

## Import

```ts
import { Calendar } from '@open-tomato/ui-skeleton';
```

## Props

| Prop         | Type                                                                                | Default |
| ------------ | ----------------------------------------------------------------------------------- | ------- |
| mode         | `'single' \| 'multiple' \| 'range'`                                                 | —       |
| selected     | `Date` (single) \| `Date[]` (multiple) \| `DateRange` (range)                       | —       |
| onSelect     | `(value) => void` — narrows per `mode` (`Date`, `Date[]`, `DateRange`, undefined)   | —       |
| defaultMonth | `Date`                                                                              | today   |
| disabled     | `Matcher \| Matcher[]`                                                              | —       |
| fromDate     | `Date`                                                                              | —       |
| toDate       | `Date`                                                                              | —       |
| size         | `'sm' \| 'md' \| 'lg'`                                                              | `'md'`  |

All other props (`numberOfMonths`, `showOutsideDays`, `weekStartsOn`,
`captionLayout`, `locale`, `dir`, `today`, etc.) are forwarded to the
underlying `DayPicker`. `className`, `classNames`, `modifiersClassNames`,
`components`, and the library's `startMonth` / `endMonth` /
`disabled` / `required` props are intentionally omitted at the type level —
styling flows through the `size` axis, and the navigation / selection bounds
are driven by `fromDate` and `toDate`.

### DateRange shape

```ts
type DateRange = {
  from: Date | undefined;
  to?: Date | undefined;
};
```

The `DateRange` and `Matcher` types are re-exported so consumers don't have
to import them directly from `react-day-picker`.

## Variants

| size | Day cell | Caption / weekday text | Nav button   |
| ---- | -------- | ---------------------- | ------------ |
| `sm` | `size-7` | `text-xs`              | `size-6`     |
| `md` | `size-8` | `text-sm`              | `size-7`     |
| `lg` | `size-9` | `text-base`            | `size-8`     |

The resolved `size` and `mode` axes are reflected on the rendered root as
`data-slot="calendar-root"`, `data-size`, and `data-mode` so downstream
styling and tests can observe them without className introspection.

`react-day-picker` reflects per-day state via modifier classes
(`selected`, `today`, `outside`, `disabled`, `range_start`, `range_middle`,
`range_end`). The organism maps each modifier to a colocated cva so the
surface treatment stays declarative — see the `modifiersClassNames` block
in `Calendar.tsx`.

## Composition

- **Wrapped library:** `react-day-picker` provides the month grid, weekday
  header, prev / next navigation, and the keyboard-driven roving-focus
  selection model (Arrow keys between days, PageUp/PageDown between months,
  Home/End within a row, Enter to activate). The organism's `<div>` wrapper
  adds the bordered surface frame; everything inside it (the `role="grid"`
  table, weekday headers, day buttons) is library-owned.
- **No molecule or atom composition.** Calendar is a pure library-wrapping
  organism with size-driven variant propagation. The prev / next chevrons
  use `lucide-react` icons injected via the library's `components.Chevron`
  slot.
- **Variant propagation via lookup tables.** The organism owns the mapping
  from its own `size` axis to each per-UI-element subpart cva via a
  `buildClassNames(size)` helper that returns the merged `classNames` map
  for `react-day-picker`:

  ```ts
  const buildClassNames = (size) => ({
    caption_label: cn(calendarCaptionLabelVariants({ size })),
    button_previous: cn(calendarNavButtonVariants({ size })),
    button_next: cn(calendarNavButtonVariants({ size })),
    weekday: cn(calendarWeekdayVariants({ size })),
    day: cn(calendarDayVariants({ size })),
    day_button: cn(calendarDayButtonVariants({ size })),
    footer: cn(calendarFooterVariants({ size })),
    // size-invariant rows
    months: cn(calendarMonthsVariants()),
    month: cn(calendarMonthVariants()),
    month_caption: cn(calendarMonthCaptionVariants()),
    nav: cn(calendarNavVariants()),
    month_grid: cn(calendarMonthGridVariants()),
    weekdays: cn(calendarWeekdaysVariants()),
    week: cn(calendarWeekVariants()),
  });
  ```

  `fromDate` and `toDate` map to the library's v9+ `startMonth` / `endMonth`
  navigation bounds AND are appended to the `disabled` matcher list as
  `{ before }` / `{ after }` so out-of-range days cannot be selected even if
  the consumer navigates past the bound.
- **No `className` flows downward.** The organism does not expose
  `className` on its public API and does not forward any class string into
  the library's `<DayPicker>` beyond its own `buildClassNames(...)` output.
  The library's `DayPicker` accepts `className` and `classNames`, but the
  organism drives both internally — consumers cannot override them. If a
  styling knob is missing, add a variant axis.
- **Internal state via the controlled-passthrough pattern.** When the
  consumer passes `selected` + `onSelect`, the organism delegates to that
  controlled flow and never flips the library's internal state. The library
  handles its own uncontrolled mode when `selected` is omitted.
- **Layer-import direction.** Imports `@/particles/cn`, `react-day-picker`,
  and `lucide-react`. Does NOT import other organisms, templates, pages, or
  providers — enforced by the `no-restricted-imports` rule in
  `eslint.config.mjs`.

## Accessibility

- The library renders each month as a `role="grid"` table with
  `role="columnheader"` weekday cells, `role="row"` rows, and `role="button"`
  day cells. The full WAI-ARIA Date Picker dialog pattern is implemented out
  of the box — no additional ARIA work is required for the common case.
- Keyboard navigation: Arrow keys move between days, PageUp/PageDown between
  months, Home/End within a row, Enter activates the focused day. Disabled
  days are skipped during traversal.
- Each day button carries an accessible name derived from the formatted
  date (e.g. `"June 15th, 2024"`) — `screen.getByRole('button', { name: /15th, 2024/i })`
  is the recommended test query.
- The library renders inline (no portal), so tests can scan `container`
  with `axe`. The component-isolation scan has no surrounding landmark, so
  disable axe's `region` rule for the standalone Calendar (the consumer's
  app shell supplies the landmark).
- The accessible name for the Calendar as a whole (and the form association
  when the calendar is embedded in a form) is the consumer's responsibility
  — pass `aria-label` or wrap the Calendar in a labeled element via the
  forwarded props.

## Do / Don't

- DO tune visuals through the `size` axis. If a knob isn't covered, add a
  variant axis — styling is the organism's responsibility, not the
  consumer's.
- DO pick `mode='single'` for a single date input, `mode='range'` for a
  date-range input, and `mode='multiple'` for a multi-day picker (e.g.
  selecting which days a feature is active). DON'T attempt to switch `mode`
  mid-flight on the same instance — TypeScript treats the three as separate
  discriminated branches and the runtime state model differs (`Date` vs
  `Date[]` vs `DateRange`).
- DO supply `fromDate` and `toDate` together when bounding selection to a
  fixed window — the organism wires both the navigation bounds (the prev /
  next buttons disable at the edges) and the selection bounds (out-of-range
  days are disabled) in one shot.
- DO control selection via `selected` + `onSelect` when external state
  drives the choice. DO use no `selected` for purely uncontrolled local
  state (the library handles its own internal state in that mode).
- DON'T pass `className`, `classNames`, `modifiersClassNames`, or
  `components` directly — they are omitted at the type level because the
  organism owns them via the `size` lookup.
- DON'T pass the library's `startMonth` / `endMonth` directly — use
  `fromDate` / `toDate` so the selection-bounds matchers are kept in sync
  with the navigation bounds. Passing `startMonth` raw would let the
  consumer navigate past the bound and pick a day outside the intended
  window.
