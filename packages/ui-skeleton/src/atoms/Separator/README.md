# Separator

Single-entry wrapper over Radix `@radix-ui/react-separator`. Renders a thin
divider between content with an `orientation` axis (horizontal | vertical) and
a `variant` axis controlling visual weight (default | subtle | strong).

## Import

```ts
import { Separator } from '@open-tomato/ui-skeleton';
```

## Props

| Prop        | Type                              | Default        |
| ----------- | --------------------------------- | -------------- |
| orientation | `'horizontal' \| 'vertical'`      | `'horizontal'` |
| variant     | `'default' \| 'subtle' \| 'strong'` | `'default'`  |
| decorative  | `boolean`                         | `true`         |

All other props (except `className`) are forwarded to the underlying Radix
Separator root. `className` is intentionally not part of the public API — use
the `variant` axis for visual weight and the `orientation` axis for geometry.

## Variants

| orientation  | Geometry                | Notes                                                    |
| ------------ | ----------------------- | -------------------------------------------------------- |
| `horizontal` | `h-px w-full`           | Default. Stretches across the parent block.              |
| `vertical`   | `h-full w-px`           | Requires a parent with explicit height (e.g. flex row).  |

| variant   | Color           | Use case                                              |
| --------- | --------------- | ----------------------------------------------------- |
| `default` | `bg-border`     | Standard divider between sections.                    |
| `subtle`  | `bg-border/50`  | Lower-weight grouping divider inside dense layouts.   |
| `strong`  | `bg-foreground/20` | Heavier divider for major content boundaries.      |

The resolved orientation is reflected on the root as
`data-orientation="<name>"` (set by Radix) plus `data-slot="separator"` and
`data-variant="<name>"` (set by this wrapper) for test/style hooks.

## Accessibility

- The wrapper defaults `decorative={true}` to match shadcn — the rendered
  element receives `role="none"` and is omitted from the accessibility tree.
  Use this when the divider is purely visual.
- Pass `decorative={false}` for a semantically meaningful divider. The
  rendered element then carries `role="separator"`; a vertical separator also
  gets `aria-orientation="vertical"` (horizontal is the default and omits the
  attribute).
- The wrapper does not impose a default size for vertical separators —
  consumers must constrain the parent height (e.g. flex row with a fixed
  height) for the `h-full w-px` geometry to be visible.

## Do / Don't

- DO use the `variant` axis to express importance. If a recurring weight is
  missing, add a new variant rather than reaching for inline overrides.
- DO use `orientation="vertical"` inside flex/inline layouts; ensure the
  parent has a height so `h-full` resolves to a visible stroke.
- DO pass `decorative={false}` when the divider conveys real semantic
  structure (e.g. between list groups). DON'T leave `decorative` truthy on
  separators that are required to be announced to assistive tech.
- DO wrap the separator in a parent container for spacing and positioning —
  the atom itself does not own layout concerns.
