# @open-tomato/ui-portal

## 0.8.3

### Patch Changes

- Docs + header polish for the documentation site.

  - **ui-docs**: `DocsLayout` is now responsive — the three-column shell collapses
    to a single column below `lg` (sidebar stacks, TOC hides), padding and the
    page title scale down. `.portal-prose` gains GFM table styling (a quiet
    bordered grid).
  - **ui-portal**: the `Header` no longer swallows nav clicks — `onNavigate` now
    receives the click event so consumers choose native vs. SPA navigation, and
    links work via their `href` by default. The wordmark collapses to the mark
    alone on the narrowest screens so the right-side controls stay on one row.
  - @open-tomato/ui-components@0.8.3
  - @open-tomato/theme-default@0.8.3

## 0.8.2

### Patch Changes

- Make the marketing surface responsive. Header nav + ⌘K search collapse below
  `lg`/`md`; Hero, CodeQuickstart, CommunityStrip and Footer grids stack on
  small screens; the Hero headline and mascot scale fluidly; the quickstart
  terminal transcript scrolls inside its card. No horizontal overflow at
  320/375/768/1024/1440.
  - @open-tomato/ui-components@0.8.2
  - @open-tomato/theme-default@0.8.2

## 0.8.1

### Patch Changes

- 6175034: Fix FeatureCard to use a pure `import type` for lucide's `IconName`, so no bare
  `lucide-react/dynamic` side-effect import lands in the published bundle (that
  subpath isn't in lucide's exports map and breaks strict-ESM consumers).
  - @open-tomato/ui-components@0.8.1
  - @open-tomato/theme-default@0.8.1

## 0.8.0

### Minor Changes

- adac9c4: Add the portal/marketing and docs/blog component surfaces as two new published
  packages.

  - `@open-tomato/ui-portal` — Header, Footer, Hero, CodeQuickstart, FeatureGrid,
    CommunityStrip, Landing, and BrandGlyph (the marketing surface).
  - `@open-tomato/ui-docs` — Prose, Callout, CodeBlock, DocsSidebar, DocsTOC,
    BlogIndex, BlogPost, and DocsLayout (the docs/blog surface).

  Both depend on `@open-tomato/theme-default` and `@open-tomato/ui-components` for
  shared tokens and atoms and join the fixed version group.

  Shared prerequisites landed in the existing packages: `@open-tomato/ui-components`
  gains the `Wordmark` atom and a `leaf` Badge tone (both used by the portal
  surface); `@open-tomato/theme-default` already ships the `warm-*` neutral ramp.

### Patch Changes

- Updated dependencies [adac9c4]
  - @open-tomato/ui-components@0.8.0
  - @open-tomato/theme-default@0.8.0
