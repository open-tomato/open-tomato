# AspectRatio

Single-entry wrapper over Radix `@radix-ui/react-aspect-ratio`. Locks the rendered box to a semantic aspect ratio (`square`, `video`, `portrait`).

## Import

```ts
import { AspectRatio } from '@open-tomato/ui-skeleton';
```

## Props

| Prop     | Type                                | Default   |
| -------- | ----------------------------------- | --------- |
| ratio    | `'square' \| 'video' \| 'portrait'` | `'video'` |
| children | `ReactNode`                         | —         |

All other props are forwarded to the underlying Radix primitive's inner `<div>`. Visual styling is controlled exclusively through the `ratio` variant — `className` is not a public prop.

## Variants

| ratio      | Numeric | Use case                                 |
| ---------- | ------- | ---------------------------------------- |
| `square`   | 1:1     | Avatars, tiles, gallery thumbnails       |
| `video`    | 16:9    | Hero images, video embeds, banners       |
| `portrait` | 3:4     | Profile cards, product shots, posters    |

The resolved variant is also reflected on the rendered element as `data-ratio="<name>"` for downstream styling and testing.

## Accessibility

- Renders a plain `<div>` wrapper — assistive technology sees only the children.
- Pair embedded media (e.g. `<img>`) with descriptive `alt` text inside the ratio container.
- The wrapper enforces dimensions only; it does not introduce focus or roles.

## Do / Don't

- DO use `ratio` to pick a semantic aspect.
- DO compose with a parent wrapper for sizing and positioning (`<div className="w-80"><AspectRatio …/></div>`).
- DO place a single ratio-filling child (image, video, or block-level element).
- DON'T nest multiple `AspectRatio` wrappers — the inner ratio will cancel the outer one.
