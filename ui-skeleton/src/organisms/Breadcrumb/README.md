# Breadcrumb

Stateless items[]-driven organism that renders a navigation trail. The root
is a `<nav aria-label="Breadcrumb">` wrapping an ordered list (`<ol>`); each
descriptor in `items` resolves to either an anchored crumb, a current-page
span, or a presentation-only separator. Default separator is lucide-react's
`ChevronRight`. Authored from scratch — no Radix dependency, no portal, no
internal state.

## Import

```ts
import { Breadcrumb } from '@open-tomato/ui-skeleton';
```

## Props

| Prop       | Type                   | Default          |
| ---------- | ---------------------- | ---------------- |
| items      | `BreadcrumbItem[]`     | —                |
| size       | `'sm' \| 'md' \| 'lg'` | `'md'`           |
| aria-label | `string`               | `'Breadcrumb'`   |

All other props are forwarded to the rendered `<nav>` root. `className` is
not a public prop — styling is controlled exclusively through `size`.

`items` is a discriminated union of two descriptor shapes:

```ts
type BreadcrumbItem =
  | { type: 'crumb'; label: ReactNode; href?: string; current?: boolean }
  | { type: 'separator'; icon?: ReactNode };
```

The current crumb is resolved in this precedence:

1. Any crumb with `current: true` renders as `aria-current="page"` with no
   anchor, regardless of position or `href`.
2. Otherwise the last `type: 'crumb'` entry in `items` is treated as
   current.

When a crumb resolves as current AND carries an `href`, the `href` is
ignored — `aria-current="page"` is mutually exclusive with link semantics.

## Variants

| size | Root text | List gap | Separator icon |
| ---- | --------- | -------- | -------------- |
| `sm` | `text-xs` | `gap-1`  | `svg:size-3`   |
| `md` | `text-sm` | `gap-1.5`| `svg:size-3.5` |
| `lg` | `text-base` | `gap-2` | `svg:size-4`  |

The resolved size is reflected on the rendered root as
`data-slot="breadcrumb-root"` and `data-size="<name>"`. Subparts expose
`data-slot="breadcrumb-list"` on the `<ol>`, `data-slot="breadcrumb-item"`
on each crumb `<li>`, `data-slot="breadcrumb-link"` on anchored crumbs,
`data-slot="breadcrumb-page"` on the current-page span, and
`data-slot="breadcrumb-separator"` on each separator `<li>`.

## Composition

- **Composed atoms:** none — Breadcrumb renders native `<nav>`, `<ol>`,
  `<li>`, `<a>`, and `<span>` elements directly. The visual contract lives
  entirely in the variants file plus a lucide-react `ChevronRight` icon
  for the default separator. Authored from scratch rather than composing
  an existing molecule because the crumb / separator / current-page shape
  is breadcrumb-specific and would dilute a more general primitive.
- **Variant propagation via descendant selectors.** The organism owns a
  single `size` axis. Base text size is applied at the root and inherited
  by every descendant text element; separator icon sizes are applied via
  a descendant selector on the separator `<li>`:

  ```ts
  // breadcrumb.variants.ts
  size: {
    sm: '[&_svg]:size-3',
    md: '[&_svg]:size-3.5',
    lg: '[&_svg]:size-4',
  }
  ```

  No lookup tables are needed because no composed molecule / atom is
  involved — the size axis maps directly to Tailwind utilities in each
  subpart's cva block.
- **No `className` flows downward.** Breadcrumb does not expose
  `className`, and the rendered native elements receive only the
  organism's own variant-driven class strings. If a styling knob is
  missing, add a variant axis on the organism — don't open an escape
  hatch.
- **Slot prop vocabulary.** Breadcrumb has no slot props in the usual
  `leading` / `title` / `description` / `actions` sense; the items[]
  descriptor union is the entire surface. Each crumb's `label` is the
  visible label; each separator's optional `icon` overrides the default
  `ChevronRight`.
- **Layer-import direction.** Breadcrumb imports `lucide-react` and
  `@/particles/cn`. It does NOT import other organisms, templates, pages,
  or providers — enforced by the `no-restricted-imports` rule in
  `eslint.config.mjs`.

## Accessibility

- The root `<nav>` carries an accessible name via `aria-label` (defaults
  to `'Breadcrumb'`). Pass a localized string when needed.
- The current crumb carries `aria-current="page"` and renders as a
  `<span>` without an anchor wrapper. Assistive tech announces it as
  "current page" rather than as a link, which matches the user's actual
  position in the navigation tree.
- Each separator renders inside a `<li role="presentation"
  aria-hidden="true">` so the surrounding screen-reader announcement
  stays "Home, Library, Settings" rather than "Home, slash, Library,
  slash, Settings". The presentation role is mandatory because an
  `<li>` without it would announce as a list item.
- Anchored crumbs use a transparent rounded focus-visible ring via
  `focus-visible:outline-2 focus-visible:outline-ring`; keyboard users
  can see the active crumb without depending on color alone.
- The hover treatment combines a foreground color shift with an
  underline — the underline is the accessible signal, the color shift is
  decorative reinforcement.

## Do / Don't

- DO interleave `{ type: 'separator' }` descriptors explicitly between
  crumbs. The organism does NOT auto-inject separators because that would
  hide structure from the items[] surface — tests, serialization, and
  per-separator overrides all benefit from explicit interleaving.
- DO supply `href` on every navigable crumb, even the last one. The
  organism strips the anchor on the current crumb automatically; passing
  `href` on every entry keeps the items[] data layer uniform (handy when
  the same items array drives sitemap or analytics elsewhere).
- DO use `current: true` to override the "last crumb is current"
  default when the trail extends past the active page (e.g. when a
  filter or modal route appears after the canonical leaf).
- DO use a stable, ordered items[] array — React keys are derived from
  index, so reordering at runtime will re-render every crumb.
- DON'T expect a crumb with both `href` and `current: true` to render as
  a link — `aria-current="page"` is mutually exclusive with link
  semantics, so the anchor is dropped. If the consumer needs the crumb
  to be navigable, omit `current: true` and let the last crumb fall
  through to the default.
- DON'T pass `className` to Breadcrumb — the prop interface omits it,
  and the variants are the only styling surface. If a knob is missing,
  add a variant axis.
- DON'T put complex interactive content inside a crumb's `label`. The
  label renders inside an `<a>` or `<span>`; nested buttons or links
  would produce invalid HTML and unpredictable focus behavior. Use a
  separate organism or a sidebar overflow menu for secondary actions.
