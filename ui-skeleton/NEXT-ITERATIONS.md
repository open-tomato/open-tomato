# NEXT-ITERATIONS.md

Persistent backlog of work the current iteration deliberately deferred. Each item lists what, why, and the suggested approach.

When you finish an item: delete its entry here, update the relevant skill if the resolution changes any guidance, and reflect the change in [AGENTS.md](./AGENTS.md) if it touches a cardinal rule.

## High priority — convention violations to clean up

### 1. Remove public `className` prop from every atom

**What:** All 18 atoms currently accept `className` as a public prop and merge it via `cn(<component>Variants(...), className)`. The canonical Button reference established this pattern, so every other atom inherited it.

**Why this is wrong:** The cardinal rule in [AGENTS.md](./AGENTS.md) is that variants are the only public styling surface. Consumers should not be able to inject arbitrary classes. Internal `cn()` use within atoms (e.g., conditionally composing variant-driven classes) is fine.

**Specific patterns to refactor:**

- **All atoms** — drop the `className` prop from the public props interface; stop destructuring it; stop forwarding it into `cn(...)`.
- **`Input` / `Textarea` (wrapper-frame atoms)** — these currently document `className` as targeting the visible wrapper rather than the inner control. Replace with explicit variant axes (e.g., `density`, `tone`) for the framing concerns that consumers actually need to tune.
- **`Skeleton`** — currently documents `className` as the channel for `w-*` / `h-*` / `size-*` sizing. Replace with explicit `width?: string | number` / `height?: string | number` / `size?: string | number` props that emit inline `style` (or with `width` / `height` variant axes if the design system has a fixed set of sizes).
- **`Card` / `ScrollArea` / any multi-part wrapper** — currently exposes per-part escape-hatch props (`viewportProps`, `scrollbarProps`, `imageProps`, etc.) that include `className`. Strip `className` from those nested prop bags; if a per-part variant is genuinely needed, add a per-part variant axis at the wrapper level (`viewportPadding: 'none' | 'sm' | 'md'`, etc.).

**Suggested approach:** One PR per atom, in the order they were authored. Update tests + stories + README in the same change. Add the new variant axes as you go; don't try to plan the full variant matrix up front.

### 2. Update the atom-authoring skill once #1 ships

The current [atom-authoring](./skills/atom-authoring/SKILL.md) skill states the **target** convention (no public `className`), but Button (and every other atom) still encodes the **old** convention as the canonical reference. Once Button is refactored, audit the skill's "canonical reference" callouts to confirm they describe the new shape.

## Medium priority — known infrastructure gaps

### 3. Storybook 8.6 vs Vite 8 peer-dep mismatch

**What:** `@storybook/*@8.6.x` declares a Vite peer range that does not include Vite 8. `bun add` emits `warn: incorrect peer dependency "vite@8.0.13"` at install time.

**Status:** Currently a warning only — Storybook dev (`storybook dev -p 6006`) and build (`build-storybook`) both work end-to-end. Stories are picked up via the manifest at `/index.json`.

**Suggested approach (when it breaks):** Either downgrade Vite to 7 (matches Storybook 8's official support) or upgrade Storybook to the major that supports Vite 8 (check the Storybook changelog at upgrade time). Don't auto-bump the `@storybook/addon-*` packages within 8.x to chase the minor-version drift warnings (note #2 in [storybook](./skills/storybook/SKILL.md) covers this) — those are informational.

### 4. Vite library build emits hashed shared chunks, not flat per-entry files

**What:** `vite build` produces:

- Per-entry files at `dist/atoms/<Name>.js`, `dist/particles.js`, `dist/index.js` (driven by `entryFileNames: '[name].js'`).
- Shared modules extracted into hashed chunks at `dist/<name>-<hash>.js` (e.g. `dist/cn--EPVZrAb.js` for the `cn` helper imported by every atom). The per-entry files become thin re-exports referencing these chunks.

**Status:** Acceptable. This is the default Rollup behavior for `formats: ['es']` multi-entry builds. Consumers importing from a deep subpath still get the shared module transparently.

**Suggested approach (if a flatter `dist/` is ever required):** Set `output.preserveModules: true` (one file per source module, larger surface) or `output.manualChunks: () => null` (everything inlined into entries, larger bundles). Both have tradeoffs; pick based on the concrete consumer need.

### 5. Wire `package.json` `exports` map to the multi-entry build output

**What:** The current `package.json` `exports` is a single `"."` mapping to `./src/index.ts`. The `vite build` output produces:

- JS files flattened per entry: `dist/atoms/Button.js`, `dist/particles.js`.
- `vite-plugin-dts` declarations preserve source structure: `dist/atoms/Button/Button.d.ts` + `dist/atoms/Button/index.d.ts`.

**Suggested approach:** Add subpath exports for at least `.`, `./particles`, and each atom (e.g. `./atoms/Button`). The `import` path points at the flat JS file; the `types` path points at the nested `index.d.ts`. They will NOT share a common stem — that's expected. Same trap applies to any future entry added to `vite.config.ts` `build.lib.entry`.

### 6. Workspace registration

**What:** `packages/ui-skeleton/` is NOT registered in the root `packages/package.json` workspaces array this iteration. `devDependencies` for `@open-tomato/eslint-config` and `@open-tomato/typescript-config` use `file:../shared/<name>` links instead of `workspace:^`.

**Status:** Deliberate — this iteration ran the package as standalone so install works without workspace setup.

**Suggested approach (when ready):** Add `packages/ui-skeleton` to the root workspaces array, then rewrite the two `file:` links back to `workspace:^`. Verify `bun install` from the monorepo root still resolves cleanly. Touch nothing else.

## Low priority — small polish

### 7. Pre-existing lint errors

`bun lint` exits 1 because of two pre-existing files that are NOT caused by atom scaffolding:

- `README.md` — markdown heading-level / multiple-H1 violations.
- `vite.config.ts` — used to flag `no-undef` on `__dirname`. Fixed by switching to `import.meta.dirname` (see [build-tooling](./skills/build-tooling/SKILL.md) for the pattern).

**Suggested approach:** A dedicated cleanup task. Verify per-file paths in lint output to confirm only these two files (not new component code) are flagged.

### 8. Animated indeterminate state for `Progress`

**What:** When `Progress` receives `value={null}` or `value={undefined}`, Radix sets `data-state="indeterminate"` on the root and the indicator parks at `translateX(-100%)` (off-screen).

**Status:** Visually static. Acceptable for now; many design systems wait until they have a use case before designing the animation.

**Suggested approach:** Add a `@keyframes` block + `--animate-*` token + `data-[state=indeterminate]:animate-*` class on the indicator's cva block. Document the design intent (loop direction, duration) in the Progress README.

### 9. Sibling design-system stylesheet integration

**What:** The sibling `../design-system/colors_and_type.css` is referenced manually in the project notes but not imported by `globals.css` in this iteration. Tokens are mirrored locally in `src/styles/globals.css`.

**Suggested approach:** When workspace registration (#6) lands, decide whether to:

- Import the sibling stylesheet directly (single source of truth, requires bundler config for cross-package CSS).
- Codegen `globals.css` from the sibling file at build time (decouples runtime).
- Keep mirroring manually with a CI check that the two stay in sync.

Pick based on how often the design system file changes.
