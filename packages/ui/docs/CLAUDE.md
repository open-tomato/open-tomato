# What this package is

`@open-tomato/ui-docs` — the published, reference-free Open Tomato docs/blog
component surface: Prose, Callout, CodeBlock, DocsSidebar, DocsTOC, BlogIndex,
BlogPost, and DocsLayout. Cloned from the `packages/ui/components` boilerplate.
The port plan lives in the PoC release plan at the repo root:
`docs/plans/poc-release/06-portal-docs-pipeline.md`.

## Dependencies

Depends on `@open-tomato/theme-default` (tokens/fonts) and
`@open-tomato/ui-components` (shared atoms/molecules: TomatoMark, Breadcrumb).
Import those from the package root (`@open-tomato/ui-components`), never a deep
path. This package does NOT depend on `@open-tomato/ui-portal` — DocsLayout
composes only the shared catalog and its own docs pieces, not Header/Footer, so
the docs and marketing surfaces stay independent.

## Reference-free rule (CRITICAL)

This package is published. It must never reference its pre-publish source
repositories or design sources — no imports, paths, comments or docs that
mention them. ESLint enforces the import side (`no-restricted-imports`) and the
publish gate greps for banned strings. Components arrive via the port checklist
already scrubbed.

## Theming

`@open-tomato/theme-default` owns `tokens.css` (semantic variables, light +
dark) and `fonts.css`. This package owns `src/styles/theme.css` — the component
contract mapping those variables onto Tailwind utilities, the `--color-warm-*`
ramp, and the `.portal-prose` scoped rich-text rules the `Prose` component
depends on (they outrank the theme's bare `h*`/`p`/`code` element rules by
specificity). `lib.css` is the published `styles.css` entry; the build copies
the theme files into `dist/styles` so its relative imports resolve for
consumers.

## Tooling

- **CVA + clsx + tailwind-merge**; the `cn` helper lives in `src/lib`.
- **Tailwind 4** — semantic variables map into `@theme` via `src/styles/theme.css`.
- **Storybook 10 + addon-vitest + Playwright** — `bun run storybook`,
  `bun run test`, `bun run build:storybook`. Story files never import from
  `vitest`. **Visual regression** is a separate native suite
  (`bun run test:visual`) diffing against untracked per-environment baselines
  in `visual/__image_snapshots__/` (regenerate with `bun run test:visual:update`;
  never copied in). Preview health with `bun run check:stories`.
