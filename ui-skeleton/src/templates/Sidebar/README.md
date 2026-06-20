# Sidebar

Page-surface template that frames the application's primary navigation
rail. Renders as an `<aside>` landmark anchored to the left or right
viewport edge with a header band, a `<nav>` rail of link items, and a
footer band stacked vertically inside it. Composed from particles only —
no Radix primitive, no organism / molecule / atom composition for the
rail frame itself; the descriptor's optional `leading` / `trailing` slots
accept any consumer-supplied node (typically an icon atom, badge atom, or
avatar atom).

## Import

```ts
import { Sidebar, useSidebar, type SidebarNavItem } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                       | Default                 |
| ------------- | ------------------------------------------ | ----------------------- |
| nav           | `SidebarNavItem[]`                         | —                       |
| header        | `ReactNode`                                | —                       |
| footer        | `ReactNode`                                | —                       |
| mode          | `'expanded' \| 'rail' \| 'hidden'`         | `'expanded'`            |
| side          | `'left' \| 'right'`                        | `'left'`                |
| density       | `'compact' \| 'comfortable'`               | `'comfortable'`         |
| navAriaLabel  | `string`                                   | `'Sidebar navigation'`  |
| aria-label    | `string`                                   | —                       |

All other props are forwarded to the underlying `<aside>` element.
`className` is not a public prop — styling is controlled exclusively
through `mode`, `side`, and `density`.

### SidebarNavItem

| Field    | Type        | Default | Notes                                                            |
| -------- | ----------- | ------- | ---------------------------------------------------------------- |
| label    | `ReactNode` | —       | Visible label rendered inside the `<a>`                          |
| href     | `string`    | —       | Target URL passed straight to the rendered anchor                |
| id       | `string`    | `href`  | Stable React key (defaults to `href` when omitted)               |
| leading  | `ReactNode` | —       | Decorative leading slot rendered inside an `aria-hidden` span    |
| trailing | `ReactNode` | —       | Decorative trailing slot rendered inside an `aria-hidden` span   |
| active   | `boolean`   | `false` | Stamps `data-active=""` + `aria-current="page"` on the anchor    |

The descriptor is single-shape (no discriminator) — the rail holds nav
links only. Separators, submenus, or non-link entries belong to a future
axis or a different template; the rail's job is the persistent nav
hierarchy.

## Variants

| mode         | Rail visibility                                                                 | aria-hidden |
| ------------ | ------------------------------------------------------------------------------- | ----------- |
| `expanded`   | Full 264px rail, content fully interactive                                      | omitted     |
| `rail`       | 64px icon-rail, content fully interactive, kept in the AT tree                  | omitted     |
| `hidden`     | Slid off-screen via side-aware `translate-x` transform, content inert           | `true`      |

| side    | Anchor edge      | Slide-out direction when `mode='hidden'` |
| ------- | ---------------- | ---------------------------------------- |
| `left`  | Left edge        | `-translate-x-full`                      |
| `right` | Right edge       | `translate-x-full`                       |

| density       | Nav padding | Link padding | Footer height |
| ------------- | ----------- | ------------ | ------------- |
| `compact`     | `p-2`       | `h-8 px-2.5` | `h-12`        |
| `comfortable` | `p-3`       | `h-9 px-3`   | `h-14`        |

The header band is a fixed `h-header` (64px from the design-system
`--header-h` token) regardless of `density`; `density` governs only the
nav-link rhythm and the footer height.

The resolved variants are reflected on the rendered root as
`data-slot="sidebar-root"`, `data-mode`, `data-side`, `data-density`,
and `data-state` (`'expanded' | 'rail' | 'hidden'`) so tests and
downstream styling can introspect the rail state without className
inspection.

## Composition

- **Composed primitives:** none. Sidebar renders a self-contained
  `<aside>` landmark with header / nav / footer landmark children. The
  descriptor's optional `leading` and `trailing` slots accept any
  consumer-supplied node — typically an icon (lucide-react), a `Badge`
  atom, or an `Avatar` atom — and render raw inside `aria-hidden` spans.
- **Three-mode behavior in a single DOM.** The `mode` tri-state axis is
  the single source of truth for the rail's visibility:
  - `expanded` — full 264px rail, all slots visible and interactive.
  - `rail`     — 64px icon-rail; visually compact, **still in the AT
                 tree and keyboard-focusable**. Labels collapse via the
                 descriptor slots, not via `aria-hidden`. Stamping
                 `aria-hidden` here would create "ghost focusable"
                 anchors (WCAG 4.1.2: focus lands on links AT cannot
                 announce).
  - `hidden`   — same `<aside>` slid off-screen via a side-aware
                 `translate-x` transform; `aria-hidden="true"` +
                 `pointer-events-none` so AT users and keyboard users do
                 not encounter the off-screen content.

  There is no separate mobile-overlay DOM — all three modes share the
  same `<aside>` and the same content.

  ```ts
  const sideToSlideOut = {
    left: '-translate-x-full',
    right: 'translate-x-full',
  } as const;
  ```

  The mapping above lives inside `sidebar.variants.ts` as a
  `compoundVariants` block on `sidebarVariants`. Only the `hidden`
  branch needs the side-aware translate; the `expanded` and `rail`
  branches bake `translate-x-0` into their own variant value.
- **No `className` flows downward.** The template does not compose any
  organism, molecule, or atom whose `className` could leak. The
  consumer-supplied descriptor slots (`leading`, `trailing`) render raw
  inside `aria-hidden` spans sized by `sidebarNavLinkIconVariants` —
  consumers cannot inject className via the descriptor, and the template
  does not inject className into consumer-supplied nodes.
- **Slot prop vocabulary.** `header`, `nav` (items[]), `footer`. The
  three slots map one-to-one onto the three landmark children inside the
  `<aside>` — `<header>`, `<nav>`, `<footer>`. `header` and `footer`
  render conditionally; the `<nav>` is always emitted because the rail's
  primary purpose is navigation.
- **Internal context via `SidebarContext` + `useSidebar`.** Sidebar
  exposes a read-only context with the resolved `mode` / `side` /
  `density` values so deeply-nested children (custom header avatars,
  footer collapse-toggles) can read them without prop-drilling.
  Consumers typically branch on `mode === 'rail'` to render an
  icon-only treatment alongside the expanded label. The context is
  read-only — consumers own the `mode` value and drive it through the
  public `mode` prop; the template never flips its own state.
  `useSidebar()` throws when called outside a `<Sidebar>` tree so
  missing-provider bugs surface at first render.
- **Layer-import direction.** Imports `@/particles/cn` only. Does NOT
  import other templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`. The descriptor's
  `leading` / `trailing` slots accept consumer-supplied atoms, but the
  template itself doesn't import any atom; the rail frame is self-
  contained.

### Why Sidebar does not compose Sheet for the hidden branch

The template-composes-template ban (cardinal rule #11) blocks
`@/templates/Sheet` from inside `src/templates/Sidebar/`. The sanctioned
escape — when Sheet's modal-overlay semantics (focus trap, portal,
scrim) genuinely belong on the hidden branch — is to lift the shared
anchored-surface treatment to `src/particles/anchored-surface.variants.ts`
and have both Sheet and Sidebar consume the particle directly.

This iteration's Sidebar does NOT use that escape because the hidden
branch only needs a CSS slide-out, not a modal-overlay dismissal flow.
A persistent nav rail that slides off-screen does not need a focus trap
(the visible content behind it is still navigable), does not need a
scrim (the rail returns when the consumer toggles `mode`), and does not
need a portal (the rail belongs to the page layout, not to an overlay
z-index plane). The CSS slide-out via the `compoundVariants` mapping
above is sufficient.

A future iteration that introduces, for example, a "mobile menu" mode
with a tap-outside-to-dismiss flow would be the right time to:

1. Lift `sidebarVariants`' positioning + transform logic and Sheet's
   inline-style positioning + transform logic to
   `src/particles/anchored-surface.variants.ts` as a shared cva.
2. Refactor Sheet (one task) to consume the particle.
3. Refactor Sidebar (one task) to consume the same particle in a
   mobile-overlay branch alongside its desktop-persistent branch.

The path is documented for posterity in `skills/template-authoring/SKILL.md`'s
"The Sheet / Sidebar particle-extraction precedent" section.

## Accessibility

- The rendered `<aside>` element provides the implicit `complementary`
  landmark role. Pass an explicit `aria-label` whenever the page hosts
  more than one `<aside>` so axe's `landmark-unique` rule keeps passing.
- The internal `<nav>` element provides the implicit `navigation`
  landmark role. The template applies a default `aria-label="Sidebar navigation"`;
  override via the `navAriaLabel` prop when the page hosts more than one
  `<nav>` landmark.
- Active nav items receive `aria-current="page"` so AT users hear the
  current-route announcement on each link traversal.
- Nav-link `leading` and `trailing` slots render inside `aria-hidden`
  spans. The link's accessible name comes from the `label` slot only;
  decorative icons / badges do not pollute the accessible name. When a
  trailing badge should be announced (e.g. an unread-count badge), pass
  `<span aria-hidden={false}>...</span>` around the announceable value
  inside the `trailing` slot — the outer `aria-hidden` span the template
  applies is presentational, not redundant, and screen readers honor the
  inner override.
- When `mode='hidden'`, the entire `<aside>` is marked
  `aria-hidden="true"`. This is intentional — the rail content is slid
  off-screen and interaction with it is suppressed via
  `pointer-events-none`. Consumers toggling to the hidden state should
  restore focus to a sensible anchor (a hamburger button, the page's
  main heading) so keyboard users do not lose their focus position.
- `mode='rail'` does NOT stamp `aria-hidden`. The icon-rail stays in
  the accessibility tree and the link list remains keyboard-focusable
  — the only thing that collapses visually is the descriptor's `label`
  slot (consumers branch on `useSidebar().mode === 'rail'` to render an
  icon-only treatment). Stamping `aria-hidden` here would create "ghost
  focusable" anchors (WCAG 4.1.2: focus lands on links AT cannot
  announce).
- Focus is NOT trapped inside the rail. The Sidebar is a persistent
  layout element, not a modal — a focus trap would break the keyboard-
  navigation flow into the page's main content. If a modal overlay is
  needed (mobile menu with tap-outside-to-dismiss), see "Why Sidebar
  does not compose Sheet for the hidden branch" above.
- The `useSidebar` hook is a public API — consumers building custom
  header avatars or footer collapse-toggles can read the resolved
  `mode` to render a "Show navigation" / "Hide navigation" toggle that
  pairs with the rail's current visibility state.

## Do / Don't

- DO tune visuals through `mode`, `side`, and `density`. DON'T reach
  for `className` — Sidebar doesn't accept one, the variant axes are
  the only sanctioned styling hook, and layout-level granularity (rail
  width, link padding, header height) is what the variant axes exist
  for.
- DO drive `mode` from external state (a media-query hook, a
  hamburger-toggle store, the URL). The template never flips its own
  state — the consumer owns the value. DON'T treat `mode` as internal
  to the rail; consumers expect the rail to follow their application's
  responsive breakpoint logic.
- DO pass a single-shape `nav` items array. DON'T attempt to nest
  separators, submenus, or non-link entries inside the array — the
  descriptor is single-shape by design. If submenu / separator support
  is needed, the right answer is a new descriptor union or a different
  template (e.g. wrap an Accordion organism inside the `nav` slot via
  the items[] descriptor's `label` slot for a per-item disclosure).
- DO reach for the `useSidebar` hook when a deeply-nested child needs
  to read the resolved `mode` / `side` / `density`. DON'T thread the
  same props down through a custom component tree — the context exists
  precisely so consumers can skip the prop-drilling.
- DO pass `aria-label` when the page hosts more than one `<aside>`.
  DO pass `navAriaLabel` when the page hosts more than one `<nav>`.
  axe's `landmark-unique` rule fires when two same-role landmarks share
  the same accessible name on the same page.
- DON'T render two Sidebars on the same page without distinct
  `aria-label` values. The default `'Sidebar navigation'` on the inner
  `<nav>` collides immediately, and the unlabeled `<aside>` collides
  per the `landmark-unique` rule.
- DON'T expect a focus trap. Sidebar is a layout rail, not a modal —
  the `hidden` mode slides content off-screen but does NOT trap
  keyboard focus inside the rail. Use the Sheet template (when the
  particle-extraction path lands) for modal-overlay nav surfaces with
  a dismissal flow.
