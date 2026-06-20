# Popover

Portal-based molecule that wraps Radix's Popover primitive into a single
encapsulated component. Pairs a consumer-supplied `trigger` element with a
portaled content surface that optionally composes the `Card` atom for a
structured header layout when `title` and/or `description` are provided.

## Import

```ts
import { Popover } from '@open-tomato/ui-skeleton';
```

## Props

| Prop         | Type                                                  | Default    |
| ------------ | ----------------------------------------------------- | ---------- |
| trigger      | `React.ReactElement` (required)                       | —          |
| size         | `'sm' \| 'md' \| 'lg'`                                | `'md'`     |
| placement    | `'top' \| 'right' \| 'bottom' \| 'left'`              | `'bottom'` |
| align        | `'start' \| 'center' \| 'end'`                        | `'center'` |
| title        | `ReactNode` (switches molecule into Card composition) | —          |
| description  | `ReactNode` (switches molecule into Card composition) | —          |
| children     | `ReactNode`                                           | —          |
| contentProps | `Omit<RadixContentProps, 'className' \| 'side' \| 'align' \| 'children'>` | — |
| modal        | `boolean`                                             | `false`    |
| open / defaultOpen / onOpenChange | Forwarded to Radix `Root`                | —          |

`className` is not a public prop — styling is controlled exclusively
through `size`, `placement`, and `align`. The `contentProps` bag forwards
Radix Content props (focus handlers, collision boundary, side offsets)
while explicitly excluding `className` so no escape hatch leaks into the
portaled element.

## Variants

| size | Content width | Card padding / Surface padding |
| ---- | ------------- | ------------------------------ |
| `sm` | `w-56`        | `p-3`                          |
| `md` | `w-72`        | `p-4`                          |
| `lg` | `w-96`        | `p-5`                          |

When `title` or `description` is set, the molecule composes the `Card`
atom (`variant="elevated"`) inside the portaled Content; otherwise
`children` renders directly with surface styling supplied by
`popoverContentSurfaceVariants` (rounded border + `bg-background` +
`shadow-elev-2` + padding from the size axis).

`data-slot="popover-content"` and `data-size` are reflected on the
rendered Content for testing and downstream styling. Radix Popover
additionally sets `data-state="open" | "closed"`, `data-side`, and
`data-align` on the same element after collision detection runs.

## Composition

- **Composed atoms:** `Card` (variant `elevated`) when `title` or
  `description` is provided. Otherwise the portaled Content carries the
  surface styling itself via `popoverContentSurfaceVariants`.
- **Variant propagation via lookup table:**

  ```ts
  const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  ```

  `size` maps to the `Card`'s `padding` axis (passthrough) when Card is
  composed, and to the surface variant's padding (`p-3` / `p-4` / `p-5`)
  when Card is not composed.
- **No `className` flows downward.** The composed `Card` atom rejects
  `className` at the type level. The `contentProps` bag explicitly omits
  `'className'` so consumers cannot inject styling into the portaled
  Content. If a styling knob is missing, add a variant axis.
- **Trigger pattern.** `trigger` is required and typed as
  `React.ReactElement` (NOT `ReactNode`) so the molecule can wrap it via
  `<RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>`.
  Fragments, strings, arrays, and `null` throw at runtime when Radix
  calls `React.cloneElement` — the element constraint surfaces this at
  compile time.
- **Layer-import direction.** Popover imports `@/atoms/Card` and
  `@/particles/cn` (plus `@radix-ui/react-popover`). It does NOT import
  other molecules, organisms, templates, pages, or providers — enforced
  by the `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- The trigger inherits its accessible name from the consumer-supplied
  element (typically a `Button`). Always provide one — Radix's `asChild`
  projects the trigger ARIA wiring onto your element.
- The portaled Content carries Radix's `role="dialog"` semantics with
  `aria-expanded` toggled on the trigger and `aria-controls` linking
  them. When the consumer does not provide a heading via `title` or via
  `contentProps={{ 'aria-label': ... }}`, axe will flag the dialog as
  unnamed — pass one of those for compliant popovers.
- `modal={false}` (default) keeps background pointer events live; pass
  `modal` for a true dialog-like interaction that traps focus.

## Do / Don't

- DO compose a `<Button>` (or any single React element with an accessible
  name) as the `trigger`. DON'T pass a fragment, string, array, or `null`
  — Radix's `asChild` requires a single element child.
- DO tune visuals through `size`, `placement`, and `align`. DON'T pass
  `className` to Popover or to the composed Card.
- DO use `title` / `description` for structured headers. DON'T also
  render your own `<Card>` inside `children` when title/description is
  set — the surface would double up.
- DO supply an accessible name (`title`, or `contentProps={{ 'aria-label':
  ... }}`) so the portaled dialog has a usable announcement. DON'T leave
  a portaled popover without one.
