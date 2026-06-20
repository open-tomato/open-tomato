---
title: "TypeScript Config Agent Context"
description: "Package-specific gotchas and guidelines for typescript-config."
---

# TypeScript Config — Agent Context

## Gotchas

- Project's `tsconfig.json` **should** use `extends: '@open-tomato/typescript-config/base'`. For stack variants and their compiler options, use the alternative exports (`@open-tomato/typescript-config/react.json`, `@open-tomato/typescript-config/nextjs`).
- TypeDoc's `tsconfig` must exclude `*.test.ts` — otherwise TypeDoc compiles test files and fails on strict TS errors.
- `export type { Foo } from './bar'` does **not** make `Foo` available for use within the same file — a separate `import type { Foo } from './bar'` is required if the type is also referenced locally.
- TypeScript allows omitting unused callback params entirely (e.g., `register() {}` instead of `register(_app, _ctx) {}`). Prefer this in test files over `_`-prefixed params.
- **Unresolved workspace packages** (e.g., a package not yet implemented): use `// @ts-expect-error` immediately before the import AND add the package to the `ignore` array of `import/no-unresolved` in `eslint.config.mjs`. Do **not** use inline `// eslint-disable-next-line` comments — `eslint --fix` strips them when reordering imports.
- **`noUncheckedIndexedAccess: true`**: Buffer and array index access (`arr[i]`) returns `T | undefined`. Use `(arr[i] ?? fallback)` pattern instead of direct compound assignment (`arr[i] ^= expr`).
- **Vitest mock parameter types**: When typing `mockImplementation` callbacks, omit type annotations on unused parameters rather than annotating them as `never`. `never` as a parameter type is contravariant-incompatible with generic procedure types.
- **`NodeJS.ErrnoException` is rejected by ESLint `no-undef`** — declare a local interface instead: `interface NodeError extends Error { code?: string }`. The global `NodeJS` namespace is not available in all ESLint configs.
- **`node:child_process` spawn TS2339 with `@types/node@25`** — `@types/node@25` defines `ChildProcess extends InternalEventEmitter<ChildProcessEventMap>` and in TS 5.9 with `moduleResolution: bundler`, `.on` is not accessible on `ChildProcessWithoutNullStreams` (TS2339). Fix: replace `spawn + child.on('close', ...)` with `promisify(execFile)` — avoids the event API entirely and is fully typed. For the result, `ExecFileException` has `code?: number | string` and `killed?: boolean`; check `killed === true` for timeout, and use `typeof code === 'number' ? code : 1` to normalize non-zero exit codes.
