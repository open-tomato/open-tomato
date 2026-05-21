# ScrollArea

Single-entry wrapper over Radix `@radix-ui/react-scroll-area`. Renders a root +
viewport + one or two custom scrollbars (with thumbs) + an optional corner,
driven by per-part variant axes for orientation, outer frame, and inner viewport
padding.

## Import

```ts
import { ScrollArea } from '@open-tomato/ui-skeleton';
```

## Props

| Prop            | Type                                                | Default      |
| --------------- | --------------------------------------------------- | ------------ |
| orientation     | `'vertical' \| 'horizontal' \| 'both'`              | `'vertical'` |
| frame           | `'none' \| 'bordered' \| 'card'`                    | `'none'`     |
| viewportPadding | `'none' \| 'sm' \| 'md' \| 'lg'`                    | `'none'`     |
| dir             | `'ltr' \| 'rtl'`                                    | inherits     |
| type            | `'auto' \| 'always' \| 'scroll' \| 'hover'`         | `'hover'`    |
| scrollHideDelay | `number` (ms)                                       | `600`        |
| viewportProps   | `Omit<ViewportProps, 'children' \| 'className'>`    | —            |
| scrollbarProps  | `Omit<ScrollbarProps, 'orientation' \| 'children' \| 'className'>` | — |

All other props are forwarded to the underlying Radix ScrollArea root. `type`
and `scrollHideDelay` come from Radix and control when the custom scrollbar is
visible. `viewportProps` and `scrollbarProps` are non-styling escape hatches for
native attributes (e.g. `tabIndex`, `forceMount`, `hidden`); they cannot supply
`className`.

## Variants

### orientation

| orientation  | Scrollbars rendered            | Corner | Notes                                                 |
| ------------ | ------------------------------ | ------ | ----------------------------------------------------- |
| `vertical`   | vertical                       | —      | Default. Content lays out as usual.                   |
| `horizontal` | horizontal                     | —      | Pair with `whitespace-nowrap` / `flex w-max` content. |
| `both`       | vertical + horizontal          | ✓      | Adds the corner cell between bars.                    |

### frame

| frame      | Effect on the root                            | Use for                                              |
| ---------- | --------------------------------------------- | ---------------------------------------------------- |
| `none`     | No border, no background.                     | Default. The scroll region blends into its parent.   |
| `bordered` | `border` + `rounded-md` on the root.          | Visible frame around the scroll region.              |
| `card`     | `border` + `rounded-md` + `bg-card` on root.  | Scroll region that reads as a discrete surface.      |

### viewportPadding

| viewportPadding | Inner viewport padding | Use for                                                 |
| --------------- | ---------------------- | ------------------------------------------------------- |
| `none`          | none                   | Default. Content controls its own padding.              |
| `sm`            | `p-2`                  | Tight rows in dense lists.                              |
| `md`            | `p-4`                  | Comfortable padding around content.                     |
| `lg`            | `p-6`                  | Roomy padding for hero-style scroll regions.            |

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
  root with `h-*` / `w-*` on a parent wrapper element for scrolling to be
  meaningful.

## Do / Don't

- DO constrain the root by wrapping it in a sized parent (`<div className="h-72 w-48">`).
  DON'T expect the scrollbars to appear without overflow.
- DO use `orientation="horizontal"` together with `whitespace-nowrap` or a
  `flex w-max` inner row so content actually overflows horizontally.
- DO choose the visible chrome with the `frame` axis and the inner padding
  with the `viewportPadding` axis. DON'T try to recreate either with parent
  classes — `bg-card` on the wrapper won't follow the scrollbar's rounded
  corners and outside padding fights the scrollbar gutter.
- DO use `orientation="both"` when content overflows on both axes. DON'T
  render `both` for content that only overflows on one axis — the extra
  scrollbar adds visual noise.
