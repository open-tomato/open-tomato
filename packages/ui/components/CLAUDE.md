Refer to @AGENTS.md for the overall context of agents in this package.

# What this package is

`@open-tomato/ui-components` — the published, reference-free Open Tomato
component library (atoms + molecules today; organisms/templates land in later
waves). The port plan and per-wave scope live in the PoC release plan at the
repo root: `docs/plans/poc-release/05-ui-components-port.md`.

## Reference-free rule (CRITICAL)

This package is published. It must never reference its pre-publish source
repositories or design sources — no imports, paths, comments or docs that
mention them. ESLint enforces the import side (`no-restricted-imports` in
`eslint.config.mjs`) and the publish gate greps for banned strings. New
components arrive via the port checklist in the plan doc, already scrubbed.

## Theming

`@open-tomato/theme-default` (workspace: `packages/shared/theme-default`) owns
`tokens.css` (the default semantic-variable theme, light + dark) and
`fonts.css`. This package owns `src/styles/theme.css` — the component
contract mapping those variables onto Tailwind utilities — and `lib.css`, the
published `styles.css` entry. The workbench entry `src/styles/global.css`
imports tokens/fonts from the theme package; the build copies them into
`dist/styles` so `lib.css`'s relative imports resolve for consumers.

Note: theme-default wraps its element defaults (`h1`–`h6`, `a`, `p`) in
`@layer base`, so Tailwind utilities beat element rules without the `!`
important modifier. Do not reintroduce unlayered element rules.

## Tooling

- **CVA + clsx + tailwind-merge** for variant-driven styling. The `cn` helper lives in `src/lib`.
- **Tailwind 4** — semantic variables map into `@theme` via `src/styles/theme.css`.
- **Radix** primitives only when behavior needs it (Slot, Dialog, DropdownMenu, etc.) — add the package per-component, not the whole umbrella.
- **Storybook 10 + addon-vitest + Playwright** — `bun run storybook`, `bun run test`, `bun run build:storybook`. One smoke test is auto-generated per story (docs/render layer). **No DOM snapshots, and story files never import from `vitest`** (it crashes the preview). **Visual regression is a separate native suite** (`bun run test:visual`): `@storybook/test-runner` screenshots every story in light + dark and diffs against **untracked per-environment baselines** in `visual/__image_snapshots__/` (update with `bun run test:visual:update`; CI keeps its own set — baselines are regenerated in this repo, never copied in). Preview health with `bun run check:stories`.
