# HoverCard

Portal-based molecule that wraps Radix's HoverCard primitive into a single
encapsulated component. Pairs a consumer-supplied `trigger` element with a
portaled content surface composed via the `Card` atom (`variant="elevated"`)
for hover/focus-activated rich previews.

## Import

```ts
import { HoverCard } from '@open-tomato/ui-skeleton';
```

## Props

| Prop         | Type                                                  | Default    |
| ------------ | ----------------------------------------------------- | ---------- |
| trigger      | `React.ReactElement` (required)                       | —          |
| size         | `'sm' \| 'md' \| 'lg'`                                | `'md'`     |
| placement    | `'top' \| 'right' \| 'bottom' \| 'left'`              | `'bottom'` |
| children     | `ReactNode`                                           | —          |
| contentProps | `Omit<RadixContentProps, 'className' \| 'side' \| 'children'>` | — |
| openDelay    | `number` (ms before the card opens on hover/focus)    | `700`      |
| closeDelay   | `number` (ms before the card closes on blur/leave)    | `300`      |
| open / defaultOpen / onOpenChange | Forwarded to Radix `Root`                | —          |

`className` is not a public prop — styling is controlled exclusively
through `size` and `placement`. The `contentProps` bag forwards Radix
Content props (focus handlers, collision boundary, side offsets) while
explicitly excluding `className` so no escape hatch leaks into the
portaled element.

## Variants

| size | Content width | Card padding |
| ---- | ------------- | ------------ |
| `sm` | `w-56`        | `sm`         |
| `md` | `w-72`        | `md`         |
| `lg` | `w-96`        | `lg`         |

The molecule unconditionally composes the `Card` atom
(`variant="elevated"`) inside the portaled Content. The Card supplies
the surface (border, bg, shadow, padding); the HoverCard Content
controls only width and the open/close animations.

`data-slot="hover-card-content"` and `data-size` are reflected on the
rendered Content for testing and downstream styling. Radix HoverCard
additionally sets `data-state="open" | "closed"` and `data-side` on the
same element after collision detection runs.

## Composition

- **Composed atoms:** `Card` (variant `elevated`) — always wraps
  `children` to provide the surface treatment. Unlike `Popover`, the
  HoverCard does not fall back to inline surface styling; rich preview
  surfaces are the canonical hover-card use case.
- **Variant propagation via lookup table:**

  ```ts
  const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  ```

  `size` maps to the `Card`'s `padding` axis (passthrough) and to the
  Content's width via `hoverCardContentVariants`.
- **No `className` flows downward.** The composed `Card` atom rejects
  `className` at the type level. The `contentProps` bag explicitly omits
  `'className'` so consumers cannot inject styling into the portaled
  Content. If a styling knob is missing, add a variant axis.
- **Trigger pattern.** `trigger` is required and typed as
  `React.ReactElement` (NOT `ReactNode`) so the molecule can wrap it via
  `<RadixHoverCard.Trigger asChild>{trigger}</RadixHoverCard.Trigger>`.
  Fragments, strings, arrays, and `null` throw at runtime when Radix
  calls `React.cloneElement` — the element constraint surfaces this at
  compile time.
- **Layer-import direction.** HoverCard imports `@/atoms/Card` and
  `@/particles/cn` (plus `@radix-ui/react-hover-card`). It does NOT
  import other molecules, organisms, templates, pages, or providers —
  enforced by the `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- The trigger inherits its accessible name from the consumer-supplied
  element (typically a `Button` or anchor). Always provide one — Radix's
  `asChild` projects the trigger ARIA wiring onto your element.
- HoverCard is implicitly non-modal: background pointer events stay
  live, and focus is not trapped.
- Radix HoverCard activates on `pointer-enter`, `focus`, and the
  keyboard equivalents — but it does NOT auto-set an accessible name on
  the portaled Content. For screen-reader compliance, pass
  `contentProps={{ 'aria-label': '...' }}` describing the preview.
- `openDelay` / `closeDelay` tune the dwell behavior. Tests typically
  pass `openDelay={0}` to skip the hover delay deterministically.

## Do / Don't

- DO compose a `<Button>`, anchor, or any single React element with an
  accessible name as the `trigger`. DON'T pass a fragment, string,
  array, or `null` — Radix's `asChild` requires a single element child.
- DO tune visuals through `size` and `placement`. DON'T pass `className`
  to HoverCard or to the composed Card.
- DO render rich preview content (avatar + handle + bio, link preview,
  etc.) inside `children`. DON'T also wrap that content in your own
  `<Card>` — the surface would double up.
- DO supply an accessible name via `contentProps={{ 'aria-label': ...
  }}` so the portaled preview has a usable announcement. DON'T leave a
  portaled hover-card without one.
