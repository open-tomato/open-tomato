# ScrollArea

Single-entry wrapper over Radix `@radix-ui/react-scroll-area`. Renders a root +
viewport + one or two custom scrollbars (with thumbs) + an optional corner,
driven by a single `orientation` axis.

## Import

```ts
import { ScrollArea } from '@open-tomato/ui-skeleton';
```

## Props

| Prop           | Type                                       | Default      |
| -------------- | ------------------------------------------ | ------------ |
| orientation    | `'vertical' \| 'horizontal' \| 'both'`     | `'vertical'` |
| dir            | `'ltr' \| 'rtl'`                           | inherits     |
| type           | `'auto' \| 'always' \| 'scroll' \| 'hover'` | `'hover'`   |
| scrollHideDelay | `number` (ms)                             | `600`        |
| viewportProps  | `Omit<ViewportProps, 'children'>`          | —            |
| scrollbarProps | `Omit<ScrollbarProps, 'orientation' \| 'children'>` | —    |
| className      | `string` (escape hatch on the root frame)  | —            |

All other props are forwarded to the underlying Radix ScrollArea root. `type`
and `scrollHideDelay` come from Radix and control when the custom scrollbar is
visible.

## Variants

| orientation  | Scrollbars rendered            | Corner | Notes                                 |
| ------------ | ------------------------------ | ------ | ------------------------------------- |
| `vertical`   | vertical                       | —      | Default. Content lays out as usual.   |
| `horizontal` | horizontal                     | —      | Pair with `whitespace-nowrap` / `flex w-max` content. |
| `both`       | vertical + horizontal          | ✓      | Adds the corner cell between bars.    |

The resolved orientation is reflected on the root as
`data-orientation="<name>"`. Each rendered scrollbar carries
`data-slot="scroll-area-scrollbar"` plus the Radix-managed
`data-orientation="vertical|horizontal"`. The viewport carries
`data-slot="scroll-area-viewport"`, the thumb `data-slot="scroll-area-thumb"`,
and the corner (when present) `data-slot="scroll-area-corner"`.

## Accessibility

- The viewport is keyboard-scrollable; Radix manages `aria-hidden` on the
  custom scrollbars so AT does not announce them.
- Provide an accessible name via `aria-label` (or `aria-labelledby`) on the
  root so the scrollable region is announced.
- The wrapper does NOT override `type` — by default Radix shows scrollbars on
  hover (`type="hover"`). Pass `type="always"` for users who need persistent
  scrollbar indicators.
- The wrapper does NOT impose a default size. Consumers must constrain the
  root with `h-*` / `w-*` (or another sizing strategy) for scrolling to be
  meaningful.

## Do / Don't

- DO constrain the root with explicit width and/or height. DON'T expect the
  scrollbars to appear without overflow.
- DO use `orientation="horizontal"` together with `whitespace-nowrap` or a
  `flex w-max` inner row so content actually overflows horizontally.
- DO pass `className` for the visible frame (border, rounding, padding on a
  wrapper element) and `viewportProps.className` for the inner scrollable
  region. DON'T mix the two — `className` does not reach the viewport.
- DO use `orientation="both"` when content overflows on both axes. DON'T
  render `both` for content that only overflows on one axis — the extra
  scrollbar adds visual noise.
