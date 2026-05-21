# RadioGroup

Single-encapsulated wrapper over Radix's RadioGroup primitive
(`@radix-ui/react-radio-group`). Renders one radio per descriptor in `items`,
auto-pairing each radio with its label via `React.useId()` + `htmlFor`/`id`.
Driven by `size` and `orientation` axes.

## Import

```ts
import { RadioGroup } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                      | Default      |
| ------------- | ----------------------------------------- | ------------ |
| items         | `RadioGroupItemDescriptor[]`              | —            |
| size          | `'sm' \| 'md' \| 'lg'`                    | `'md'`       |
| orientation   | `'vertical' \| 'horizontal'`              | `'vertical'` |
| value         | `string \| null` (controlled)             | —            |
| defaultValue  | `string` (uncontrolled initial value)     | —            |
| onValueChange | `(value: string) => void`                 | —            |
| disabled      | `boolean` (disables the entire group)     | `false`      |
| required      | `boolean`                                 | `false`      |
| name          | `string`                                  | —            |
| dir           | `'ltr' \| 'rtl'`                          | —            |
| loop          | `boolean` (roving-focus wrap)             | `true`       |
| id            | `string` (auto-generated otherwise)       | —            |

All other props are forwarded to the underlying Radix RadioGroup Root (a
`<div>` with `role="radiogroup"` and an `aria-orientation` matching the
resolved `orientation`). `className` is not a public prop — styling is
controlled exclusively through `size` and `orientation`.

### RadioGroupItemDescriptor

| Field       | Type        | Default | Notes                                     |
| ----------- | ----------- | ------- | ----------------------------------------- |
| value       | `string`    | —       | Form value; unique per group              |
| label       | `ReactNode` | —       | Inline label rendered next to the radio   |
| description | `ReactNode` | —       | Helper text below the label               |
| disabled    | `boolean`   | `false` | Disables this individual item             |

## Variants

| size | Radio    | Indicator dot | Row gap     | Label font   |
| ---- | -------- | ------------- | ----------- | ------------ |
| `sm` | `size-4` | `size-1.5`    | `gap-1.5`   | `text-sm`    |
| `md` | `size-5` | `size-2`      | `gap-2`     | `text-sm`    |
| `lg` | `size-6` | `size-2.5`    | `gap-2.5`   | `text-base`  |

| orientation  | Layout                          |
| ------------ | ------------------------------- |
| `vertical`   | `flex-col gap-2.5`              |
| `horizontal` | `flex-row flex-wrap gap-4`      |

The resolved size is reflected on the rendered Radix Root as `data-size`. Radix
sets `data-orientation="horizontal" | "vertical"` on the Root and
`data-state="checked" | "unchecked"` on each radio for downstream styling and
testing. Slots expose `data-slot="radio-group-item"` (the per-item `<label>`
row), `data-slot="radio-group-indicator"` (the inner filled dot),
`data-slot="radio-group-item-labels"` (the column wrapping label + description),
`data-slot="radio-group-item-label"`, and
`data-slot="radio-group-item-description"`. Per-item rows also carry
`data-disabled=""` when the item is disabled.

## Composition

- **Composed primitive:** `@radix-ui/react-radio-group` provides the Root,
  Item, and Indicator sub-components. The Root renders a `<div>` with
  `role="radiogroup"`; each Item renders a native `<button>` with
  `role="radio"` and an `aria-checked` value driven by Radix.
- **Each row is a native `<label>`** (not the `Label` atom) linked via
  auto-generated `id`/`htmlFor`. Wrapping the whole row in a `<label>` makes
  clicks on the label OR the description toggle the radio — the native HTML
  association is what enables this without any JavaScript click handlers. The
  `React.useId()`-derived `baseId` is suffixed with each item's `value` so
  ids are stable across renders and unique across groups on the same page.
- **Variant propagation via per-axis lookup.** The molecule's `size` axis
  drives the radio dimensions, indicator dot size, row gap, label font size,
  and description font size in lockstep. The `orientation` axis only affects
  the Root layout and Radix's roving-focus direction.
- **No `className` flows downward.** The molecule does not accept `className`,
  nor does it forward any consumer-supplied class string into the Radix Root,
  Item, Indicator, or the inline `<label>`. If a styling knob is missing, add
  a variant axis.
- **Layer-import direction.** RadioGroup imports `@/particles/cn` and
  `@radix-ui/react-radio-group`. It does NOT import other molecules,
  organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- Renders a `<div>` with `role="radiogroup"` and `aria-orientation` matching
  the resolved `orientation` via Radix.
- Each item renders a native `<button>` with `role="radio"` and the
  appropriate `aria-checked` value via Radix.
- An auto-generated `id` links each radio to its `<label>` via `htmlFor`;
  clicking anywhere in the row (label or description) toggles the radio.
- Supply `aria-label` or `aria-labelledby` on the group so the radiogroup has
  an accessible name distinct from any individual radio's label.
- Disabled items receive a real `disabled` attribute on the underlying
  `<button>` and the row carries `data-disabled=""` for downstream styling.
- Keyboard navigation works via Arrow keys (Radix roving-focus); Space
  selects the focused radio.

## Do / Don't

- DO tune visuals through `size` and `orientation`. If a knob isn't covered,
  add a variant axis — styling is the molecule's responsibility, not the
  consumer's.
- DO supply a group-level `aria-label` or `aria-labelledby` to name the
  radiogroup. DON'T omit it — Radix won't synthesize one from the per-item
  labels.
- DO control selection via `value` + `onValueChange` when external state
  (a store, URL, parent component) drives the choice. DO use `defaultValue`
  for purely local uncontrolled state. DON'T mix the two on the same
  instance — pick one ownership model.
- DO use the `disabled` field on individual `items` for per-row disabling.
  Use the group-level `disabled` prop when the entire choice is unavailable.
- DON'T pass `className` to RadioGroup — the molecule rejects it at the type
  level. Compose with a parent wrapper for layout/spacing concerns that live
  outside the group itself.
- DON'T reuse the same `value` across items in a single group — `value`
  doubles as the React key and the form value; collisions break selection.
