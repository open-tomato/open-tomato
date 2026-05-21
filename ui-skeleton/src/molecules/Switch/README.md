# Switch

Single-encapsulated wrapper over Radix's Switch primitive
(`@radix-ui/react-switch`). Folds the Root and Thumb sub-components into one
component driven by `size` and `variant`, with an optional inline `label` slot.

## Import

```ts
import { Switch } from '@open-tomato/ui-skeleton';
```

## Props

| Prop              | Type                                              | Default     |
| ----------------- | ------------------------------------------------- | ----------- |
| size              | `'sm' \| 'md' \| 'lg'`                            | `'md'`      |
| variant           | `'default' \| 'success' \| 'destructive'`         | `'default'` |
| label             | `ReactNode`                                       | —           |
| checked           | `boolean` (controlled)                            | —           |
| defaultChecked    | `boolean` (uncontrolled initial value)            | —           |
| onCheckedChange   | `(checked: boolean) => void`                      | —           |
| disabled          | `boolean`                                         | `false`     |
| required          | `boolean`                                         | `false`     |
| name              | `string`                                          | —           |
| value             | `string`                                          | —           |
| id                | `string` (auto-generated when `label` is set)     | —           |

All other props are forwarded to the underlying Radix Switch Root (a native
`<button>` with `role="switch"`). `className` is not a public prop — styling is
controlled exclusively through `size` and `variant`.

## Variants

| size | Track          | Thumb     | Checked translate |
| ---- | -------------- | --------- | ----------------- |
| `sm` | `h-5 w-9`      | `size-4`  | `translate-x-4`   |
| `md` | `h-6 w-11`     | `size-5`  | `translate-x-5`   |
| `lg` | `h-7 w-14`     | `size-6`  | `translate-x-7`   |

| variant       | Checked track color           |
| ------------- | ----------------------------- |
| `default`     | `bg-primary`                  |
| `success`     | `bg-emerald-500`              |
| `destructive` | `bg-destructive`              |

The resolved variants are reflected on the rendered Radix Root as
`data-size="<name>"` and `data-variant="<name>"`. Radix sets
`data-state="checked" | "unchecked"` on the Root and Thumb for downstream
styling and testing. Slots expose `data-slot="switch-root"` (the inline-label
wrapper, only when `label` is provided), `data-slot="switch-thumb"` (the
moving knob), and `data-slot="switch-label"` (the inline `<label>` element).

## Composition

- **Composed primitive:** `@radix-ui/react-switch` provides the Root and Thumb
  sub-components. The Root renders a native `<button>` with `role="switch"`
  and the appropriate `aria-checked` value; the Thumb is a `<span>` whose
  translate animation is driven by Radix's `data-state` attribute.
- **Inline label is a native `<label>`** (not the `Label` atom) linked via
  auto-generated `id`/`htmlFor`. The native HTML association is what enables
  clicking the label to toggle the switch without extra wiring. The label uses
  Tailwind's `peer` + `peer-disabled` pattern to dim automatically when the
  switch is disabled.
- **Variant propagation via per-axis lookup.** The molecule's `size` axis
  drives the track dimensions, thumb size, checked-state translate distance,
  inline-label wrapper gap, and label font size in lockstep. The `variant`
  axis only affects the checked-state track color.
- **No `className` flows downward.** The molecule does not accept `className`,
  nor does it forward any consumer-supplied class string into the Radix Root,
  Thumb, or inline `<label>`. If a styling knob is missing, add a variant
  axis.
- **Layer-import direction.** Switch imports `@/particles/cn` and
  `@radix-ui/react-switch`. It does NOT import other molecules, organisms,
  templates, pages, or providers — enforced by the `no-restricted-imports`
  rule in `eslint.config.mjs`.

## Accessibility

- Renders a native `<button>` with `role="switch"` and the appropriate
  `aria-checked` value via Radix.
- When `label` is provided, an auto-generated `id` links the switch to a
  `<label>` element via `htmlFor`; clicking the label toggles the switch.
- When `label` is omitted, supply `aria-label` or `aria-labelledby` so the
  switch has an accessible name.
- The label respects the switch's disabled state via the `peer-disabled`
  modifier (dimmed text and `not-allowed` cursor).
- Keyboard activation works via Space and Enter — Radix handles the binding
  on the native `<button>`.

## Do / Don't

- DO tune visuals through `size` and `variant`. If a knob isn't covered, add
  a variant axis — styling is the molecule's responsibility, not the
  consumer's.
- DO use the `label` prop for the common switch + label pair. The molecule
  wires the `htmlFor`/`id` pairing for you. DON'T omit both `label` and
  `aria-label[ledby]` — the switch still needs an accessible name.
- DO control checked state via `checked` + `onCheckedChange` when external
  state (a store, URL, parent component) drives the value. DO use
  `defaultChecked` for purely local uncontrolled state. DON'T mix the two on
  the same instance — pick one ownership model.
- DO use `variant="success"` for affirmative toggles (e.g. "enable feature")
  and `variant="destructive"` for toggles whose checked-state implies risk
  (e.g. "delete on save"). Use `default` when the toggle is neutral.
- DON'T pass `className` to Switch — the molecule rejects it at the type
  level. Compose with a parent wrapper for layout/spacing concerns that live
  outside the switch itself.
