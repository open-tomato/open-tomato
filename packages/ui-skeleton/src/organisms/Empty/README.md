# Empty

Composition-only organism that frames a "no content yet" surface by composing
the `Card` and `Typography` atoms into a vertically stacked, centered
placeholder. Optional `actions` slot renders a wrapped row of buttons beneath
the description. Authored from scratch — no Radix dependency, no portal, no
internal state.

## Import

```ts
import { Empty } from '@open-tomato/ui-skeleton';
```

## Props

| Prop        | Type                                            | Default     |
| ----------- | ----------------------------------------------- | ----------- |
| size        | `'sm' \| 'md' \| 'lg'`                          | `'md'`      |
| tone        | `'neutral' \| 'info'`                           | `'neutral'` |
| leading     | `ReactNode`                                     | —           |
| title       | `ReactNode`                                     | —           |
| description | `ReactNode`                                     | —           |
| actions     | `ReactNode` (centered, wrapping row of buttons) | —           |

All other props are forwarded to the rendered Card root (a `<div>`).
`className` is not a public prop — styling is controlled exclusively through
`size` and `tone`.

## Variants

| size | Card padding   | Title typography | Body gap | Actions gap |
| ---- | -------------- | ---------------- | -------- | ----------- |
| `sm` | `padding="sm"` | `variant="h5"`   | `gap-2`  | `gap-1.5`   |
| `md` | `padding="md"` | `variant="h4"`   | `gap-3`  | `gap-2`     |
| `lg` | `padding="lg"` | `variant="h3"`   | `gap-4`  | `gap-3`     |

| tone      | Leading icon tint                       |
| --------- | --------------------------------------- |
| `neutral` | `text-muted-foreground` (subdued)       |
| `info`    | `text-primary` (highlighted)            |

The resolved variants are reflected on the rendered root as
`data-slot="empty-root"`, `data-size="<name>"`, and `data-tone="<name>"`. The
Card padding axis surfaces as `data-padding="<name>"` on the same element.
Slots expose `data-slot="empty-body" | "empty-leading" | "empty-actions"`.

## Composition

- **Composed atoms:** `Card` provides the surface (root + content section
  padding) and `Typography` renders the title (variant chosen by `size`) and
  the description (`variant="caption"`). The vertical stack and centered
  alignment live on the inner `data-slot="empty-body"` `<div>` so the Card's
  own column gap stays free for downstream additions.
- **Variant propagation via lookup tables.** The organism owns the mapping
  from its own axes to each composed atom's axes:

  ```ts
  const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const titleVariantForSize = { sm: 'h5', md: 'h4', lg: 'h3' } as const;
  ```

  `size` maps to `Card`'s `padding` axis (passthrough) and to `Typography`'s
  `variant` axis (explicit lookup). `tone` tints the leading-icon slot via a
  descendant selector in `emptyBodyVariants` — composed atoms are never
  passed `className`.
- **No `className` flows downward.** `Card` and `Typography` both reject
  `className` at the type level. If a knob the variants don't cover is
  needed, add a variant axis on the atom OR on Empty — don't open an escape
  hatch.
- **Slot prop vocabulary.** `leading`, `title`, `description`, and `actions`.
  Slot content renders raw inside its `<span>` / `<Typography>` / `<div>`
  wrapper; Empty does not inject styling into consumer-supplied nodes (the
  `data-slot` wrappers exist for testing and tone-tint targeting only).
- **Layer-import direction.** Empty imports `@/atoms/Card`,
  `@/atoms/Typography`, and `@/particles/cn`. It does NOT import other
  organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- The leading slot is wrapped in a `<span aria-hidden>` because the icon is
  decorative — the title and description carry the meaning.
- Empty does not impose an ARIA role. When the surface appears asynchronously
  (e.g., after a fetch resolves with zero results) and should be announced by
  assistive tech, forward `role="status"` (with the default `aria-live="polite"`)
  through the spread props.
- The title is rendered as a real heading element (`<h3>` / `<h4>` / `<h5>`
  per `size`) via Typography, so the surface participates in the document
  outline.
- Tone tints come from text-color utilities only; do not rely on color alone
  to communicate state — pair with the title text and (optionally) a
  recognizable leading icon.

## Do / Don't

- DO tune visuals through `size` and `tone`. DO compose with a parent
  wrapper for sizing or positioning concerns (margins, grid placement) — the
  wrapper is the right surface for layout, not the Empty.
- DO use `tone="info"` when the surface conveys an actionable next step (a
  filter the user can clear, a CTA in `actions`). DO use `tone="neutral"`
  for purely descriptive "nothing here yet" surfaces.
- DO put recovery / CTA buttons inside `actions` so they render in the
  centered wrapping row beneath the description. DON'T inline them in
  `description`.
- DON'T pass `className` to Empty or to any composed atom — atoms reject it
  at the type level. If a styling knob is missing, add a variant axis.
- DON'T render a heading element inside `title` — Typography already renders
  one based on the resolved `size` (`h3` / `h4` / `h5`). Pass plain text
  (or inline `ReactNode`) and let the variant pick the tag.
