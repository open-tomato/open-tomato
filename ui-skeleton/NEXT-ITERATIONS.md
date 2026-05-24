# NEXT-ITERATIONS.md

Persistent backlog of work the current iteration deliberately deferred. Each item lists what, why, and the suggested approach.

When you finish an item: delete its entry here, update the relevant skill if the resolution changes any guidance, and reflect the change in [AGENTS.md](./AGENTS.md) if it touches a cardinal rule.

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

