---
slug: structural-reorg
status: in-progress
areas: [cross-cutting]
linear: []
started: 2026-06-24
last-touched: 2026-06-24
---

# Structural reorg — consolidate active stack into `open-tomato/`

## Why

The Open Tomato umbrella has evolved through three structural eras (monolithic → mono-repo with packages → multi-repo split). The current multi-repo split was meant to keep agent context tight, but in practice it causes:

1. **Cross-area work has no shared discovery layer** — an agent loading context for one problem space can't see what the upstream/downstream space has planned for the work it depends on. Concrete failure: an agent migrating `grow-box/` to use `tomato-cli` got confused between `@open-tomato/config` and `@open-tomato/agents-config` because nothing told it which scope to load.
2. **Umbrella docs actively mislead** — `README.md` and `AGENTS.md` marked migrated services as "out of scope" months after they were migrated (corrected in R-1).
3. **Broken cross-repo linking** — 30 `file:` refs + mis-protocoled `workspace:^` refs across consumer repos.

## Scope

- Consolidate `packages/`, `tomato-cli/`, `template-service-express/`, `template-service-mcp/` into `open-tomato/` as workspace members under `packages/`, `cli/`, `templates/express/`, `templates/mcp/`.
- Move top-level `skills/` and `documentation/` into the consolidated repo at `open-tomato/skills/` and `open-tomato/docs/`.
- Establish the unified plan-registry convention (this file is part of it).
- Re-link external consumers (`auth/`, `knowledge-base/`, `token-monitor/`, `grow-box/`) to the private registry as `^<version>`.
- Rebuild `AGENTS.md` hierarchy: root umbrella + per-area scoped files instead of one drifting global file.

## Out of scope

- Plan 09 (legacy-monorepo deletion) — that's a separate initiative; sequenced after this one.
- Internal structure of on-hold satellites: `auth/`, `knowledge-base/`, `token-monitor/`, `design-system/`, `component-breakdown/`. Revisit when each becomes active.
- `grow-box/` internals — only its `@open-tomato/*` deps get re-pointed.
- Business logic.
- Package names — `@open-tomato/*` namespace is settled.
- Registry / Changesets pipeline behavior — works as-is.

## Success criteria

- Single `open-tomato/` workspace contains the active stack (packages, cli, templates, services, apps).
- From the merged root: `bun install --frozen-lockfile=false && bun run check-types && bun run build && bun run test && bun run preflight && bun run publish:dry` all green.
- Verdaccio sandbox: publish one bumped patch, install in scratch dir, `require` it successfully.
- Each external consumer (`grow-box/`, `auth/`, `knowledge-base/`, `token-monitor/`) `bun install`s standalone with `@open-tomato/*` deps pointing at registry `^<version>`.
- Fresh-session agent asked "find the plan for OPT-138 and tell me what it depends on" finds the right `plans/<initiative>/<task>.md` via `context.read-first` — not naming-proximity guessing.

## Dependencies

- **Internal:** none (this is the leaf reorg).
- **External:**
  - VPN / tailnet access to `npm.heimdall.bifemecanico.com` for R-0(a/b), R-2.5, R-3c verification, R-6. **Currently blocked from the primary dev host** — see [PREREQUISITES.md](./PREREQUISITES.md).

## Task list

| #     | Task               | Status                       | Blocker            |
| ----- | ------------------ | ---------------------------- | ------------------ |
| R-0   | Preflight          | partial (a/d done; b/c skipped) | (b) needs registry |
| R-1   | Doc-truth fix      | done                         | —                  |
| R-2   | Plan registry skeleton | in-progress              | —                  |
| R-2.5 | External-consumer stopgap relink | pending          | needs registry     |
| R-3a  | Subtree merges     | pending                      | —                  |
| R-3b  | Workspaces + dep rewrite + .changeset reconcile | pending | —    |
| R-3c  | Publish pipeline relocate + verdaccio verification | pending | verdaccio needs registry |
| R-4   | Move skills/ + documentation/ | pending           | —                  |
| R-5   | AGENTS.md hierarchy rebuild | pending             | —                  |
| R-6   | External consumer bump to latest | pending        | needs registry + R-3c |
| R-7   | Plan 09 legacy cleanup | deferred (separate initiative) | — |

## Plan file

Full 10-phase sequence, risk register, and per-phase verification gates: [/Users/marcos/.claude/plans/assessment-of-open-zesty-journal.md](/Users/marcos/.claude/plans/assessment-of-open-zesty-journal.md)
