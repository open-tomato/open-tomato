---
name: build-tooling
description: Use when changing vite.config.ts, tsconfig*.json, eslint.config.mjs, postcss.config.mjs, package.json deps/scripts, or running bun commands. Covers the monorepo file-link setup, Vite library mode + multi-entry build, TypeScript path aliases, ESLint quirks, and the Bun-specific footguns.
---

# Build Tooling

This skill covers everything in the package's build pipeline: Bun, Vite, TypeScript, ESLint, PostCSS, the monorepo's file-link workaround, and the package scripts that tie them together.

For Vitest specifics, see [../component-testing/SKILL.md](../component-testing/SKILL.md). For Tailwind PostCSS / Vite plugin choice, see [../styling/SKILL.md](../styling/SKILL.md). For Storybook config, see [../storybook/SKILL.md](../storybook/SKILL.md).

## Tooling stack

| Tool | Version | Role |
|---|---|---|
| Bun | 1.3+ | Package manager and script runner |
| Node.js | 18+ (20.11+ for `import.meta.dirname`) | Runtime for tooling |
| TypeScript | ^5.9 | Type checking |
| Vite | ^8 | Library build + Storybook dev server |
| Vitest | ^4 | Test runner |
| Storybook | ^8 | Component dev environment |
| Tailwind CSS | ^4 | Styling |
| ESLint | ^9 | Linting + auto-fix |

## Package scripts

```text
bun install                # install deps, sync bun.lock
bun run check-types        # tsc --noEmit
bun run test               # vitest run
bun run test:coverage      # vitest run --coverage
bun run test:watch         # vitest (watch mode)
bun run lint               # eslint --fix  (NOT check-only — see ESLint section)
bun run build              # vite build → dist/
bun run dev                # vite dev server
bun run storybook          # storybook dev -p 6006
bun run build-storybook    # storybook build → storybook-static/
bun run shadcn:add <item>  # bunx shadcn@latest add (reference only — see shadcn-integration skill)
```

## Bun-specific notes

### `bun test` is NOT Vitest

`bun test` is Bun's built-in test runner and does NOT honor `vitest.config.ts`. Always use `bun run test` (the package script) or `bunx vitest run`. See [../component-testing/SKILL.md](../component-testing/SKILL.md) for the full trap.

### `bun.lock` is text JSON

Bun 1.3+ writes a text-JSON `bun.lock` (not the older binary `bun.lockb`). It belongs at the package root and IS committed.

### Postinstall warning is informational

`bun install` may emit `Blocked 1 postinstall. Run \`bun pm untrusted\` for details.` — this is informational, not a failure. Bun blocks postinstalls from untrusted packages by default. Ignore unless something is visibly broken.

### `bun add` behaviors

- Updates `package.json` automatically AND reorders dependency keys alphabetically. Expect dependency blocks to be sorted after each add — don't fight it.
- Multiple packages in one `bun add` command is faster than per-package adds; the lockfile updates once at the end.
- Unpinned `bun add <pkg>` resolves the latest matching range. If a planning doc or example references an older major, treat the `bun add` result as authoritative.

### React peer + dev mirror

For library packages, `react` / `react-dom` belong in `peerDependencies` (broad range like `^19.0.0`) with a dev mirror in `devDependencies` (pinned to the current development version like `^19.2.6`). Consumer apps provide React; the dev mirror keeps local install / test / build working.

Edit `package.json` manually — don't use `bun add --peer` plus a separate dep add. Easier to keep the two ranges aligned by hand.

## Monorepo layout and file links

This package is **standalone this iteration** — it is NOT registered in the root `packages/package.json` workspaces array.

### Sibling shared packages

Sibling shared packages live under `packages/shared/<name>/`, not `packages/<name>/`. From `packages/ui-skeleton/` the relative path is `../shared/<name>`.

The two siblings this package consumes:

- `@open-tomato/eslint-config` — at `../shared/eslint-config`. Exposes subpath exports `./base`, `./next`, `./react`. Choose the right one in `eslint.config.mjs`. Already lists `eslint-plugin-storybook` as a dep, so Storybook lint integration does not require adding it to this package.
- `@open-tomato/typescript-config` — at `../shared/typescript-config`. Exposes subpath exports `./base`, `./react`, `./next` (note the JSON filename is `nextjs.json` but the export key is `./next`). The shared `base` already sets `moduleResolution: 'bundler'`, `target: 'ES2022'`, and `lib: ['es2022', 'DOM', 'DOM.Iterable']` — package-level overrides for these in `tsconfig.json` are redundant but harmless when the values match.

### `file:` link convention

`package.json` `devDependencies` reference both with `file:` links:

```json
{
  "devDependencies": {
    "@open-tomato/eslint-config": "file:../shared/eslint-config",
    "@open-tomato/typescript-config": "file:../shared/typescript-config"
  }
}
```

This works because `@open-tomato/eslint-config` already depends on `@open-tomato/typescript-config` via `file:../typescript-config` (precedent for the file-link approach).

When workspace registration lands (see [../../NEXT-ITERATIONS.md](../../NEXT-ITERATIONS.md)), these get rewritten back to `workspace:^`.

### Git root caveat

The git repository root is `packages/` (not the monorepo root above it). Paths in `git status` / `git diff` are relative to `packages/` (e.g. `ui-skeleton/...`). `cd` above `packages/` is not a git repo. Useful when scripting checks that need to know where `git` will resolve to.

## TypeScript configuration

### `tsconfig.json` essentials

- Extends `@open-tomato/typescript-config/react` (or `/base` for non-React packages).
- `compilerOptions.paths` adds the `@/*` → `./src/*` alias.
- Because `paths` values are non-relative (`"src/*"`), `baseUrl` MUST be set (TypeScript emits TS5090 otherwise: `Non-relative paths are not allowed when 'baseUrl' is not set`). Either add `"baseUrl": "."` or rewrite the values with leading `./`. The `.` baseUrl resolves to the tsconfig directory.

### `tsconfig.build.json` for the dist build

`vite-plugin-dts` accepts a `tsconfigPath` to point at a separate build tsconfig (`tsconfig.build.json` with `emitDeclarationOnly: true`) so dts emission is decoupled from the main tsconfig used by editors and `check-types`.

```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "emitDeclarationOnly": true,
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.*", "src/**/*.stories.*"]
}
```

### Empty-package `tsc` message

Running `tsc --noEmit` against an empty package (no `src/` yet) emits TS18003 (`No inputs were found`). This is expected during scaffolding and not a config error — once source files exist it goes away.

### TS4023 when re-exporting from a third-party library

`declaration: true` is set on the shared base config, so `tsc --noEmit` still runs declaration-emit type checks even when it never writes a `.d.ts` to disk. A failure that only surfaces during declaration emit looks like:

```text
src/organisms/<Foo>/<Foo>.tsx(N,M): error TS4023: Exported variable 'bar' has or is using name 'InternalThing' from external module ".../node_modules/<library>" but cannot be named.
```

The cause: a local `const bar = libraryBar` aliases a value whose inferred type references a type that the upstream library does NOT include in its public exports (e.g. sonner's `toast.promise` references `PromiseIExtendedResult`, which sonner's `index.d.ts` keeps internal). Declaration emit has to materialise the inferred type and cannot name the unexported symbol.

Workaround: re-export the value directly from the source module instead of aliasing through a local const.

```ts
// Triggers TS4023 — declaration emit must inline the inferred type.
import { toast as sonnerToast } from 'sonner';
export const toast = sonnerToast;

// Clean — the .d.ts references sonner's declaration directly.
export { toast } from 'sonner';
```

The direct re-export keeps the type reference indirect — the emitted `.d.ts` writes `export { toast } from 'sonner'` and TypeScript never has to expand the type at the boundary. Same trick applies to any third-party value whose public type signature reaches into unexported helper types (often the case for builder objects, fluent APIs, and helpers with deep generic chains).

If the re-export must live alongside a component file (so `react-refresh/only-export-components` flags the non-component export), move the re-export to the directory's `index.ts` barrel rather than the component file. The barrel is not a Fast Refresh boundary, so the rule does not apply there. This is the precedent applied by `src/organisms/Sonner/index.ts` for sonner's `toast` and `useSonner` re-exports.

## Vite library mode

`vite.config.ts` configures multi-entry library mode:

```ts
import path from 'node:path';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const rootDir = import.meta.dirname;
const atomNames = [
  'AspectRatio', 'Avatar', 'Badge', 'Button', 'Card', 'Checkbox',
  'Input', 'Kbd', 'Label', 'Progress', 'ScrollArea', 'Separator',
  'Skeleton', 'Slider', 'Spinner', 'Textarea', 'Toggle', 'Typography',
];

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({ tsconfigPath: path.resolve(rootDir, 'tsconfig.build.json') }),
  ],
  resolve: {
    alias: { '@': path.resolve(rootDir, 'src') },
  },
  build: {
    lib: {
      entry: {
        index: path.resolve(rootDir, 'src/index.ts'),
        particles: path.resolve(rootDir, 'src/particles/index.ts'),
        ...Object.fromEntries(
          atomNames.map((name) => [
            `atoms/${name}`,
            path.resolve(rootDir, `src/atoms/${name}/index.ts`),
          ]),
        ),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        /^react($|\/)/,
        /^react-dom($|\/)/,
        /^@radix-ui\//,
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
      ],
      output: {
        entryFileNames: '[name].js',
        preserveModules: false,
      },
    },
  },
});
```

### `import.meta.dirname` instead of `__dirname`

ESM config files (`vite.config.ts`, etc.) don't get `__dirname` / `__filename` from CommonJS. The ESLint config doesn't add them as globals so any reference fails `no-undef`.

Use `import.meta.dirname` (Node 20.11+, Bun-supported) for the equivalent path. Bind it once at module top (`const rootDir = import.meta.dirname;`) and reuse — keeps the `path.resolve(...)` calls readable.

Same approach applies to any new ESM `.config.{ts,js,mjs}` file in this package.

### Multi-entry build setup

- `build.lib.entry` is a `Record<string, string>` (key = chunk name, value = absolute path).
- `output.entryFileNames: '[name].js'` + `output.preserveModules: false` emits one file per entry (e.g. `index.js`, `particles.js`, `atoms/Button.js`).
- Per-component entries can be generated programmatically via `Object.fromEntries(names.map(...))`.
- When adding a new layer (organisms, templates, providers): wire BOTH the barrel entry (`organisms: ...src/organisms/index.ts`) AND the per-component entries (`Object.fromEntries(organisms.map(...))`). The barrel alone produces only `dist/organisms.js` + declarations under `dist/organisms/<Name>/` — the per-component JS files at `dist/organisms/<Name>.js` (matching the atoms/molecules layout) require the explicit per-component entries.

### Externalize peers

Use `build.rollupOptions.external` with regex patterns to catch deep imports:

- `/^react($|\/)/`, `/^react-dom($|\/)/` — catches `react/jsx-runtime`, `react-dom/client`, etc.
- `/^@radix-ui\//` — every Radix package the library wraps.
- Exact strings for non-namespaced deps: `'class-variance-authority'`, `'clsx'`, `'tailwind-merge'`.
- `lucide-react` is intentionally NOT externalized — it ships as a runtime dep of the library.

### Dist directory layout (worth knowing)

`vite build` produces two divergent layouts:

- **JS files** flatten per `entryFileNames: '[name].js'` — e.g. `dist/atoms/Button.js`, `dist/particles.js`.
- **TypeScript declarations** (via `vite-plugin-dts`) preserve source directory structure — e.g. `dist/atoms/Button/Button.d.ts` + `dist/atoms/Button/index.d.ts`, `dist/particles/index.d.ts`.

When wiring up `package.json` `exports`, the `import` path needs to point at the flat JS file and the `types` path needs to point at the nested `index.d.ts` (or `<Name>.d.ts`). They will NOT share a common stem.

### Shared chunks at dist root

Vite multi-entry builds automatically extract shared modules into hashed chunks at `dist/` root (e.g. `dist/cn--EPVZrAb.js` for the cn helper imported by every atom + index, `dist/Checkbox-<hash>.js` when an atom's content is also pulled in by `dist/index.js`). The per-entry files (`dist/atoms/<Name>.js`) become thin re-exports referencing the shared chunks via relative imports.

This is the default Rollup behaviour for `formats: ['es']` multi-entry builds and is acceptable — atom entries still exist as expected, and consumers importing from a deep subpath get the shared chunk transparently.

If a flatter dist (one self-contained file per entry) is ever required, set `output.preserveModules: true` or `output.manualChunks: () => null`; both have tradeoffs (more files / larger bundles respectively). Tracked in [../../NEXT-ITERATIONS.md](../../NEXT-ITERATIONS.md).

## ESLint configuration

`eslint.config.mjs` extends the shared `@open-tomato/eslint-config/react`. A few enforcement quirks to know:

### `bun lint` is auto-fixing (not check-only)

The `lint` script is `eslint --fix` — auto-mutating. This is a deliberate package convention; some downstream automation expects `bun lint` to also format. Don't downgrade it to non-fixing unless explicitly asked.

### Single quotes in `.ts` / `.tsx`

The config enforces single quotes via `@stylistic/quotes`. Auto-fixed by `bun lint`. Write source with single quotes from the start to avoid noisy auto-format diffs.

### Import grouping and sorting

ESLint enforces import grouping/sorting (auto-fixed by `bun lint`). The resolved order:

1. Built-in / node-prefixed (`node:path`).
2. Third-party (`react`, `@radix-ui/*`, `class-variance-authority`, etc.) — `import * as React from 'react'` lives here.
3. Internal alias (`@/...`) — in its own group below third-party.
4. Relative (`./...`) — last group.

Write imports already grouped this way to avoid post-lint diffs.

### Multiline-ternary auto-format

`@stylistic/multiline-ternary` will auto-format short inline ternaries across multiple lines on `bun lint`:

```tsx
// You write:
const Comp = asChild ? Slot : 'button';

// After bun lint:
const Comp = asChild
  ? Slot
  : 'button';
```

Don't fight the auto-format. Ternary JSX attribute values like `{cond ? 'a' : undefined}` get wrapped over three lines. The resulting diff is cosmetic, not semantic.

### Markdown rules

The ESLint markdown plugin enforces:

- `markdown/fenced-code-language` — every fenced code block needs an explicit language tag. Use `text` for ASCII trees / directory layouts, `bash` for shell, `tsx` / `ts` / `css` for code. The bare ``` opener will fail `bun lint`.
- `markdown/no-multiple-h1` — exactly one H1 per file (the document title).
- `markdown/heading-increment` — no level-skipping between headings.

Auto-format does NOT fix heading-level rules (the linter can't disambiguate intended structure). Fix heading levels by hand.

#### Nested fences require four backticks on the outer block

To embed a fenced code block INSIDE another fenced block (e.g. a `markdown` example that itself contains a `ts` snippet), the outer fence MUST use four backticks. Three-backtick outer + three-backtick inner causes the inner closing fence to terminate the outer block early, then the next ``` opens a language-less block and trips `markdown/fenced-code-language`. Pattern:

````text
````markdown
## Composition

```ts
const x = 1;
```
````
````

The same trick applies anywhere a doc shows a code block that itself contains a code block.

### `@stylistic/implicit-arrow-linebreak`

Forbids a linebreak between `=>` and a wrapped multi-line call body. Either keep the body on one line or start the call on the same line as `=>` and break inside the parens:

```ts
// Lint-hostile:
const fn = (x: Props) =>
  cn(
    a(x),
    b(x),
  );

// Lint-friendly:
const fn = (x: Props) => cn(
  a(x),
  b(x),
);
```

### `globalThis` is not in the default globals

Add `/* global globalThis */` at the top of `vitest.setup.ts` (or other setup files) to suppress `no-undef` without disabling the rule package-wide.

### Placeholder-barrel re-export suppression

`export * from './<layer>'` from a barrel file whose target only contains `export {};` triggers ESLint's `import/export` rule with `No named exports found in module './<layer>'`. The placeholder higher-layer barrels (`molecules`, `organisms`, `providers`, `templates`, `pages`) are intentionally empty this iteration but the top-level `src/index.ts` needs to wire them up so future iterations don't have to touch the root barrel.

Add a per-line `// eslint-disable-next-line import/export -- placeholder barrel until <layer> ship` comment above each empty re-export rather than refactoring the placeholders. This keeps the wiring stable; remove the suppression cleanly once the layer ships real exports.

### Pre-existing lint errors (NOT yours)

`bun lint` exits 1 because of pre-existing files that are NOT caused by atom scaffolding:

- `README.md` — markdown heading-level / multiple-H1 violations.
- (Older issue) `vite.config.ts` — `no-undef` on `__dirname`, fixed by switching to `import.meta.dirname`.

Verify per-file paths in lint output to confirm only these (not new component code) are flagged. Tracked in [../../NEXT-ITERATIONS.md](../../NEXT-ITERATIONS.md).

### `storybook-static/` is not ignored by the shared base — append locally

The shared `@open-tomato/eslint-config` base ignores `dist/**`, `build/**`, `node_modules/**` but NOT `storybook-static/**`. The package's local `eslint.config.mjs` spreads the base config and appends `{ ignores: ['storybook-static/**'] }` so `bun run lint` stays clean after `bun run build-storybook`. If you add a sibling package, extend its eslint config the same way (`export default [...baseConfig, { ignores: ['storybook-static/**'] }]`) instead of relying on `--ignore-pattern` flags or deleting the build output between runs.

### Verifying a `no-restricted-imports` layer guard

`no-restricted-imports` matches purely on the import-path string — the target does NOT need to resolve to a real file. To verify a new layer-import guard, drop a temp file under the guarded directory that imports a non-existent path (e.g. `import type { Foo } from '@/molecules/X'`) and run `bun run lint`; the guard fires before any unresolved-import rule complains. Useful when introducing organism / template / page guards before those layers have code.

## Layer barrel hygiene (when a sibling component is blocked)

The shared `@open-tomato/eslint-config/react` base enables `import/no-unresolved`, so a layer-barrel `export * from './X'` line whose target directory lacks an `index.ts` fails `bun run lint` BEFORE typecheck. When a sibling task is `[BLOCKED]` (no `index.ts` yet authored) but a downstream barrel needs to land, comment out just that one export with a re-add note rather than skipping the line — preserves the barrel's intended shape and makes the gap visible to the next agent. Same rule for `src/atoms/index.ts` and future `src/organisms/index.ts` barrels.

Same hygiene applies to the `molecules` / `atoms` / future-layer string-literal tuples in `vite.config.ts` `build.lib.entry`. Vite resolves every listed entry at build time; a listed-but-missing `index.ts` blows up the rollup pass. When a sibling component is blocked, comment out its entry in the `as const` tuple with a re-add note (do NOT delete it — the comment signals to the next agent that the gap is intentional and that both the entry tuple AND the layer barrel need an update when the component unblocks). The two surfaces (barrel + entry tuple) stay in lock-step.

`package.json` `exports` is the THIRD lock-step surface alongside the barrel and the vite entry tuple. JSON has no comment syntax, so a blocked sibling cannot leave its trail there — instead, simply omit the blocked subpath entry and rely on the existing comments in `vite.config.ts` and the layer barrel to signal that the next agent must add the matching `exports` entry when unblocking. Verify completeness after every build:

```bash
bun -e "const p = await Bun.file('package.json').json(); const fs = require('node:fs'); for (const [k,v] of Object.entries(p.exports)) for (const c of ['types','import']) if (!fs.existsSync(v[c].replace('./',''))) console.log('MISSING',k,c);"
```

The intentional-omission across all three surfaces is the canonical signal that a sibling component is blocked. The runtime verification for a CORRECTLY omitted subpath returns `ERR_MODULE_NOT_FOUND` (Bun) or `ERR_PACKAGE_PATH_NOT_EXPORTED` (Node strict ESM) — both indicate the export is unavailable; the distinction is runtime-engine semantics, not a defect. Confirm via:

```bash
bun -e "try { await import('@open-tomato/ui-skeleton/sub/Path'); } catch (e) { console.log(e.code ?? e.message.slice(0,80)); }"
```

## Package exports — stem mismatch and key ordering

Vite library mode with `entryFileNames: '[name].js'` and an entry-map keyed `'atoms/Button'` emits the JS as a FLAT file (`dist/atoms/Button.js`), while `vite-plugin-dts` preserves source-tree structure and emits types NESTED (`dist/atoms/Button/index.d.ts`, sibling to the source `index.ts`). The `package.json` per-entry exports MUST account for this — `"import": "./dist/atoms/Button.js"` and `"types": "./dist/atoms/Button/index.d.ts"` for the same subpath. Same pattern for layer barrels: `"./atoms"` → import `./dist/atoms.js`, types `./dist/atoms/index.d.ts`. Root `.` is the exception (both flat siblings at `dist/index.{js,d.ts}`).

Conditional-exports key order matters for TypeScript module resolution under `moduleResolution: 'bundler' | 'node16' | 'nodenext'`: **`types` MUST come BEFORE `import`** in each subpath's object literal. TypeScript walks the conditions object top-down and stops at the first matching key. With `import` first, TS picks the `.js` path and tries to resolve types from a sibling `.d.ts` (which won't exist for flat-emitted JS).

### Per-entry verification (three orthogonal checks)

Each catches a different failure mode:

1. **File existence** (`fs.existsSync(...)`) — catches stem-mismatch typos.
2. **Key ordering** (`Object.keys(v).indexOf('types') < indexOf('import')`) — catches the TS-resolves-wrong-file bug.
3. **Runtime resolution from a scratch consumer.** From any scratch directory with a `file:` dep on the package, run `bun install`, then `bun -e "const m = await import('@open-tomato/ui-skeleton/atoms/Button'); console.log(m.Button.displayName)"`. Repeat per subpath. `ERR_PACKAGE_PATH_NOT_EXPORTED` means the entry is missing from the map; resolving to `undefined` means the stem is wrong. The package's `"private": true` does NOT block this — `bun install` honors `file:` deps regardless.

## KNOWN ISSUE: layer-barrel dts type resolution

**Runtime works; types fail under `nodenext` and partially under `bundler`.**

The runtime side of per-subpath imports (`@pkg/atoms/Button`, `@pkg/molecules/Alert`) AND layer-barrel imports (`@pkg/atoms`, `@pkg/molecules`, `@pkg`) all resolve correctly under `bun -e` and surface the expected `displayName`. The TYPE side is more nuanced:

- The layer-barrel `.d.ts` files (`dist/atoms/index.d.ts`, `dist/molecules/index.d.ts`, `dist/index.d.ts`) re-export children with bare relative paths (`export * from './Button';`).
- When TypeScript resolves `./Button` from inside `dist/atoms/index.d.ts`, it sees a flat sibling `dist/atoms/Button.js` (the Vite-emitted per-component JS) BEFORE it falls back to the directory `dist/atoms/Button/index.d.ts`. The `.js` file has no sibling `.d.ts` at the flat layer, so TS resolves to a typeless module and reports "has no exported member 'Button'".
- Reproducible under `moduleResolution: 'bundler'` (the package's own resolution mode) AND under `nodenext` (which additionally breaks per-subpath imports because per-component barrels also use bare relative paths).
- Trace evidence: `tsc --traceResolution` shows `'AspectRatio.js' exists - use it as a name resolution result` followed by no type lookup.

Per-component subpath imports (`from '@pkg/atoms/Button'`) DO type-resolve correctly under `bundler` because the per-component barrel re-exports a SIBLING `./Button` resolved to `dist/atoms/Button/Button.d.ts` — and that sibling exists.

### Three viable fixes (pick one when this becomes the active task)

- (a) Instruct `vite-plugin-dts` to emit flat sibling `.d.ts` files matching the JS layout (`dist/atoms/Button.d.ts` as a true sibling of `Button.js`). Usually `vite-plugin-dts` options `entryRoot` + `outDir` + `rollupTypes` produce this.
- (b) Hand-author layer barrels with explicit paths (`export * from './Button/index'` or `from './Button/Button'`). Friction-heavy; doesn't scale.
- (c) Eliminate the flat per-component JS layout entirely by removing per-component entries from `vite.config.ts` `build.lib.entry` and routing all consumers through the layer barrels — breaks the `@pkg/atoms/Button` subpath but matches how many libraries ship (radix-ui, mui).

### Verification commands for any future fix

- **Bundler runtime:** `bun -e` import (current passing baseline).
- **Bundler type-resolution:** from a scratch consumer dir, `bunx --bun typescript@5.9.3 --noEmit -p tsconfig.json` against a `smoke.ts` that imports from all three surface levels (`/atoms/Button`, `/atoms`, root).
- **NodeNext type-resolution:** same smoke.ts with `moduleResolution: 'nodenext'`.

Until fixed, consumers should either (a) use per-component subpath imports (`@pkg/atoms/Button`) for type-safe imports, OR (b) accept that layer-barrel runtime works fine and add `// @ts-expect-error` at the import. Document this constraint prominently when the package becomes externally consumed.

## PostCSS

`postcss.config.mjs` wires `@tailwindcss/postcss`. Required for tooling that runs PostCSS independently (some Storybook configs). The Vite plugin (`@tailwindcss/vite`) handles Vite-driven builds.

Both plugins coexist this iteration; don't remove either without verifying Storybook still compiles styles. See [../styling/SKILL.md](../styling/SKILL.md).

## Tailwind v4 dependency triad

- `tailwindcss@^4` — the core (resolves to 4.3.x).
- `@tailwindcss/postcss@^4` — PostCSS plugin.
- `@tailwindcss/vite@^4` — Vite plugin (preferred integration for Vite builds).
- `postcss` itself is still needed as a dev dep.

## Vite + plugin versions

- `vite@^8` (8.0.13+).
- `@vitejs/plugin-react@^6`.
- `vite-plugin-dts@^5` for the declaration build.

If plan docs or examples reference older Vite majors (5 / 6 / 7), treat the unpinned `bun add` result as authoritative.

## Vitest + RTL + jest-axe versions

- `vitest@^4` (4.1.7+).
- `@vitest/coverage-v8@^4` at the same major.
- `jsdom@^29`.
- `@testing-library/react@^16` (React 19 compatible).
- `@testing-library/jest-dom@^6`.
- `@testing-library/user-event@^14`.
- `jest-axe@^10` with companion `@types/jest-axe@^3` (the types package lags behind in major — don't try to "fix" it).

If older majors appear in planning docs, treat the unpinned `bun add` result as authoritative.

## Bash / zsh scripting gotcha

Bash `for` loops that capture into a `$status` variable error under zsh: `read-only variable: status`. `$status` is a zsh built-in (read-only special variable mirroring `$?`).

Use a non-reserved name like `code`, `http`, `rc`, `result`. Same applies to `$path`, `$pwd`, `$random`, `$seconds`, and other zsh special parameters — pick neutral names when scripting one-liners that need to run cleanly under zsh.

Comes up often when scripting headless verification (curl in a loop to check storybook manifest URLs, etc.).
