# Combobox

Stateful single-select organism composing the `Popover` molecule (open / close
+ portaled surface), the `Input` atom (type-ahead search), and a native
`<ul role="listbox">` of `<li role="option">` rows filtered against the
current search query.

## Import

```ts
import { Combobox } from '@open-tomato/ui-skeleton';
```

## Props

| Prop              | Type                                        | Default                |
| ----------------- | ------------------------------------------- | ---------------------- |
| items             | `ComboboxItem[]`                            | —                      |
| value             | `string`                                    | —                      |
| defaultValue      | `string`                                    | —                      |
| onValueChange     | `(value: string) => void`                   | —                      |
| placeholder       | `ReactNode`                                 | —                      |
| searchPlaceholder | `string`                                    | —                      |
| emptyMessage      | `ReactNode`                                 | `'No results found.'`  |
| open              | `boolean`                                   | —                      |
| defaultOpen       | `boolean`                                   | `false`                |
| onOpenChange      | `(open: boolean) => void`                   | —                      |
| size              | `'sm' \| 'md' \| 'lg'`                      | `'md'`                 |
| disabled          | `boolean`                                   | `false`                |
| id                | `string`                                    | `React.useId()`        |
| aria-label        | `string`                                    | —                      |

`className` is not a public prop — styling is controlled exclusively through
`size`. The trigger button forwards the `ref` so consumers can
`useRef<HTMLButtonElement>` for focus / measurement / form integration.

### ComboboxItem

| Field    | Type        | Default | Notes                                                                                  |
| -------- | ----------- | ------- | -------------------------------------------------------------------------------------- |
| value    | `string`    | —       | Stable identifier — React key + `onValueChange` payload; must be unique within `items` |
| label    | `ReactNode` | —       | Visible label; substring-matched by the filter only when `typeof label === 'string'`   |
| keywords | `string[]`  | —       | Aliases / synonyms appended to the filter alongside `value` and a string `label`       |
| disabled | `boolean`   | `false` | Skipped during keyboard traversal; rendered with `data-disabled="true"`                |

## Variants

| size | Trigger height + padding | Listbox max-height | Option padding | Empty padding |
| ---- | ------------------------ | ------------------ | -------------- | ------------- |
| `sm` | `h-8 px-2.5 text-xs`     | `max-h-[200px]`    | `px-2 py-1`    | `py-4 text-xs`  |
| `md` | `h-9 px-3 text-sm`       | `max-h-[240px]`    | `px-2 py-1.5`  | `py-6 text-sm`  |
| `lg` | `h-10 px-3.5 text-base`  | `max-h-[280px]`    | `px-3 py-2`    | `py-8 text-base` |

The resolved variants are reflected on:

- The trigger as `data-slot="combobox-trigger"`, `data-size`, and
  `data-state="open" | "closed"`.
- The portaled Popover content as the molecule's own
  `data-slot="popover-content"` + `data-size`.
- The listbox as `data-slot="combobox-list"` + `data-size`.
- Each option as `data-slot="combobox-option"`, `data-value=<row value>`,
  `data-focused="true" | "false"`, `data-disabled`, and `data-selected`.

## Composition

- **Composed molecule:** `Popover` provides the open / close state, the
  portaled surface, and the trigger-asChild plumbing. The Combobox passes
  its trigger button as the Popover's `trigger` slot and its search row +
  listbox as the Popover's children.
- **Composed atom:** `Input` provides the search field. The atom's `size`
  axis is driven by Combobox's own `size` via the `inputSizeForSize` lookup
  table.
- **Variant propagation via lookup tables.** The organism owns the mapping
  from its single public `size` axis to each composed surface:

  ```ts
  const inputSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const popoverSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  ```

  Direct passthrough is used everywhere — the axes align — but the explicit
  lookup tables stay in place so a future axis rename on either composed
  surface remains a one-line change here.
- **No `className` flows downward.** Neither the composed Popover nor the
  composed Input accepts `className` at the type level. The Combobox does
  not pass any class string into either composition beyond the `cn(...)`
  output of its own variant cvas.
- **Slot prop vocabulary.** `items[]` is the only data slot, with the simple
  descriptor `{ value, label, keywords?, disabled? }`. There is no
  discriminated union — every row is selectable. Empty-state and search
  placeholders flow through their own dedicated props
  (`emptyMessage` / `searchPlaceholder`).
- **Internal state via the controlled-passthrough pattern.** Three
  independent states are owned: the open state (mirrored onto the composed
  Popover), the search query (always internal — resets when the popover
  closes), and the keyboard-focused option value (resets when the search
  query or filtered list changes). When the consumer passes `value` +
  `onValueChange` or `open` + `onOpenChange`, the organism delegates to
  those controlled flows and never flips its internal state.
- **Pure helper.** `matchesQuery(item, query)` is exported alongside the
  component as a pure helper so tests can validate the filter contract
  without rendering. Mirrors the Pagination organism's
  exported-helper-with-focused-eslint-disable pattern documented in
  `skills/organism-authoring/SKILL.md`.
- **Layer-import direction.** Imports `@/molecules/Popover`, `@/atoms/Input`,
  and `@/particles/cn`. Does NOT import other organisms, templates, pages,
  or providers — enforced by the `no-restricted-imports` rule in
  `eslint.config.mjs`.

## Accessibility

- The trigger is rendered as `role="combobox"` with `aria-haspopup="listbox"`,
  `aria-expanded`, and `aria-controls={listboxId}` (set only while open so
  axe's `aria-valid-attr-value` rule does not flag the closed state).
- The search Input carries `aria-autocomplete="list"`,
  `aria-controls={listboxId}`, and `aria-activedescendant` pointing at the
  currently keyboard-focused option's id. Auto-focus on open is driven by
  `Popover.contentProps.onOpenAutoFocus`, which is intercepted to redirect
  focus into the search Input.
- The listbox is rendered as `<ul role="listbox">` with `aria-label` mirrored
  from the trigger's `aria-label` (falling back to `'Suggestions'`) so the
  role always has an accessible name.
- Each option is rendered as `<li role="option">` with `aria-selected`
  reflecting the current value, `aria-disabled` on disabled rows, and an `id`
  derived from the descriptor's `value` so `aria-activedescendant` can
  resolve.
- Keyboard contract: `ArrowDown` / `ArrowUp` move the keyboard focus
  (wrapping around the edges), `Home` / `End` jump to the first / last
  enabled option, `Enter` selects the focused option, `Escape` closes the
  popover (handled by Radix Popover).
- Disabled options are skipped during keyboard traversal AND blocked on
  click — both code paths share the same `item.disabled` guard.
- The empty-state message is rendered with `aria-live="polite"` so screen
  readers announce when the filter clears the list.
- **Portal axe scans must use `document.body`.** The Combobox composes the
  portal-based Popover molecule; an `await axe(container)` scan silently
  misses the portaled listbox. See the portal-based-organism rule in
  `skills/organism-authoring/SKILL.md`.

## Do / Don't

- DO tune visuals through `size`. If a knob isn't covered, add a variant
  axis — styling is the organism's responsibility, not the consumer's.
- DO supply a string `label` whenever possible so the filter scores against
  it directly. DO use `keywords` for aliases and synonyms that don't belong
  in the visible label.
- DO use `value` + `onValueChange` when external state drives the choice
  (e.g. form integration). DO use `defaultValue` for purely local
  uncontrolled state. DON'T mix the two on the same instance.
- DO use `open` + `onOpenChange` to coordinate the open state with sibling
  UI (e.g. a parent layout that highlights an active filter). DON'T attempt
  to also pass `defaultOpen` — `open !== undefined` makes the popover
  controlled and `defaultOpen` becomes a no-op.
- DON'T pass a `React.Fragment`, string, array, or `null` as a row's
  `label` — the descriptor signature (`React.ReactNode`) accepts these but
  the filter cannot score against them and the trigger label rendering
  may break for non-string roots.
- DON'T pass `className` to Combobox — the organism rejects it at the type
  level. If a styling knob is missing, add a variant axis here or on the
  composed Popover / Input.
- DON'T reuse the same `value` across descriptors — `value` doubles as the
  React key, the `data-value` selector, and the `onValueChange` payload;
  collisions break selection.
