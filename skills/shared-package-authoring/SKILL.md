---
name: shared-package-authoring
description: Use when scaffolding or extending a `@open-tomato/*` shared package under `packages/shared/*` — creating its package.json/tsconfig/eslint/vitest, adding the first `src` files, or hitting a scaffold-time error (TS18003, TS6053, TS2307, `import/no-unresolved` on a brand-new package, `noUncheckedIndexedAccess`, ESLint import-order churn, or type-level test setup).
---

# Authoring Shared Packages

How to scaffold a new pure-TS `@open-tomato/*` package under `packages/shared/*`, plus the
scaffold-time TypeScript/ESLint errors that are **expected** and the ones that signal a real
mistake. For the ecosystem layout, internal-dep policy, and publish workflow, read
[`packages/AGENTS.md`](../../packages/AGENTS.md) first; for release mechanics see
[`releasing-packages`](../releasing-packages/SKILL.md).

`packages/shared/cli-core` is the canonical reference for everything below — copy its config
files when starting a new package.

## Core model (read first)

- **No root edit needed.** Shared packages are auto-registered via the root `workspaces` glob
  in `package.json`. Create the folder, run `bun install` at the repo root, done.
- **Pure-TS packages have no build step.** `main` and `exports["."]` both point at
  `./src/index.ts`; consumers and Bun resolve TS directly. A `build` script appears *only*
  when a package ships pre-bundled output (e.g. `logger`).
- **The task spec is authoritative.** When a spec lists exact deps/fields, follow it even if it
  differs from these defaults.

## Scaffold conventions (pure-TS package)

**`package.json`** — `type: "module"`, `private: false`, `publishConfig.access: "public"`,
`main`/`exports["."]` → `./src/index.ts`, scripts `"lint": "eslint --fix"` and
`"test": "vitest run"`. Standard devDep pins:

```jsonc
"devDependencies": {
  "@open-tomato/eslint-config": "workspace:^",
  "@open-tomato/typescript-config": "workspace:^",
  "@types/node": "^22.13.5",
  "eslint": "^9.39.4",
  "globals": "^16.0.0",
  "typescript": "^5.9.3",
  "vitest": "^3.0.0"
}
```

**`tsconfig.json`** — extends `@open-tomato/typescript-config/base` (**no `.json` suffix** — the
package only exports `./base`, `./react`, `./next`):

```jsonc
{ "extends": "@open-tomato/typescript-config/base",
  "compilerOptions": { "noEmit": true },
  "include": ["src/**/*"], "exclude": ["node_modules", "dist"] }
```

Add `compilerOptions.paths` only when the package exposes subpath exports (see `logger`).

**`vitest.config.ts`** — `node` environment for runtime packages; `jsdom` only when the package
renders DOM (e.g. `cache`'s React provider):

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node' } });
```

**`eslint.config.mjs`** — `@open-tomato/eslint-config/base` enables `globals.browser` + `Bun`
but leaves `globals.node` **off**. Any `src/` file that touches `process`/`Buffer`/etc. needs
`globals.node` spread back in (and `globals` in devDeps). A pure contract/types package with no
Node globals can `export default baseConfig` directly.

```js
import baseConfig from '@open-tomato/eslint-config/base';
import globals from 'globals';
/** @type {import("eslint").Linter.Config[]} */
export default [...baseConfig, { languageOptions: { globals: { ...globals.node } } }];
```

## Scaffold-time gotchas — expected vs. real

| Symptom | Cause | Action |
|---|---|---|
| `import/no-unresolved` on a fresh package's `vitest.config.ts` while `src/` is empty | `tsconfig` includes `src/**/*`; with zero inputs `tsc` errors `TS18003` and the ESLint typescript resolver can't bootstrap | **Expected.** Clears as soon as the first `src/` file lands. Add no workaround. |
| `import/no-unresolved` on unrelated files (e.g. can't resolve `vitest/config`) | `tsconfig` `extends` used a `.json` suffix → silent `TS6053` → cascades into the ESLint resolver | **Real bug.** Check `extends` first — must be `@open-tomato/typescript-config/base`, no suffix. |
| `tsc --noEmit` reports `TS2307` on a sibling import, but ESLint is green | Forward `import type { X } from './x'` where `./x.ts` lands in a later stage task (fine under `moduleResolution: bundler`) | **Expected** during multi-stage scaffolds. Verify lint passes and move on; the error clears when the dep file lands. |
| `T \| undefined` on array index access | `base` enables `noUncheckedIndexedAccess` — `argv[i]`, look-aheads like `argv[i+1]` are all `T \| undefined` | Narrow before use. Plan an explicit `if (x === undefined) continue;` whenever switching `for...of` → index iteration. |
| ESLint auto-fix reorders imports each run | Rule pushes all `import type` above value imports | Write tests/sources with `import type` first from the start to avoid no-op lint churn. |

## Type-level tests

Use vitest's built-in `expectTypeOf` (no extra devDep) — type assertions run at collect time, so
they count as passing tests with zero runtime cost:

- `expectTypeOf<T>().toEqualTypeOf<U>()` — exact equality; `.toMatchTypeOf<U>()` — assignability;
  `.not.toEqualTypeOf<U>()` — negation.
- Discriminated-union narrowing: wrap the `if (e.type === '...')` check in a function and call
  `expectTypeOf(e).toEqualTypeOf<NarrowedShape>()` inside the branch.

## When a loop task is already satisfied

A narrowly-scoped loop task ("resolve outputMode precedence", "freeze the context") is often
**already implemented** by a larger preceding task that scaffolded the whole module. Don't
rewrite working code to "do" the task. Default: read the current file → verify the requirement
is met → run package `test` + `lint` → mark complete with a small `patch` changeset.

## See also

- [`packages/AGENTS.md`](../../packages/AGENTS.md) — ecosystem layout, `workspace:^` policy, naming.
- [`releasing-packages`](../releasing-packages/SKILL.md) — changesets, version bumps, publish.
- `packages/shared/cli-core/` — the reference package these conventions are drawn from.
