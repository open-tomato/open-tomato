# Skeleton

Pure CVA wrapper rendered as a `<div>` for loading-state content placeholders. No underlying Radix primitive — the rendered element is a plain `<div>` so it composes safely inside cards, lists, table rows, etc.

## Import

```ts
import { Skeleton } from '@open-tomato/ui-skeleton';
```

## Props

| Prop      | Type                                 | Default   |
| --------- | ------------------------------------ | --------- |
| variant   | `'rect' \| 'circle' \| 'text'`       | `'rect'`  |
| animate   | `'pulse' \| 'wave' \| 'none'`        | `'pulse'` |
| className | `string` (escape hatch — see below)  | —         |

All other props are forwarded to the underlying `<div>`.

## Variants

| variant  | Shape                                              |
| -------- | -------------------------------------------------- |
| `rect`   | Rectangle with `rounded-md`                        |
| `circle` | Circle with `rounded-full` + `aspect-square`       |
| `text`   | Single-line text placeholder, `h-4` + `rounded-sm` |

| animate  | Behavior                                                                          |
| -------- | --------------------------------------------------------------------------------- |
| `pulse`  | Tailwind's built-in `animate-pulse` opacity oscillation                           |
| `wave`   | Horizontal shimmer gradient driven by the `--animate-wave` token in `globals.css` |
| `none`   | Static placeholder, no animation (use for reduced-motion contexts)                |

The resolved variants are reflected on the rendered element as `data-slot="skeleton"`, `data-variant="<name>"`, and `data-animate="<name>"` for downstream styling and testing.

## Sizing

The `variant` axis only controls shape — it does **not** set width or `rect`/`circle` height. Use Tailwind sizing utilities via `className` to size each skeleton:

```tsx
<Skeleton className="h-8 w-48" />
<Skeleton variant="circle" className="size-12" />
<Skeleton variant="text" className="w-2/3" />
```

This is the documented use of `className` for Skeleton — it is not the discouraged escape hatch pattern that applies to color/border/animation overrides.

## Accessibility

- Renders a plain `<div>` with no implicit ARIA role. Decorative by default.
- For announcing loading state to assistive tech, wrap one or more skeletons in a parent live region:

  ```tsx
  <div role="status" aria-live="polite" aria-label="Loading">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-4 w-24" />
    <span className="sr-only">Loading content</span>
  </div>
  ```

- Respect user motion preferences by passing `animate="none"` inside a `prefers-reduced-motion` branch, or set `animate="pulse"` (low-motion) instead of `wave` (higher motion).

## Do / Don't

- DO use `variant` for shape and `animate` for motion. DON'T pass arbitrary `className` to recolor, re-round, or replace the animation — extend the variants or this component instead.
- DO use `className` for sizing only (`w-*`, `h-*`, `size-*`).
- DO group multiple skeletons inside a `role="status"` live region when they represent a single loading unit.
- DON'T render skeletons forever — they are a transient placeholder and should be swapped for real content as soon as data is available.
