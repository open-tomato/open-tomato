# @open-tomato/ui-docs

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

- @open-tomato/ui-components@0.8.2
- @open-tomato/theme-default@0.8.2

## 0.8.1

### Patch Changes

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
