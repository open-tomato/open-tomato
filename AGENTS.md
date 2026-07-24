---
title: "Open Tomato — Agent Guidelines"
description: "Umbrella orientation for agents working in the consolidated open-tomato mono-repo."
---

# AGENTS — Open Tomato

You are a software engineering agent working in the **open-tomato** mono-repo — the TypeScript-first, Bun + Turborepo workspace that houses the active cross-iterating stack: `packages/`, `services/`, the frontend apps (`app/`, `auth-app/`, `homepage/`, `docs-site/`), `cli/`, `templates/`, plus reference material in `docs/` and `skills/`.

**Before doing anything in this repo:**

1. Read **[`plans/INDEX.md`](plans/INDEX.md)** — the authoritative status board for all initiatives. Anything you're being asked to do likely maps to an entry there.
2. Read the **per-area `AGENTS.md`** for the directory you're about to touch (see [Per-area context](#per-area-context) below). Per-area files are scoped to one part of the tree; this root file deliberately does not restate them.
3. If your task crosses areas, read the relevant initiative's `plans/<slug>/INITIATIVE.md` to see the explicit `context.read-first` list.

This umbrella file gives you orientation, conventions, and pointers — nothing more. Per-area details, build commands specific to a workspace member, and ongoing roadmap status live in their respective scoped files.

## Quick Reference (root-level commands)

| Tool | Command | Description |
| --- | --- | --- |
| Lint | `bun lint` | Run after every change |
| Tests | `bun run test` | Vitest suite — do not use `bun test` |
| Build | `bun run build` | Build/transpile every workspace |
| Types | `bun run check-types` | `tsc --noEmit` across workspaces |
| Dev stack | `bun run dev:stack` | `docker compose up --build` |
| Secrets | `bws run -- <cmd>` | Inject secrets from Bitwarden Secrets Manager at runtime |

## Workspace layout

| Area | Path | Role |
| --- | --- | --- |
| Packages | `packages/` | All `@open-tomato/*` shared packages (`shared/*`, `service/*`, `notifications/*`, `agents/*`, `ui/*`). Published via the private registry. |
| Services | `services/` | Backend services (`notifications`, `orchestrator`, `scheduler`, `task-worker`, `auth`). |
| Apps | `app/`, `auth-app/`, `homepage/`, `docs-site/` | Frontends (Vite + React + TS): `app/` = webapp dashboard, `auth-app/` = auth gateway, `homepage/` = marketing (built from `@open-tomato/ui-portal`), `docs-site/` = docs (built from `@open-tomato/ui-docs`). |
| CLI | `cli/` | The `tomato` CLI — workspace member, publishes as `@open-tomato/cli`. |
| Templates | `templates/` | Service boilerplates (`express`, `mcp`). Workspace members and clone targets. |
| Types | `types/` | Repo-level shared TypeScript types (`@open-tomato/repo-types`). |
| Docs | `docs/` | Compiled documentation root for the publishable docs site. |
| Skills | `skills/` | Agent skills (API, drizzle-orm, git-workflow, hive-learning, n8n-nodes, etc.). |
| Plans | `plans/` | Initiative registry. See `plans/INDEX.md`. |
| Scripts | `scripts/` | Repo-wide helpers (publish pipeline lives under `packages/scripts/`). |

## Per-area context

When working in an area, read the file shown:

| Area | Read |
| --- | --- |
| `packages/` | [`packages/AGENTS.md`](packages/AGENTS.md) + the specific package's `AGENTS.md` if it has one |
| `services/` | [`services/AGENTS.md`](services/AGENTS.md) + the specific service's `AGENTS.md` |
| `app/` | [`app/AGENTS.md`](app/AGENTS.md) |
| `cli/` | [`cli/AGENTS.md`](cli/AGENTS.md) |
| `templates/` | [`templates/AGENTS.md`](templates/AGENTS.md) + the specific template's |
| `docs/` | [`docs/AGENTS.md`](docs/AGENTS.md) |
| `skills/` | [`skills/AGENTS.md`](skills/AGENTS.md) |

External / on-hold / satellite repos (`grow-box/`, `auth/`, `knowledge-base/`, `token-monitor/`, `design-system/`, `component-breakdown/`) live at the umbrella level (`/Users/marcos/projects/open-tomato/`) and have their own `AGENTS.md`. They consume `@open-tomato/*` from the private registry as `^<version>`.

## Dependency reference policy

- **Inside this mono-repo:** all internal `@open-tomato/*` deps use `workspace:^`. Resolved by Bun's workspace protocol at install time, rewritten to `^<version>` at publish time by `packages/scripts/prepare-publish.ts`.
- **Outside this mono-repo** (external consumers like `grow-box/`, `auth/`): `@open-tomato/*` deps consume the private registry as `^<version>`.
- **`file:` refs are not used** inside this workspace post-consolidation.

## Workflow defaults

1. **Read context** — `plans/INDEX.md`, per-area `AGENTS.md`, applicable skills under `skills/`.
2. **Plan** — present a flat checklist; align on architecture before adding deps or structural changes.
3. **Develop with TDD** — tests first, then implementation; lint and test continuously.
4. **API work** — Zod validation, consistent response envelopes, security headers.
5. **Commit** — conventional commits (`<type>: <scope> <description>`), no AI attribution.
6. **Before marking done** — pass the [Automation Checklist](#automation-checklist).

## Package and project rules

- **Do not add deps to the root `package.json`** unless they are genuinely shared across every workspace.
- Versioning is per workspace member — each `package.json` has its own version.
- Root `tsconfig.json` and `eslint.config.ts` are the constitution — extend them, never override.

## Automation checklist

- [ ] **TSDoc**: Is the logic explained for all new functions and modules?
- [ ] **Complexity**: Can any new function be broken down further?
- [ ] **Tests**: Are the main flow and critical branches covered?
- [ ] **Types**: Are shared types going through `@open-tomato/repo-types` or a package, rather than being duplicated?
- [ ] **Errors**: Does the error handler catch potential failures — nothing will crash the process?
- [ ] **Delivery**: Is the code completed, properly consumed/integrated, and ready for production?

## Known gotchas (post-consolidation)

- **Test files and story files are excluded from `check-types`** in some packages (e.g., the `packages/ui/*` libraries). This matches the established pattern: dev artifacts are not production code; `tsc --noEmit` only gates production sources.
- **Pre-existing test debt in `services/orchestrator/`** — several `runner.test.ts` / store tests reference functions the test mocks don't expose (broken since commit `e96fbb2`, the executor→orchestrator rename). These are not regressions from the consolidation. Track as separate tech debt.
- **Per-area `AGENTS.md` files merged from prior standalone repos** (`cli/`, `templates/express/`, `templates/mcp/`, several under `packages/`) may still describe their pre-consolidation standalone context. They should be refreshed lazily as work touches each area.

## Tooling notes

- **Semgrep post-write hook:** the local Claude Code harness runs `semgrep mcp -k post-tool-cli-scan` after every `Write`. It reports `No SEMGREP_APP_TOKEN found` and is treated as a blocking error, but the write itself always succeeds. **Ignore this hook output** — proceed with subsequent tool calls as normal.

## See also

- [`README.md`](README.md) — repository overview and quick start
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — human contributor guide
- [`SECURITY.md`](SECURITY.md) — security policy
- [`plans/INDEX.md`](plans/INDEX.md) — initiative registry (authoritative roadmap)
- [`../AGENTS.md`](../AGENTS.md) — umbrella orientation (external repos: `grow-box/`, `auth/`, etc.)
- [`../MIGRATION_STATUS.md`](../MIGRATION_STATUS.md) — ground-truth snapshot if any doc disagrees with the tree
