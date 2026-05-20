# Card

Single-entry wrapper that folds shadcn's multi-part Card primitive (root +
header + title + description + content + footer) into one slot-based
component driven by `variant` and `padding` variants.

## Import

```ts
import { Card } from '@open-tomato/ui-skeleton';
```

## Props

| Prop        | Type                                            | Default     |
| ----------- | ----------------------------------------------- | ----------- |
| variant     | `'default' \| 'elevated' \| 'outlined'`         | `'default'` |
| padding     | `'none' \| 'sm' \| 'md' \| 'lg'`                | `'md'`      |
| header      | `ReactNode` (replaces default title/description) | —           |
| title       | `ReactNode`                                     | —           |
| description | `ReactNode`                                     | —           |
| footer      | `ReactNode`                                     | —           |
| children    | `ReactNode` (rendered in the content slot)      | —           |
| className   | `string` (discouraged escape hatch)             | —           |

All other props are forwarded to the underlying `<div>` root.

## Variants

| variant    | Visual                                       |
| ---------- | -------------------------------------------- |
| `default`  | Bordered surface, no shadow                  |
| `elevated` | Borderless surface with `shadow-elev-2`      |
| `outlined` | Transparent background with border           |

| padding | Section padding | Section gap |
| ------- | --------------- | ----------- |
| `none`  | `p-0`           | `gap-0`     |
| `sm`    | `p-3`           | `gap-3`     |
| `md`    | `p-4`           | `gap-4`     |
| `lg`    | `p-6`           | `gap-6`     |

The resolved variants are reflected on the rendered element as
`data-variant="<name>"` and `data-padding="<name>"` for downstream styling
and testing. Sections expose `data-slot="card-header" | "card-title" |
"card-description" | "card-content" | "card-footer"`.

## Accessibility

- Renders a generic `<div>` container; pass `role` (e.g. `"region"`,
  `"article"`) and `aria-labelledby` when the card represents a landmark
  region.
- `title` and `description` render in a default header layout but are not
  promoted to heading elements automatically — supply a `header` slot with
  the appropriate semantic markup when you need a real `<h2>` / `<h3>`.
- The wrapper does not introduce keyboard focus; wrap interactive content
  (e.g. the entire card as a link) using `asChild`-style composition at the
  consumer's discretion.

## Do / Don't

- DO use `variant` and `padding` to tune appearance. DON'T pass arbitrary
  `className` to override the surface, border, or spacing.
- DO use `title` / `description` for simple cards and the `header` slot for
  cards that need actions or custom heading levels.
- DON'T mix the `header` slot with `title` / `description` — `header`
  replaces the default header layout when present.
