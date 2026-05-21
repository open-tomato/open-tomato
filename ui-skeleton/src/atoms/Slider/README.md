# Slider

Single-entry wrapper over Radix `@radix-ui/react-slider` (root + track + range +
thumb). One `size` axis scales the track thickness and thumb diameter together.
Supports single-thumb and multi-thumb (range) usage by passing an array
`value` / `defaultValue`.

## Import

```ts
import { Slider } from '@open-tomato/ui-skeleton';
```

## Props

| Prop            | Type                                                | Default                 |
| --------------- | --------------------------------------------------- | ----------------------- |
| size            | `'sm' \| 'md' \| 'lg'`                              | `'md'`                  |
| value           | `number[]`                                          | —                       |
| defaultValue    | `number[]`                                          | `[min, max]` (fallback) |
| min             | `number`                                            | `0`                     |
| max             | `number`                                            | `100`                   |
| step            | `number`                                            | `1`                     |
| orientation     | `'horizontal' \| 'vertical'`                        | `'horizontal'`          |
| disabled        | `boolean`                                           | `false`                 |
| onValueChange   | `(value: number[]) => void`                         | —                       |
| onValueCommit   | `(value: number[]) => void`                         | —                       |
| thumbAriaLabels | `string[]`                                          | `[aria-label, ...]`     |

All other props are forwarded to the underlying Radix Slider root (which
renders as `<span>` with `role="group"` and contains the track, range, and
one thumb per value entry).

## Variants

| size | Track thickness | Thumb diameter |
| ---- | --------------- | -------------- |
| `sm` | `h-1` / `w-1`   | `size-3`       |
| `md` | `h-1.5` / `w-1.5` | `size-4`     |
| `lg` | `h-2` / `w-2`   | `size-5`       |

The resolved size is reflected on the root as `data-size="<name>"`. Each
internal element is marked with `data-slot="slider"`, `data-slot="slider-track"`,
`data-slot="slider-range"`, or `data-slot="slider-thumb"` for downstream
styling and testing hooks. Radix sets `data-orientation` and `data-disabled`
on the root automatically — track styling reads `data-orientation` so a
single class block covers both axes.

## Accessibility

- Each thumb renders with `role="slider"` and the standard
  `aria-valuemin` / `aria-valuemax` / `aria-valuenow` attributes managed by
  Radix. Keyboard support (Arrow keys, Home, End, PageUp, PageDown) is
  provided out of the box.
- Always provide an accessible name via `aria-label` or `aria-labelledby`
  so each thumb's purpose is announced. The wrapper forwards these from the
  root to every thumb automatically (Radix puts `role="slider"` on the
  thumb, not the root, so the label must live on the thumb to satisfy
  `aria-input-field-name`).
- For multi-thumb range sliders with semantically distinct thumbs, pass
  `thumbAriaLabels={['Min', 'Max']}` so each thumb gets its own label
  instead of repeating the root's `aria-label`.
- The wrapper falls back to `[min, max]` when neither `value` nor
  `defaultValue` is provided so the range fill is visible in stories /
  docs. Pass `defaultValue={[n]}` (single-element array) for a single-thumb
  slider.
- `disabled` cascades to the root (`data-disabled`) and the underlying
  primitive blocks pointer + keyboard input.

## Do / Don't

- DO use `size` to scale track + thumb together. If a knob isn't covered,
  add a variant axis rather than reaching for a class override — styling is
  the atom's responsibility, not the consumer's.
- DO compose with a parent wrapper for layout, sizing, or alignment
  concerns that live outside the slider itself.
- DO supply an `aria-label` (or `aria-labelledby`) per slider so the thumb
  has an accessible name. DON'T rely on surrounding text alone.
- DO pass `defaultValue={[n]}` for a single-thumb slider and `[lo, hi]` for
  a range. DON'T pass a plain `number` — Radix expects `number[]`.
- DO use the `orientation="vertical"` prop for vertical sliders; the
  wrapper handles the data-orientation-driven track sizing automatically.
- DON'T render more than ~4 thumbs — interaction collapses when thumbs sit
  on top of one another. Use `minStepsBetweenThumbs` to enforce spacing.
