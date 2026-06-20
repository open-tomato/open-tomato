---
title: "ESLint Config Agent Context"
description: "Package-specific gotchas and guidelines for eslint-config."
---

# ESLint Config — Agent Context

## Gotchas

- New projects **must** have an `eslint.config.mjs` or the pre-commit hook (`turbo run lint --filter=[HEAD^1]`) will fail.
- Default `eslint.config.mjs` exports `baseConfig` directly. To add overrides: `export default [...baseConfig, { rules: {...} }]`.
- Default JavaScript/TypeScript projects: import `@open-tomato/eslint-config/base`. React projects: `@open-tomato/eslint-config/react`.
- Add `{ ignores: ['docs/**'] }` as the **first** entry in `eslint.config.mjs` — before spreading `baseConfig` — to prevent ESLint from linting TypeDoc output.
- `bun:test` imports are flagged as unresolved by ESLint. Fix with `'import/no-unresolved': ['error', { ignore: ['^bun:'] }]` in the package's ESLint config.
- Provider files that export both a component and hooks/constants (e.g. `AppContextProvider.tsx`, `AuthProvider.tsx`) must have `/* eslint-disable react-refresh/only-export-components */` at the top of the file — fast-refresh only allows one export per file, so mixed-export providers need the disable.
- ESLint enforces `markdown/fenced-code-language` — every fenced code block in `.md` files must declare a language (use `text` for plain diagrams or prose blocks).
- `@typescript-eslint/no-unused-vars` has **no** `argsIgnorePattern` in this repo — `_`-prefixed args are still flagged. For structurally required unused params (e.g., Express `ErrorRequestHandler`'s 4th `next` arg), use `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above the function. For unused callback params in tests, prefer omitting them entirely instead.
- `@typescript-eslint/no-explicit-any` is enabled — use typed intersections or `unknown` casting (e.g., `err as { status?: number; message?: string }`) instead of `any`.
- Express `ErrorRequestHandler` requires all 4 params declared even if `next` is unused — it's a structural requirement of the type signature.
- Node-targeting projects (e.g., Express-based): `eslint.config.mjs` must include `globals.node` spread into `languageOptions.globals` to allow `process`, `__dirname`, etc. Add `globals` as a devDependency.
- **Never rely on Node globals being implicitly available** — not every project configures `globals.node`. Always import Node built-ins explicitly: `import process from 'node:process'`, `import { Buffer } from 'node:buffer'`, etc. This applies to test files too (they do not inherit the service's ESLint globals config).
- **Import ordering within node built-ins** — `node:*` specifiers and bare built-in names (`fs`, `path`, `os`, etc.) are treated as the same group. No blank lines within the group; alphabetical order is enforced. Example: `fs` → `node:process` → `os` → `path`.
- **Multi-line ternaries require newlines** — ESLint enforces a newline between each part. Always write ternaries as: `condition\n  ? consequent\n  : alternate` when the expression spans the right-hand side of an assignment.
- **`no-undef` incorrectly flags TypeScript type references** — ESLint's `no-undef` rule does not understand TypeScript-only types (e.g., `RequestInit`). Disable it for `**/*.ts` files via a local config override: `{ files: ['**/*.ts'], rules: { 'no-undef': 'off' } }`. TypeScript's compiler handles undefined-identifier checks for types.
- **Legacy `bun:test` test files and ESLint** — files that use `import { ... } from 'bun:test'` or other `bun:*` imports will cause `import/no-unresolved` errors. Add them to the `ignores` array in `eslint.config.mjs` rather than suppressing inline.
