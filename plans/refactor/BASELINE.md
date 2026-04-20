# Legacy Monorepo Baseline — Pre-Refactor Snapshot

Recorded: 2026-04-20 (Plan 00, Step 00.5)

## Source tree fingerprint

- Path: `/Users/marcos/projects/open-tomato/legacy-monorepo/`
- **Not a git repo** (no `.git/`) — recording file fingerprints instead of a SHA.
- `package.json` mtime: `2026-04-20T12:19:39Z`
- `bun.lock` mtime: `2026-04-20T16:18:56Z`
- `bun.lock` sha256: `bb89c74679ca0285f86ead479d4db522707dfe3fa7fd62e1e4f9d312193b4e8b`
- Package manager: `bun@1.3.9`
- Workspace globs: `apps/*`, `mcps/*`, `packages/*`, `scripts/*`, `services/*`, `templates/*`

## Command results

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Install | `bun install` | 0 | 1427 installs across 1550 packages, no changes. Husky prints `".git can't be found"` (harmless — legacy-monorepo is not a git repo). |
| Lint | `bun lint` | 1 | 32/40 tasks OK. **Pre-existing failure**: `@open-tomato/mcp#lint` — 3 `import/order` errors in `packages/mcp/src/{create-mcp,schema,types}.ts` (all `--fix`-able). |
| Test | `bun run test` | 1 | 12/39 tasks OK. **Pre-existing failures**: `@open-tomato/template-app`, `@open-tomato/template-package`, `@open-tomato/config` (exit 130 = SIGINT-ish), `@open-tomato/types`, `@open-tomato/errors`, `@open-tomato/agent-memory`. |
| Build | `bun run build` | 2 | 17/27 tasks OK (12 cached). **Pre-existing failure**: `@open-tomato/orchestration#build` — 6 TypeScript errors (TS6133 unused locals + TS2314/TS2740 `Server<WebSocketData>` generic arg mismatches) all in `src/__tests__/*.test.ts`. |

## Interpretation

Baseline is **red on lint/test/build** at the start of the refactor. This is the reference point — post-migration checks must not introduce *new* failures beyond this list. Existing failures either:

1. Must be fixed in-place (and the commit attributed in the relevant plan stage), or
2. Must be carried forward identically and called out in the relocated service's plan.

Specifically watch for regressions in:
- `@open-tomato/mcp` (lint) — migrated in Plan 05.
- `@open-tomato/orchestration` (build) — slated for Plan 08 as an optional/on-demand package.
- Any `@open-tomato/{types,errors,agent-memory,config}` failures — migrated in Plan 01.

## Raw logs

Full output was captured to `/tmp/legacy-{lint,test,build}.log` at time of run (ephemeral — re-run to reproduce).
