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
- Per-atom entries can be generated programmatically via `Object.fromEntries(names.map(...))`.

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
