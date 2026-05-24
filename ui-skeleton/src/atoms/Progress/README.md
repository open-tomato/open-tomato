# Progress

Single-entry wrapper over Radix `@radix-ui/react-progress`. Renders a track
(`role="progressbar"`) with an inner indicator translated horizontally to
reflect the current `value` against `max`.

## Import

```ts
import { Progress } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                                         | Default     |
| ------------- | ------------------------------------------------------------ | ----------- |
| variant       | `'default' \| 'success' \| 'warning' \| 'destructive'`       | `'default'` |
| size          | `'sm' \| 'md' \| 'lg'`                                       | `'md'`      |
| value         | `number \| null \| undefined`                                | —           |
| max           | `number`                                                     | `100`       |
| getValueLabel | `(value: number, max: number) => string`                     | —           |

All other props are forwarded to the underlying Radix Progress root (which
renders the track `<div role="progressbar">`). `className` is not a public
prop — styling is controlled exclusively through `variant` and `size`.

## Variants

| variant       | Track             | Indicator        |
| ------------- | ----------------- | ---------------- |
| `default`     | `bg-secondary`    | `bg-primary`     |
| `success`     | `bg-emerald-100`  | `bg-emerald-500` |
| `warning`     | `bg-amber-100`    | `bg-amber-500`   |
| `destructive` | `bg-destructive/20` | `bg-destructive` |

| size | Height   |
| ---- | -------- |
| `sm` | `h-1.5`  |
| `md` | `h-2.5`  |
| `lg` | `h-4`    |

The resolved variant and size are reflected on the track as
`data-variant="<name>"` and `data-size="<name>"`. The indicator carries
`data-slot="progress-indicator"` for downstream styling and testing hooks.

`success` and `warning` use Tailwind palette colors (emerald / amber) because
the design-system token set in this iteration does not include semantic
`--color-success` / `--color-warning`. Replace with semantic tokens when they
land without breaking the public variant API.

## Accessibility

- The track renders with `role="progressbar"` and the standard `aria-valuemin`
  / `aria-valuemax` / `aria-valuenow` attributes managed by Radix.
- Always provide an accessible name via `aria-label` or `aria-labelledby` so
  the bar's purpose is announced.
- Pass `value={null}` (or omit) to signal indeterminate progress; Radix sets
  `data-state="indeterminate"` and the indicator runs a continuous left-to-right
  sweep via the `--animate-progress-indeterminate` token: a `1.5s` loop with an
  `ease-in-out` curve, repeating infinitely. The keyframe slides the indicator
  from `translateX(-100%)` (off-screen left) to `translateX(400%)` (off-screen
  right), so the bar appears to traverse the full track each cycle. The
  animation respects the user agent's `prefers-reduced-motion` setting through
  Tailwind's built-in motion utilities. Pair with an accessible status message
  (`role="status"` or `aria-live="polite"`) so screen reader users are informed
  that work is in progress — the visual sweep alone is not an accessible signal.
- `value` is clamped to `[0, max]` before the indicator transform is computed,
  so out-of-range inputs do not visually overflow the track.
- Use `getValueLabel` to customize the human-readable label of the current
  value when the raw percentage is not meaningful (e.g. `"3 of 10 steps"`).

## Do / Don't

- DO use `variant` to communicate the state (in-flight, success, warning,
  failure). If a knob isn't covered, add a variant axis rather than reaching
  for a class override — styling is the atom's responsibility.
- DO compose with a parent wrapper for layout, sizing, or alignment concerns
  that live outside the bar itself.
- DO pass a `value` between `0` and `max`. DON'T pass `NaN` or strings — the
  wrapper assumes a finite number.
- DO supply an `aria-label` (or `aria-labelledby`) so the bar has an
  accessible name. DON'T rely on surrounding text alone.
- DO use `value={null}` for indeterminate progress and wrap the bar in your
  own status region — the wrapper drives a `1.5s` left-to-right sweep via the
  `--animate-progress-indeterminate` token, but the visual loop alone is not
  an accessible signal.
