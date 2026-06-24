# Skeleton

Pure CVA wrapper rendered as a `<div>` for loading-state content placeholders. No underlying Radix primitive — the rendered element is a plain `<div>` so it composes safely inside cards, lists, table rows, etc.

## Import

```ts
import { Skeleton } from '@open-tomato/ui-skeleton';
```

## Props

| Prop    | Type                                     | Default   |
| ------- | ---------------------------------------- | --------- |
| variant | `'rect' \| 'circle' \| 'text'`           | `'rect'`  |
| animate | `'pulse' \| 'wave' \| 'none'`            | `'pulse'` |
| width   | `string \| number`                       | —         |
| height  | `string \| number`                       | —         |
| size    | `string \| number` (overrides w/h)       | —         |

All other props are forwarded to the underlying `<div>`. `className` and `style` are intentionally NOT public — sizing is controlled exclusively through `width` / `height` / `size`.

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

The `variant` axis only controls shape — it does **not** set width or `rect`/`circle` height. Pass explicit dimensions through `width`, `height`, or `size`:

```tsx
<Skeleton width={192} height={32} />
<Skeleton variant="circle" size={48} />
<Skeleton variant="text" width="66%" />
```

Numbers are emitted as `${n}px`; strings (e.g. `'66%'`, `'2rem'`, `'100%'`) pass through unchanged. `size` is shorthand for setting both `width` and `height` to the same value, and overrides them when provided alongside.

## Accessibility

- Renders a plain `<div>` with no implicit ARIA role. Decorative by default.
- For announcing loading state to assistive tech, wrap one or more skeletons in a parent live region:

  ```tsx
  <div role="status" aria-live="polite" aria-label="Loading">
    <Skeleton width={128} height={16} />
    <Skeleton width={96} height={16} />
    <span className="sr-only">Loading content</span>
  </div>
  ```

- Respect user motion preferences by passing `animate="none"` inside a `prefers-reduced-motion` branch, or set `animate="pulse"` (low-motion) instead of `wave` (higher motion).

## Do / Don't

- DO use `variant` for shape and `animate` for motion.
- DO use `width` / `height` / `size` to set explicit dimensions.
- DO compose with parent wrappers when positioning or spacing skeletons inside a layout.
- DO group multiple skeletons inside a `role="status"` live region when they represent a single loading unit.
- DON'T render skeletons forever — they are a transient placeholder and should be swapped for real content as soon as data is available.
