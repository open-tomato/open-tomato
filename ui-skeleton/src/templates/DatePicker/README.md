# DatePicker

Compound-widget template composing the `Popover` molecule (open / close +
portaled surface) with the `Calendar` organism (date grid) to expose a
single date-selection control. The trigger renders a `Button` atom
decorated with a calendar icon plus either the formatted selected date or a
placeholder; clicking opens a popover containing the Calendar in
`mode="single"`; selecting a day fires `onValueChange`, closes the popover,
and surfaces the formatted date on the trigger.

## Import

```ts
import { DatePicker } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                         | Default    |
| ------------- | -------------------------------------------- | ---------- |
| size          | `'sm' \| 'md' \| 'lg'`                       | `'md'`     |
| value         | `Date`                                       | —          |
| defaultValue  | `Date`                                       | —          |
| onValueChange | `(date: Date \| undefined) => void`          | —          |
| placeholder   | `ReactNode`                                  | —          |
| format        | `(date: Date) => string`                     | `Intl.DateTimeFormat(undefined, { dateStyle: 'long' })` |
| disabled      | `boolean`                                    | `false`    |
| open          | `boolean`                                    | —          |
| defaultOpen   | `boolean`                                    | `false`    |
| onOpenChange  | `(open: boolean) => void`                    | —          |
| aria-label    | `string`                                     | —          |
| id            | `string`                                     | `useId()`  |

`className` is not a public prop — styling is controlled exclusively
through the `size` axis. The composed `Button`, `Popover`, and `Calendar`
all reject `className` at the type level, so no escape hatch leaks into
any composed piece.

## Variants

| size | Button.size | Popover.size (width) | Calendar.size (per-cell scale) |
| ---- | ----------- | -------------------- | ------------------------------ |
| `sm` | `sm`        | `sm` (`w-56`)        | `sm` (compact grid)            |
| `md` | `md`        | `md` (`w-72`)        | `md` (default grid)            |
| `lg` | `lg`        | `lg` (`w-96`)        | `lg` (roomy grid)              |

The resolved variants are reflected on the rendered trigger as
`data-slot="datepicker-trigger"`, `data-size`, `data-state`
(`open` / `closed`), and `data-placeholder="true"` when no value is
selected. The composed `Popover` Content reflects `data-size` on its own
`data-slot="popover-content"`, and the composed `Calendar` root reflects
`data-size` on its own `data-slot="calendar-root"`.

## Composition

- **Composed organism:** `Calendar` provides the date grid, month
  navigation, keyboard-driven day traversal (Arrow keys between days,
  PageUp/PageDown between months), and the per-mode selection plumbing.
  DatePicker hardcodes `mode="single"` because the public API is a single
  `Date | undefined` value; range / multi modes are out of scope for this
  template.
- **Composed molecule:** `Popover` provides the portaled surface, open /
  close state, focus management, escape-key dismissal, and outside-click
  dismissal. DatePicker delegates every popover concern to it.
- **Composed atom:** `Button` provides the trigger surface (with
  `variant="outline"`) and the `leadingIcon` slot for the calendar icon.
  The trigger is wrapped by `Popover` via `<RadixPopover.Trigger asChild>`,
  which projects the Radix `aria-controls` / `aria-expanded` wiring onto
  the Button.
- **Variant propagation via lookup tables.** The template owns the mapping
  from its own `size` axis to each composed piece's `size` axis:

  ```ts
  const buttonSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const popoverSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const calendarSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  ```

  All three tables are direct passthrough (the axes share the same union
  shape), kept as explicit tables to match the canonical
  template-authoring lookup-table pattern and to surface any future axis
  divergence at compile time. One lookup table per
  (template axis × composed piece's axis) pair — combining them into a
  single multi-target table is unnecessary cleverness per the skill.
- **Controlled-passthrough across two composed pieces.** Two state
  machines — date selection (`value` / `defaultValue` / `onValueChange`)
  and popover open/close (`open` / `defaultOpen` / `onOpenChange`) — are
  coordinated by the template so consumers see a single unified API. When
  uncontrolled the template owns each piece's state via
  `React.useState`; when controlled the template delegates to the
  external value and never flips its own state. Selecting a date always
  closes the popover (via the same controlled-passthrough plumbing) so
  the two state machines stay consistent.
- **No `className` flows downward.** Organisms, molecules, and atoms
  reject `className` both at the type level and at runtime. If a styling
  knob the variants don't cover is needed, add a variant axis on the
  composed piece OR on this template — don't open an escape hatch.
  Layout-level granularity flows through variant axes only.
- **Slot prop vocabulary.** `placeholder` (trigger fallback content),
  `format` (display formatter), and the standard controlled-passthrough
  `value` / `onValueChange` / `open` / `onOpenChange` API. The template
  does NOT expose `trigger`, `header`, `footer`, or `children` slots —
  the entire surface is the trigger + the Calendar grid, and overriding
  either piece would defeat the template's job of coordinating them.
  When a consumer wants a fundamentally different trigger or popover
  layout, compose `Popover` + `Calendar` directly at the consumer layer.
- **Layer-import direction.** Imports `@/organisms/Calendar`,
  `@/molecules/Popover`, `@/atoms/Button`, and `lucide-react` (for the
  calendar icon). Does NOT import other templates, pages, or providers —
  enforced by the `no-restricted-imports` rule in `eslint.config.mjs`.

### Why DatePicker lives at the template layer

DatePicker is the canonical demonstration of the
**promote-to-template-because-organism-can't-compose-organism** path
documented in the template-authoring skill. It composes the `Calendar`
**organism** with the `Popover` **molecule**, and the organism layer's
`no-restricted-imports` guard explicitly forbids organism-to-organism
imports. Promoting to the template layer is the sanctioned escape — the
template layer's composition guard allows organism + molecule + atom
imports unrestricted.

The deviation matters because it widens the operational definition of
"template" beyond textbook atomic design's "a group of organisms that form
a page". DatePicker isn't a page-surface frame at all; it's a compound
widget. The template-authoring skill documents this deviation explicitly
under "What 'template' means in this package".

## Accessibility

- The trigger is a native `<button>` (via the `Button` atom) with
  `aria-haspopup="dialog"` and `aria-expanded` reflecting the popover's
  open state. The accessible name comes from the consumer-supplied
  `aria-label` first, falling back to the visible trigger content (the
  formatted date or the placeholder).
- The composed `Calendar` (via `react-day-picker`) renders the month grid
  with `role="grid"`, exposes each day as a `<button>` with the
  `Weekday, Month Dth, Year` ARIA label, wires roving-focus keyboard
  navigation (Arrow keys between days, PageUp/PageDown between months,
  Home/End to row edges), and sets `aria-selected` on the selected day.
- Focus is managed by `Popover` (via Radix): focus moves into the
  Calendar on open and returns to the trigger on close. Escape dismisses
  the popover, as does outside-click — both routed through the
  controlled-passthrough `onOpenChange` so the template's open state
  stays in sync.
- The `disabled` prop forwards to the `Button` atom, which sets the real
  `disabled` attribute on the trigger and blocks Radix's open trigger
  entirely. Disabled triggers stay in the tab order's
  programmatically-focusable set per the WAI-ARIA button pattern.
- Tests MUST call `await axe(document.body)` rather than
  `await axe(container)` because Radix Popover portals the Content
  outside the bound render container; a container-scoped axe scan
  silently misses the portaled Calendar grid.

## Do / Don't

- DO tune visuals through the `size` axis. If a knob isn't covered, add
  a variant axis on the template or on the composed piece — DON'T reach
  for `className`. `className` is rejected at every layer.
- DO control selection via `value` + `onValueChange` when external state
  drives the choice. DO use `defaultValue` for purely local uncontrolled
  state. DON'T mix the two on the same instance — controlled values are
  authoritative and the template never flips its internal state when
  `value` is defined. The same rule applies to `open` /
  `onOpenChange` / `defaultOpen`.
- DO pass a custom `format` for deterministic test output (e.g. ISO
  date strings) and for project-wide formatter parity (e.g. the
  date-fns / dayjs / Luxon formatter the rest of the app uses). The
  default `Intl.DateTimeFormat(undefined, { dateStyle: 'long' })`
  honors the user agent's locale, which is usually correct in
  production but flaky across CI matrices.
- DO supply an `aria-label` when the trigger's visible content is just a
  decorative placeholder icon. The accessible name falls back to the
  visible trigger content, which works for plain text placeholders but
  fails when `placeholder` is an `<svg>` or other non-text element.
- DON'T pass `className` to DatePicker or to any composed piece — every
  layer rejects it.
- DON'T expect range / multi date selection. DatePicker hardcodes
  `mode="single"`. When the public API needs a `DateRange` or `Date[]`,
  compose `Popover` + `Calendar` directly at the consumer layer with the
  appropriate `mode`.
- DON'T rely on the popover staying open after selection. Selecting a
  date always closes the popover via the coordinated
  controlled-passthrough plumbing; this is the standard date-picker UX
  and is not configurable.
