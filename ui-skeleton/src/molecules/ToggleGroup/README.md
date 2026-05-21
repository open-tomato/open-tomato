# ToggleGroup

Single-encapsulated wrapper over Radix's ToggleGroup primitive
(`@radix-ui/react-toggle-group`). Each descriptor in `items` is rendered as a
`<RadixToggleGroup.Item asChild>` wrapping the project's Toggle atom — so the
Toggle atom is the actual rendered element and the molecule's `variant` and
`size` axes propagate per-item via the Toggle's own variants.

## Import

```ts
import { ToggleGroup } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                            | Default        |
| ------------- | ----------------------------------------------- | -------------- |
| type          | `'single' \| 'multiple'`                        | —              |
| items         | `ToggleGroupItemDescriptor[]`                   | —              |
| variant       | `'default' \| 'outline'`                        | `'default'`    |
| size          | `'sm' \| 'md' \| 'lg'`                          | `'md'`         |
| orientation   | `'horizontal' \| 'vertical'`                    | `'horizontal'` |
| value         | `string` (single) \| `string[]` (multiple)      | —              |
| defaultValue  | `string` (single) \| `string[]` (multiple)      | —              |
| onValueChange | `(value: string) => void` (single) \| `(value: string[]) => void` (multiple) | — |
| disabled      | `boolean` (disables the entire group)           | `false`        |
| loop          | `boolean` (roving-focus wrap)                   | `true`         |
| dir           | `'ltr' \| 'rtl'`                                | —              |
| rovingFocus   | `boolean`                                       | `true`         |

The `type` discriminator narrows `value` / `defaultValue` / `onValueChange`
through TypeScript's discriminated-union handling — single-mode operates on a
single `string`, multiple-mode operates on a `string[]`. All other props are
forwarded to the underlying Radix ToggleGroup Root (a `<div>` with the
appropriate `data-orientation`). `className` is not a public prop — styling is
controlled exclusively through `variant`, `size`, and `orientation`.

### ToggleGroupItemDescriptor

| Field     | Type        | Default | Notes                                                              |
| --------- | ----------- | ------- | ------------------------------------------------------------------ |
| value     | `string`    | —       | Form value; unique per group; doubles as the React key             |
| label     | `ReactNode` | —       | Inline content rendered inside the underlying Toggle atom          |
| ariaLabel | `string`    | —       | Forwarded to the underlying Toggle as `aria-label` (icon-only)     |
| disabled  | `boolean`   | `false` | Disables this individual toggle                                    |

## Variants

| size | Toggle dimensions  |
| ---- | ------------------ |
| `sm` | `h-8 px-2.5`       |
| `md` | `h-9 px-3`         |
| `lg` | `h-10 px-4`        |

| variant   | Toggle frame                                                          |
| --------- | --------------------------------------------------------------------- |
| `default` | Transparent base; tinted accent on `data-state="on"`                  |
| `outline` | Bordered base; tinted accent on `data-state="on"`                     |

| orientation  | Layout                          |
| ------------ | ------------------------------- |
| `horizontal` | `flex-row gap-1`                |
| `vertical`   | `flex-col gap-1`                |

The resolved values are reflected on the rendered Root as
`data-slot="toggle-group"`, `data-variant`, and `data-size`. Radix sets
`data-orientation="horizontal" | "vertical"` on the Root and
`data-state="on" | "off"` on each individual Toggle for downstream styling
and testing. Each composed Toggle also carries its own
`data-slot="toggle"`, `data-variant`, and `data-size` markers.

## Composition

- **Composed primitive:** `@radix-ui/react-toggle-group` provides the Root and
  Item sub-components, including roving-focus, controlled / uncontrolled state,
  and single / multiple selection modes. The Root renders a `<div>` with
  `role="group"` and the appropriate `data-orientation`.
- **Each item is a Toggle atom.** `<RadixToggleGroup.Item asChild>` projects
  Radix's pressed-state plumbing onto the Toggle atom rendered as its child —
  so the Toggle is the actual `<button>` in the DOM, with `data-state="on"`
  driving its `data-[state=on]:bg-accent` styling. This is how the molecule's
  `variant` and `size` axes propagate per-item: they are passed directly to
  every composed Toggle, which owns the visual styling.
- **Variant propagation via direct passthrough.** The molecule's `variant`
  and `size` map 1:1 to the Toggle atom's same-named axes — no lookup table is
  needed because the axes are identical. The `orientation` axis only affects
  the Root layout and Radix's roving-focus direction.
- **No `className` flows downward.** The molecule does not accept `className`,
  nor does it forward any consumer-supplied class string into the Radix Root,
  Item, or the composed Toggle atom. The Toggle atom itself rejects `className`
  at the type level. If a styling knob is missing, add a variant axis.
- **Layer-import direction.** ToggleGroup imports `@/atoms/Toggle`,
  `@/particles/cn`, and `@radix-ui/react-toggle-group`. It does NOT import
  other molecules, organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- Renders a `<div>` with `role="group"` and `data-orientation` matching the
  resolved `orientation` via Radix.
- Each item renders a `<button>` with `aria-pressed` reflecting its current
  pressed state via the Toggle atom's underlying Radix Toggle.
- Supply a group-level `aria-label` or `aria-labelledby` so the group has an
  accessible name distinct from any individual toggle's label.
- For icon-only toggles, supply `ariaLabel` on the descriptor — it is
  forwarded to the Toggle as `aria-label` so the control still has an
  accessible name.
- Keyboard navigation works via Arrow keys (Radix roving-focus); Space and
  Enter toggle the focused item.
- Disabled items receive a real `disabled` attribute on the underlying
  `<button>`.

## Do / Don't

- DO tune visuals through `variant`, `size`, and `orientation`. If a knob
  isn't covered, add a variant axis — styling is the molecule's
  responsibility, not the consumer's.
- DO supply a group-level `aria-label` or `aria-labelledby` to name the
  toggle group. DON'T omit it — assistive tech needs the group's purpose.
- DO supply `ariaLabel` on each descriptor when the visual `label` is an icon
  or single-character glyph. DON'T rely on icon glyphs alone for the
  accessible name.
- DO pick `type='single'` for radio-style selection and `type='multiple'` for
  independent toggles. DON'T attempt to switch `type` mid-flight on the same
  instance — TypeScript treats the two as separate discriminated branches and
  the runtime state model differs (string vs string[]).
- DO control selection via `value` + `onValueChange` when external state
  drives the choice. DO use `defaultValue` for purely local uncontrolled
  state. DON'T mix the two on the same instance.
- DON'T pass `className` to ToggleGroup — the molecule rejects it at the type
  level, and so does the Toggle atom underneath. Compose with a parent
  wrapper for layout / spacing concerns outside the group itself.
- DON'T reuse the same `value` across items in a single group — `value`
  doubles as the React key, the Radix selection identifier, and the form
  value; collisions break selection.
