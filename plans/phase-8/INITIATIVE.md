---
slug: phase-8
status: pending
areas: [packages, cli, cross-cutting]
linear: [OPT-138, OPT-139, OPT-140]
started: 2026-06-24
last-touched: 2026-06-24
---

# Phase 8 — upstream support for Grow Box CLI/TUI

## Why

The Grow Box Phase 8 initiative builds the `tomatops`/`tomato` + Rust TUI stack on top of structured CLI + vendor-plugin contracts that don't yet exist upstream. The grow-box plan correctly identifies what should live in the Open Tomato monorepo (the shared contracts + the `tomato` runtime extension) vs. what stays in `grow-box/` (the Grow Box-specific platform plugin, commands, and TUI).

This initiative is the **upstream half** — the work that ships to the private registry and lets Grow Box consume it via `^<version>`. The Grow Box-side work is tracked separately in `grow-box:docs/phases/phase-8/`.

## Scope

Eight upstream pieces (A1–A8 in [REVIEW.md](./REVIEW.md)):

- `@open-tomato/cli-core` (NEW shared package): `CliContext`, `CliCommand`, `CliOutput`, `ArgSpec`/`FlagSpec`, NDJSON `CliEvent`
- `@open-tomato/vault` (NEW shared package): BWS auth strategies + id-mapping fallback
- `@open-tomato/platform-core` (NEW shared package): `PlatformPlugin` interface + `Provision*` types
- `@open-tomato/config` (extension): schema v2 — vendor namespace, provision object, project.owner
- `@open-tomato/tomato-cli` (extension in `cli/`): adopt cli-core, add `--output=json`, NDJSON, `describe`
- `@open-tomato/tomato-cli` (extension in `cli/`): external command discovery via `.open-tomato-root` + `ot.commands`
- `@open-tomato/platform-heroku` (NEW shared package): reference 2nd plugin proving the interface generalizes
- Cut a registry release of all the above so Grow Box can pin it

## Out of scope

- The Grow Box-specific platform plugin (`platform-growbox`) and commands (`svc validate/generate/...`) — those live in `grow-box/tools/` per [grow-box:docs/phases/phase-8/PLAN-1.md](../../../grow-box/docs/phases/phase-8/PLAN-1-packages.md).
- The Rust TUI — `grow-box/tui/` per [grow-box:docs/phases/phase-8/PLAN-4.md](../../../grow-box/docs/phases/phase-8/PLAN-4-tui.md).
- The parity gate against bash output — `grow-box/tests/`.
- Plan 09 (legacy-monorepo deletion) — separate initiative.

## Success criteria

- `npm view @open-tomato/cli-core versions` returns ≥1 version on the private registry.
- Same for `@open-tomato/vault`, `@open-tomato/platform-core`, `@open-tomato/platform-heroku`.
- `npm view @open-tomato/config versions` shows a bump including schema v2.
- `npm view @open-tomato/tomato-cli versions` shows a bump that includes the `--output=json` flag and `describe` serializer.
- `tomato --describe` from a fresh global install produces the documented JSON tree with `schemaVersion: 1`.
- From a fresh `grow-box/` checkout pointing `tools/.npmrc` at the registry version, `bun install` resolves all four new packages.

## Dependencies

- **Internal:** none — first initiative in the post-reorg roadmap that's actually new product work.
- **External:** registry reachability from dev / homelab / CI per [structural-reorg PREREQUISITES](../structural-reorg/PREREQUISITES.md). VPN was *interfering* with registry DNS during the reorg, not the cure — confirm reachability from the Phase 8 work machine before starting.
- **Cross-repo:** the grow-box side of Phase 8 (`grow-box:docs/phases/phase-8/PLAN-1..4.md`) depends on this initiative landing first. After step 7 (`phase-8-registry-cut`), grow-box can begin its B-series tasks.

## Task list

| Step | Task | Where | Scope | Initiative slug |
| --- | --- | --- | --- | --- |
| 1 | A1 — cli-core types + assembleContext | `packages/shared/cli-core/` | Medium | `plans/cli-core/` |
| 2 | A3 — platform-core interface | `packages/shared/platform-core/` | Small | `plans/platform-core/` |
| 3 | A2 — vault BWS strategies | `packages/shared/vault/` | Small | `plans/vault/` |
| 4 | A4 — config schema v2 extension | `packages/shared/config/` | Medium | `plans/config-schema-v2/` |
| 5 | A5 — cli structured-output adoption | `cli/` | Medium | `plans/cli-structured-output/` |
| 6 | A6 — cli external command discovery | `cli/` | Medium | `plans/cli-external-discovery/` |
| 7 | A8 — registry cut + grow-box pin | publish pipeline | Small | `plans/phase-8-registry-cut/` |
| 8 (parallel from step 4) | A7 — platform-heroku reference plugin | `packages/shared/platform-heroku/` | Medium | `plans/platform-heroku/` |

Steps 1–7 are the critical path for unblocking grow-box. Step 8 (heroku) can run in parallel and isn't a grow-box dependency.

## Hand-off to grow-box

After step 7, hand off to grow-box's B-series work using these cross-repo references:

| Upstream pin | Unblocks |
| --- | --- |
| `@open-tomato/cli-core@^X.Y.Z` | `grow-box:phases/phase-8/svc-commands`, `setup-command` |
| `@open-tomato/platform-core@^X.Y.Z` + `@open-tomato/config@^X.Y.Z` (schema v2) | `grow-box:phases/phase-8/platform-growbox` |
| `@open-tomato/tomato-cli@^X.Y.Z` (with cli-structured-output + cli-external-discovery) | `grow-box:phases/phase-8/tomatops`, `tui` |

## See also

- **[REVIEW.md](./REVIEW.md)** — verbatim architect re-scope, including full per-piece breakdown for both repos, cross-cutting concerns, conflicts with current plan text, and the canonical 18-step execution order.
- **[grow-box:docs/phases/phase-8/PLAN.md](../../../grow-box/docs/phases/phase-8/PLAN.md)** — the original Phase 8 plan overview (currently has stale references to the pre-consolidation layout; see REVIEW.md Section D for the list).
- **[grow-box:docs/phases/phase-8/REVIEW.md](../../../grow-box/docs/phases/phase-8/REVIEW.md)** — mirror of this review for the grow-box side.
- **[../structural-reorg/INITIATIVE.md](../structural-reorg/INITIATIVE.md)** — the consolidation this initiative builds on.
- **[../../packages/AGENTS.md](../../packages/AGENTS.md)** — the `config` vs `agents-config` naming rule; do NOT conflate.

## Pre-Phase-8 prerequisites

Per REVIEW.md Section F, must land before step 1:

- bun toolchain pinned + present on dev / homelab / CI
- Phase 7 machinery present in grow-box (already done; verify before parity gate)
- Bash substrate kept (`scripts/setup.sh` etc. — already in place)
- `BWS_ACCESS_TOKEN` in shell + CI secret store
- Plan-text refresh: update grow-box's PLAN.md + PLAN-1 to reflect the consolidated `open-tomato/` layout (REVIEW.md Section D enumerates the specific stale passages). Do this BEFORE any code work begins, so subsequent agents don't act on stale paths.
