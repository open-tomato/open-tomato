---
"@open-tomato/ui-components": minor
"@open-tomato/theme-default": minor
"@open-tomato/ui-portal": minor
"@open-tomato/ui-docs": minor
---

Add the portal/marketing and docs/blog component surfaces as two new published
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
