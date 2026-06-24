# ButtonGroup

Stateless molecule that composes N `Button` atoms into a single horizontal or
vertical group, optionally rendered as a segmented (attached) control. Common
use cases include toolbars, segmented controls (Day / Week / Month), and
side-by-side primary/secondary action pairs.

## Import

```ts
import { ButtonGroup } from '@open-tomato/ui-skeleton';
```

## Props

| Prop        | Type                                                                | Default        |
| ----------- | ------------------------------------------------------------------- | -------------- |
| orientation | `'horizontal' \| 'vertical'`                                        | `'horizontal'` |
| attached    | `boolean`                                                           | `false`        |
| size        | `'sm' \| 'md' \| 'lg' \| 'icon'`                                    | —              |
| variant     | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'destructive'` | —              |
| children    | `ReactNode` (one or more `Button` elements)                         | —              |

All other props are forwarded to the rendered `<div role="group">` root.
`className` is not a public prop — styling is controlled exclusively through
`orientation` and `attached`. `size` and `variant` are propagation knobs that
flow into each `Button` child via `React.cloneElement`.

## Variants

| orientation  | Wrapper layout |
| ------------ | -------------- |
| `horizontal` | `flex-row`     |
| `vertical`   | `flex-col`     |

| attached | Visual                                                                  |
| -------- | ----------------------------------------------------------------------- |
| `false`  | Free-standing buttons separated by `gap-2`                              |
| `true`   | Segmented look — neighboring borders collapse via negative margin and the inner edges of inner buttons drop their radius |

The resolved variants are reflected on the rendered root as
`data-orientation="<name>"` and `data-attached=""` (present only when true)
for downstream styling and testing. The wrapper exposes
`data-slot="button-group-root"`.

## Composition

ButtonGroup is a stateless composition molecule:

- **Composed atom:** `Button`. ButtonGroup never renders styling for the
  buttons themselves — it only owns the wrapper.
- **Variant propagation via `React.cloneElement`.** The group's `size` and
  `variant` props are injected onto each valid React element child, but only
  when the child does not already declare them. Per-button overrides always
  win:

  ```tsx
  <ButtonGroup variant="outline" size="md">
    <Button>Inherits</Button>
    <Button variant="destructive">Local override</Button>
  </ButtonGroup>
  ```

- **No `className` flows downward.** Buttons reject `className` at the type
  level. Attached styling is applied to the wrapper via neighbor-sibling
  Tailwind selectors (`[&>*:not(:first-child)]:-ml-px`, etc.) rather than by
  reaching into the Button atoms.
- **Layer-import direction.** ButtonGroup imports `@/atoms/Button` and
  `@/particles/cn`. It does NOT import other molecules, organisms, templates,
  pages, or providers — enforced by the `no-restricted-imports` rule in
  `eslint.config.mjs`.

## Accessibility

- Renders the wrapper as `<div role="group">` so assistive tech announces the
  related buttons as a single grouping.
- Pass `aria-label` (or `aria-labelledby`) on the group when the buttons
  share an implicit purpose (e.g. `aria-label="Text alignment"`). Without a
  label, screen readers fall back to enumerating each button individually.
- Focused buttons in `attached` mode are lifted with `position: relative;
  z-index: 10` so the focus ring isn't clipped by the next button's negative
  margin. Keyboard navigation still uses Tab — ButtonGroup does not implement
  arrow-key roving focus. Reach for a Radix `ToggleGroup` (via the
  `ToggleGroup` molecule) when arrow-key navigation is required.
- ButtonGroup does NOT manage selection state — every button independently
  triggers its own `onClick`. Use the `ToggleGroup` molecule for
  single-select or multi-select behavior.

## Do / Don't

- DO tune visuals through `orientation` and `attached`. DO use `size` and
  `variant` on the group to apply a shared treatment to every button at
  once.
- DO put per-button overrides on the `Button` itself when one item needs a
  different size or variant (e.g. a destructive action in an outline group).
- DO use `attached` for segmented controls and toolbars. DON'T use
  `attached` for primary/secondary action pairs — leave them separated with
  the default `gap-2` so the distinction is visually clear.
- DO supply `aria-label` when the group has a shared purpose. DON'T rely on
  visual ordering alone to communicate meaning.
- DON'T pass `className` to ButtonGroup or to its Button children — atoms
  reject it at the type level. If a styling knob is missing, add a variant
  axis.
- DON'T reach for ButtonGroup when you need single-select / multi-select
  state — use the `ToggleGroup` molecule instead.
