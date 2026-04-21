---
title: "Open Tomato — Agent Guidelines"
description: "Orchestration guide for agents working in the open-tomato application monorepo (services + app)."
---

# AGENTS — Open Tomato Monorepo

You are a software engineering agent working in the **open-tomato** monorepo — the TypeScript-first, Bun + Turborepo workspace that houses the application services and the frontend. Shared libraries live in the sibling [`../packages/`](../packages/) repo; CLI, templates, and Claude skills live in other umbrella siblings. Always read this file first, then the target project's own `AGENTS.md` before starting a task. See [`SECURITY.md`](SECURITY.md) for security rules.

## Quick Reference

| Tool | Command | Description |
| --- | --- | --- |
| Lint | `bun lint` | Run after every change |
| Tests | `bun run test` | Vitest suite — do not use `bun test` |
| Build | `bun run build` | Build/transpile every workspace |
| Types | `bun run check-types` | `tsc --noEmit` across workspaces |
| Dev stack | `bun run dev:stack` | `docker compose up --build` |
| Secrets | `bws run -- <cmd>` | Inject secrets from Bitwarden Secrets Manager at runtime |

## Key Files

| Path | Purpose |
| --- | --- |
| `AGENTS.md` (this file) | Root-level agent context for this monorepo |
| `CONTRIBUTING.md` | Human contributor guide (setup, code style, PRs) |
| `README.md` | Monorepo overview and quick start |
| `SECURITY.md` | Security policy — secrets, reporting, audit cadence |
| `eslint.config.ts` | Root ESLint config — extend from project configs, never override |
| `tsconfig.json` | Root TypeScript config — extend from project configs, never override |
| `turbo.json` | Build/test/lint/dev pipeline definitions |
| `docker-compose.yml` | Dev-loop constellation for services + app + postgres |
| `plans/refactor/` | In-progress plans for the legacy monorepo split |

## Workspace Layout

| Path | Contents |
| --- | --- |
| `app/` | Vite + React + TS frontend (placeholder until feature work starts) |
| `services/` | Backend services (`notifications`, `orchestrator`, `scheduler`, `task-worker` — populated in Plan 03) |
| `types/` | Repo-level shared TypeScript types (`@open-tomato/repo-types`) |

## Cross-Repo Resolution Order

Shared libraries and sibling projects are referenced in this order of preference:

1. **Published npm org package** (e.g., `"@open-tomato/logger": "^1.0.0"`). *Target end state.*
2. **Directory file reference** (e.g., `"@open-tomato/logger": "file:../../packages/shared/logger"`). *Current state during the split.*
3. **GitHub ref** (e.g., `"user/repo#semver:^1.2.0"`). *Fallback only.*

Never use `workspace:*` to reach libraries across repo roots — this workspace cannot resolve another workspace's `workspace:` protocol.

## Agent Profiles

- **plan/design** — scoping a feature; read this file and the target project's `AGENTS.md`.
- **development** — implement TDD-first; lint after every change.
- **testing** — negative tests first, mock all external deps.
- **documentation** — confirm whether destination is manual (`docs/`) or auto-generated (dotfolders) before writing.
- **maintenance** — read the target project's `AGENTS.md` first; gotchas live in project-local files.

## Workflow Summary

1. **Read context** — this file, the target project's `AGENTS.md`, and applicable skills at [`../skills/`](../skills/).
2. **Plan** — present a flat checklist; align on architecture before adding deps or structural changes.
3. **Develop with TDD** — tests first, then implementation; lint and test continuously.
4. **API work** — Zod validation, consistent response envelopes, security headers.
5. **Documentation** — manual docs to `docs/`, auto-generated to dotfolders.
6. **Commit and track** — conventional commits (`<type>: <scope> <description>`), no AI attribution (enforced globally).
7. **Before marking done** — pass the Automation Checklist below.

## Package and Project Rules

- **Do not add deps to the root `package.json`** unless they are genuinely shared across every workspace.
- Versioning is per project — each `package.json` has its own version.
- Root `tsconfig.json` and `eslint.config.ts` are the constitution — extend them, never override.
- Shared libraries must be consumed from [`../packages/`](../packages/) via `file:` refs (or, once published, via npm).

## Automation Checklist

- [ ] **TSDoc**: Is the logic explained for all new functions and modules?
- [ ] **Complexity**: Can any new function be broken down further?
- [ ] **Tests**: Are the main flow and critical branches covered?
- [ ] **Types**: Are shared types going through `@open-tomato/repo-types` or a package, rather than being duplicated?
- [ ] **Errors**: Does the error handler catch potential failures — nothing will crash the process?
- [ ] **Delivery**: Is the code completed, properly consumed/integrated, and ready for production?

## Known Deviations (Scaffold Stage)

- **Lint gate is a no-op at the scaffold stage.** `@open-tomato/eslint-config` is consumed via `file:../packages/shared/eslint-config`. Its plugin dependencies (`@typescript-eslint/*`, `eslint-plugin-*`, `jiti`, `eslint` itself) are declared as `devDependencies` of that package and are therefore not installed transitively via a `file:` ref. Real linting will be restored once:
  1. `@open-tomato/eslint-config` moves its consumer-facing plugin deps to `dependencies` / `peerDependencies`, **or**
  2. the packages are published to the npm org and consumed via semver ranges.
  Until then, `app/package.json`'s `lint` script is an `echo + exit 0` placeholder. Do not restore `eslint --fix` until one of the two conditions above holds.
- **Root `package.json` contains `overrides`** mapping `@open-tomato/eslint-config` and `@open-tomato/typescript-config` to their `file:` paths. This works around `bun install` failing to resolve `workspace:*` specifiers inside the linked packages. Remove the overrides block once the packages are on npm.

## See Also

[README.md](README.md) — overview · [CONTRIBUTING.md](CONTRIBUTING.md) — dev guide · [SECURITY.md](SECURITY.md) — security · [../AGENTS.md](../AGENTS.md) — umbrella split map.
