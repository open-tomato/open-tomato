# Avatar

Single-entry wrapper over Radix `@radix-ui/react-avatar`. Folds the Radix root, image, and fallback sub-components into one slot-based component driven by `size` and `shape` variants.

## Import

```ts
import { Avatar } from '@open-tomato/ui-skeleton';
```

## Props

| Prop                   | Type                                        | Default    |
| ---------------------- | ------------------------------------------- | ---------- |
| size                   | `'sm' \| 'md' \| 'lg' \| 'xl'`              | `'md'`     |
| shape                  | `'circle' \| 'square'`                      | `'circle'` |
| src                    | `string`                                    | —          |
| alt                    | `string` (required when `src` is set)       | `''`       |
| fallback               | `ReactNode` (typically initials)            | —          |
| fallbackDelayMs        | `number` (ms before fallback paints)        | —          |
| onLoadingStatusChange  | `(status) => void`                          | —          |
| imageProps             | non-styling `<img>` attrs (e.g. `referrerPolicy`, `crossOrigin`) | — |

All other Radix Avatar root props (except `className`) are forwarded to the
underlying `<span>`. `className` is not part of the public API — styling is
controlled exclusively through `size` and `shape`.

## Variants

| size | Rendered |
| ---- | -------- |
| `sm` | 32×32 px |
| `md` | 40×40 px |
| `lg` | 48×48 px |
| `xl` | 64×64 px |

| shape    | Radius          |
| -------- | --------------- |
| `circle` | `rounded-full`  |
| `square` | `rounded-md`    |

The resolved variants are reflected on the rendered element as `data-size="<name>"` and `data-shape="<name>"` for downstream styling and testing.

## Accessibility

- Renders a `<span role="img">`-equivalent container; provide a meaningful `alt` whenever `src` is set.
- When only `fallback` is rendered, the fallback content should be a recognizable label (e.g. user initials) so screen readers convey identity.
- The fallback is announced while the image loads; use `fallbackDelayMs` to avoid flashing initials on fast networks.
- The wrapper does not introduce keyboard focus; wrap in a focusable element (button, link) if interaction is required.

## Do / Don't

- DO use `size` and `shape` for visual tuning. If a knob is missing, add a
  variant axis — Avatar has no `className` escape hatch.
- DO compose Avatar inside parent wrappers that handle layout (spacing,
  positioning, alignment). The avatar itself does not own its own positioning
  context.
- DO supply `fallback` (initials or an icon) so the avatar remains meaningful
  when the image is missing or fails to load.
- DO provide a meaningful `alt` whenever `src` is set. DON'T ship an image
  avatar without an accessible name.
- DON'T compose multiple `Avatar` wrappers to render an avatar group — that
  pattern belongs in a molecule.
