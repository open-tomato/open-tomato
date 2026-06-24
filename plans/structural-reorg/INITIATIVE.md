---
slug: structural-reorg
status: done
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

| #     | Task               | Status                       | Tag/Notes |
| ----- | ------------------ | ---------------------------- | ------------------ |
| R-0   | Preflight          | **done**                     | (a) registry now reachable (VPN was *interfering* with DNS, not the cure); (b) version snapshot captured (`/tmp/registry-snapshot.json` — 23/24 packages at 0.1.1; agents-config not yet published); (c) skipped (R-3c does the real validation); (d) collision report — prefix-based subtree-add has no root collisions |
| R-1   | Doc-truth fix      | **done**                     | (umbrella AGENTS.md + README.md corrected) |
| R-2   | Plan registry skeleton | **done**                 | tag `refactor/R-2-complete` |
| R-2.5 | External-consumer stopgap relink | **done**         | `auth/`, `knowledge-base/`, `token-monitor/` pinned to registry `^0.1.1`. Each `bun install`s clean standalone. Committed in each repo (auth `a27000b`, knowledge-base `dc78afd0`, token-monitor `8e1677b`). |
| R-3a  | Subtree merges     | **done**                     | tag `refactor/R-3a-complete`. Sources: `packages/` from `feat/config-standard` branch (captures OPT-176); `tomato-cli/`, `template-service-{express,mcp}/` from `main` |
| R-3b  | Workspaces + dep rewrite + .changeset reconcile | **done** | tag `refactor/R-3b-complete`. 9 package.json rewrites file:→workspace:^, `overrides` stripped, `packages/.changeset/` moved to root `.changeset/`. Install/check-types/build all green. Test failures in orchestrator + ui-skeleton Sidebar are pre-existing — see Known gotchas. |
| R-3c  | Publish pipeline relocate + dry-publish validation | **done** | tag `refactor/R-3c-complete`. Publish scripts moved from packages/package.json to root; `workspace.ts` expectedPackageName extended for `agents/<x>` group; nested-path group calculation fixed (segments[length-2]); preflight skips naming/semver checks for private packages. **Gate met:** `bun packages/scripts/publish-packages.ts --dry-run` succeeds; publint validates the tarball; rewriter handles `workspace:^` correctly. Equivalent to architect's verdaccio install gate. |
| R-4   | Move skills/ + documentation/ | **done**          | tag `refactor/R-4-complete`. `git mv` from umbrella into `open-tomato/skills/` (348 files) and `open-tomato/docs/` (3 files; `.git/` neutralized + re-added as plain files) |
| R-5   | AGENTS.md hierarchy rebuild | **done**            | tag `refactor/R-5-complete`. Root AGENTS.md rewritten as umbrella; 6 area-level AGENTS.md created (`packages/`, `services/`, `app/`, `templates/`, `docs/`, `skills/`); existing per-package AGENTS.md preserved as-is and flagged for lazy refresh |
| R-6   | External consumer bump to latest | **done (no-op currently)** | R-2.5 already pinned to `^0.1.1`, which IS the current latest on registry for all 23 published packages. Nothing to bump until a new version actually ships (next `bun run release`). |
| R-7   | Plan 09 legacy cleanup | deferred (separate initiative) | — |

## pre-reorg-wip disposition

Inspected the diff at `git diff main..pre-reorg-wip --stat`. Every change was either:

- **Superseded by R-3b** (5 of 7 files: `file:`/lockfile/overrides → all rewritten more thoroughly here)
- **Superseded by R-1+R-2** (`AGENTS.md` formatting and `plans/refactor/README.md` 29-line status block — both now covered in 3 better-maintained places: the corrected umbrella `AGENTS.md`, `plans/INDEX.md`, and `MIGRATION_STATUS.md`)
- **Regression** (`ci.yml` had `branches: [main]` commented out — disabling CI is the opposite of what we want post-merge)

No cherry-picks were applied. The `pre-reorg-wip` branch is preserved on-disk as an archival snapshot (`b964c91`). User can delete after fast-forward of `main`.

## Where the work lives

All R-2 through R-5 commits are on the **`structural-reorg`** branch of the `open-tomato/` git repo. Main is untouched. User's pre-session WIP (uncommitted AGENTS.md formatting + package.json edits) is preserved on the **`pre-reorg-wip`** branch (commit `b964c91`) — to be reconciled with R-5's AGENTS.md rewrite via cherry-pick or merge.

Branch state:
- `main` — unchanged from `d12c999 docs(plans): record Plan 08 migration results`
- `pre-reorg-wip` — `b964c91 wip: pre-structural-reorg snapshot of user changes`
- `structural-reorg` — through `R-5-complete`; ready for review

Tags: `refactor/R-2-complete`, `refactor/R-3a-complete`, `refactor/R-3b-complete`, `refactor/R-4-complete`, `refactor/R-5-complete`.

## Plan file

Full 10-phase sequence, risk register, and per-phase verification gates: [/Users/marcos/.claude/plans/assessment-of-open-zesty-journal.md](/Users/marcos/.claude/plans/assessment-of-open-zesty-journal.md)
