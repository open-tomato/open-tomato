---
type: review
initiative: phase-8
author: architect (via structural-reorg session 2026-06-24)
---

# Phase 8 re-scope review — verbatim architect output

The grow-box [Phase 8 plans](../../../grow-box/docs/phases/phase-8/PLAN.md) were authored when `packages/`, `tomato-cli/`, and `template-service-*/` were separate sibling repos under the umbrella. After the structural reorg, they're all workspace members of `open-tomato/`. This document is the architect's re-scoping of Phase 8 work between the consolidated `open-tomato/` and the unchanged `grow-box/` repo.

The execution order in **Section E** is what a fresh session should follow. The per-initiative summaries in **Sections A and B** describe each step. **Section D** lists plan text that's now stale and should be corrected before any work begins.

---

## Section A — Work that lands in `open-tomato/`

| # | Where | What | Why upstream | Source | Deps | Initiative slug | Scope |
|---|---|---|---|---|---|---|---|
| A1 | `packages/shared/cli-core/` | The OPT-138 contract: `CliContext`, `CliCommand`, `CliOutput`, `ArgSpec`/`FlagSpec` metadata, verbosity gating, NDJSON `CliEvent` union, `assembleContext({argv,env,forceOutputMode})`. Pure types + a runtime helper, no command source. | Every `tomato`/`tomatops` consumer needs it; Grow Box is one of many. Naming follows `packages/AGENTS.md` (bare = shared). | PLAN.md §1–3, PLAN-2 "Structured-output adoption", PLAN-3 "Metadata contract hardening", "NDJSON streaming protocol" | `@open-tomato/config` (already done) | `plans/cli-core/` | Medium |
| A2 | `packages/shared/vault/` | BWS auth strategies, vault-id mapping (`<id>-<env>[-<region>]` fallback), token loading. No grow-box specifics. | Shared across every consumer that resolves `{{vault.*}}`. | PLAN-1 ownership table, PREREQUISITES (`BWS_ACCESS_TOKEN`) | none | `plans/vault/` | Small |
| A3 | `packages/shared/platform-core/` | `PlatformPlugin` interface (`matchCapabilities`, `resolvePlatformRefs`, `validateProvision`, `emit`), `ProvisionRequest`/`Allowance`, `ResolvedConfig`, `EmitTarget`. Interface only. | Grow Box, Heroku, and future AWS/GCP plugins all implement it. The plans correctly say "may seed here and upstream" — collapse that: seed it upstream from day one. | PLAN.md §4, PLAN-1 ownership table, PLAN-3 "Vendor namespace" | A1 (types overlap) | `plans/platform-core/` | Small |
| A4 | `packages/shared/config/` (extend) | Add `{{platform.<vendor>.*}}` parsing left unresolved at compose time; `infrastructure.<vendor>` pot convention; `provision` object coercion (`true`/`false`/absent → object); `project.owner` soft-required field. Schema v2. | `@open-tomato/config` is the schema authority. Forking the schema in Grow Box (the PLAN-3 risk) is what `AGENTS.md` explicitly forbids. | PLAN-3 "Provision object", "Ownership", "Vendor namespace" | A3 interface | `plans/config-schema-v2/` | Medium |
| A5 | `cli/src/core/` + `cli/bin/tomato.ts` (extend) | Adopt `@open-tomato/cli-core`: replace bare `default(args, ctx)` dispatcher with the `CliContext` runtime, `--output=json`/`TOMATO_OUTPUT` gating, NDJSON emission, `describe` serializer with `schemaVersion`. | The shipped `cli/` is the lightweight dispatcher PLAN-2 calls out; the structured-output enhancement is exactly the OPT-138 work that plan-06 of the prior refactor deferred to "the user's separate planned enhancement" — that's Phase 8. | PLAN-2 "Structured-output and metadata adoption", "tomatops wrapper and describe" | A1 | `plans/cli-structured-output/` | Medium |
| A6 | `cli/src/discovery/` | External command discovery: walk parents for `.open-tomato-root` + a `package.json` `ot.commands` manifest; load command modules from outside the CLI's own tree. | Grow Box commands live in grow-box repo. The shipped dispatcher can't find them today (PLAN-2 calls this out). Belongs in the runtime, not the consumer. | PLAN-2 "External command discovery" | A5 | `plans/cli-external-discovery/` | Medium |
| A7 | `packages/shared/platform-heroku/` | Reference second plugin implementing `PlatformPlugin` (instance-class allowance, `app.json` emit). | Proves the interface is generic before Grow Box ships against it; not grow-box-specific. | PLAN-3 "platform-heroku plugin" | A3, A4 | `plans/platform-heroku/` | Medium |
| A8 | `cli/` registry publish | Cut a version of `@open-tomato/cli-core`, `@open-tomato/vault`, `@open-tomato/platform-core`, `@open-tomato/tomato-cli` (with A5+A6), and the extended `@open-tomato/config` to `npm.heimdall.bifemecanico.com` via the Changesets pipeline. | Grow Box consumes via registry; nothing in Section B can start until the version exists. | A1–A6 | `plans/phase-8-registry-cut/` | Small |

> All A-items live under `packages/shared/` (cli-core is consumed by terminal tools, not HTTP services; platform-core is infra-vendor, not service-tier). None belong in `packages/service/`.

---

## Section B — Work that lands in `grow-box/`

| # | Where | What | Why grow-box | Source | Upstream dep (min version) | Initiative slug | Scope |
|---|---|---|---|---|---|---|---|
| B1 | `grow-box/tools/` workspace bootstrap | bun workspace at `tools/` (covers `packages/*`, `commands/*`), `.bun-version`, `.npmrc`/`bunfig.toml` pointing `@open-tomato/*` at Verdaccio, `tsconfig.base.json` extending `@open-tomato/typescript-config`, `bun run check`. | Consumer-side packaging. | PLAN-1 "Grow Box workspace bootstrap" | A8 | `phases/phase-8/tools-workspace` | Small |
| B2 | `grow-box/tools/packages/platform-growbox/` | `@open-tomato/platform-growbox` — `defineConfig` pot (build/expose/repo/monitoring), `matchCapabilities` port of `cap_match`, `trust` port, deterministic `emit` (compose, `.env.example`, deploy, SECRETS.md, bootstrap dirs, Prometheus targets, SHA-256 lock). Parity-critical. | Encodes `infrastructure.homelab` (the Grow Box pot) and reads `governance/capabilities.yaml`/`groups.yaml` fixtures that live in grow-box. | PLAN-1 "platform-growbox" | A3, A4 | `phases/phase-8/platform-growbox` | Large |
| B3 | `grow-box/tools/packages/exec/` | `@open-tomato/exec` — `runBashContract` bash adapter, line parser for the kept `make setup` `KIND: payload` engine. | Bash modules being wrapped are grow-box's. Promote upstream later if a second consumer needs it. | PLAN-1 "exec bash-adapter", PLAN.md §5 | A1 (CliOutput type) | `phases/phase-8/exec-adapter` | Small |
| B4 | `grow-box/tools/commands/svc/` | `validate`, `generate`, `reconcile`, `list` — Grow Box command modules under the `ot.commands` manifest, using `CliContext`/`CliOutput`, delegating to `@open-tomato/config` + `@open-tomato/platform-growbox`, declaring `ArgSpec`/`FlagSpec`, emitting NDJSON. | The orchestration of grow-box materialization belongs in grow-box. | PLAN-2 "Grow Box command MVP", "Structured-output adoption" | A5, A6, B2 | `phases/phase-8/svc-commands` | Medium |
| B5 | `grow-box/tools/commands/setup/` | `setup` command wrapping `scripts/setup.sh` via `@open-tomato/exec`; `--dry-run`, `--non-interactive`. | Same. | PLAN-2 "MVP", "Make-target delegation" | A5, B3 | `phases/phase-8/setup-command` | Small |
| B6 | `grow-box/tools/bin/tomatops.ts` + `.open-tomato-root` | `tomatops` wrapper that runs `tomato` with `TOMATO_OUTPUT=json` and verbosity suppressed; `.open-tomato-root` marker at repo root so discovery resolves grow-box. | Pipeline JSON entry point is grow-box's; the runtime stays upstream. | PLAN-2 "tomatops wrapper" | A6, B4, B5 | `phases/phase-8/tomatops` | Small |
| B7 | `grow-box/management/verdaccio/` | Verdaccio compose stack (`management/verdaccio` with Traefik `lan-only@file`), `${DATA_ROOT}` data volume. | Grow Box owns its homelab infra. | PLAN-1 "Cross-repo consumption", PREREQUISITES | none | `phases/phase-8/verdaccio` | Small |
| B8 | `grow-box/scripts/svc/*.sh` shims | Replace bodies of `validate.sh`/`generate.sh`/`reconcile.sh`/`list.sh` with `exec tomatops svc <sub> ...`. Retire `scripts/svc/lib/*.sh` modules whose parity is green. | Operator contract (Make targets) stays in grow-box. | PLAN-2 "Make-target delegation and bash retirement" | B4, B6, parity gate green | `phases/phase-8/svc-shims` | Small |
| B9 | `grow-box/tests/` parity gate | Compare TS `svc generate` output to `make svc-generate --check` for `samples/knowledge-base/`; bun section in `scripts/ci.sh` gated by `need bun`/`CI_STRICT=1`. | Fixtures and the bash oracle live in grow-box. | PLAN-1 "parity gate and CI" | B2 | `phases/phase-8/parity-gate` | Medium |
| B10 | `grow-box/tui/` | Rust + ratatui crate; engine adapter spawning `tomatops --describe` and streaming NDJSON; metadata-driven forms; authored-file writers; `make tui` release-artifact shim; `need cargo`-gated CI section. | The TUI is a grow-box surface (its menus are grow-box commands). Could move upstream later if a generic `tomato-tui` is wanted; defer. | PLAN-4 (all stages) | A5+A6 stable `describe`/NDJSON | `phases/phase-8/tui` | Large |

---

## Section C — Cross-cutting / coordination

| Concern | Canonical source | Consumer / shim |
|---|---|---|
| `CliContext`/`CliOutput`/`ArgSpec`/`FlagSpec` types | A1 `packages/shared/cli-core/` | grow-box B4/B5 import from `@open-tomato/cli-core`; TUI B10 mirrors the types in Rust with a `schemaVersion` refusal check |
| `describe` JSON tree (versioned) | A5 serializer in `cli/` | B10 TUI parses; B6 `tomatops --describe` exposes it through the JSON entry point |
| NDJSON event union (`start`/`step`/`log`/`result`) | A1 type + A5 emitter | B4/B5/B10; B3 normalizes bash output into the same events |
| `PlatformPlugin` interface + `infrastructure.<vendor>` pot | A3 + A4 | B2 (`platform-growbox`), A7 (`platform-heroku`) |
| `provision` object + `project.owner` schema v2 | A4 `@open-tomato/config` extension | B2 enforces and emits; existing Phase 7 fixture must still validate |
| `tomato` vs `tomatops` | `tomato` bin = A5 (`@open-tomato/tomato-cli`); `tomatops` bin = B6 (grow-box wrapper that sets `TOMATO_OUTPUT=json`) | Operator only ever types `make svc-*` → `scripts/svc/*.sh` shim → `tomatops`; TUI calls `tomatops` directly |
| Parity gate | B9 (fixtures + bash oracle in grow-box) | Required-green for any bash module retirement in B8 |
| `.open-tomato-root` marker + `ot.commands` manifest contract | A6 (discovery in `cli/`) | B6 places the marker + manifest in grow-box |

---

## Section D — Conflicts with current plan text

- **PLAN.md "Cross-repo model" table** — calls `packages/shared/config` and `tomato-cli/` separate umbrella repos. They are `open-tomato/packages/shared/config` and `open-tomato/cli/` as workspace members; the `bin` is still `tomato`, the published name is still `@open-tomato/tomato-cli`. Grow Box still consumes from the registry, so consumer behavior is unchanged — only the upstream layout description is stale.
- **PLAN.md "Sequencing and dependencies"** — references `open-tomato/plans/refactor/01-packages.md` and `06-tomato-cli.md` as the upstream gate. Per `plans/INDEX.md`, the legacy-refactor 00–08 is `done`; 09 is deferred. The real upstream gate is now the new initiative slugs in Section A (`cli-core`, `vault`, `platform-core`, `cli-structured-output`, `cli-external-discovery`, `phase-8-registry-cut`).
- **PLAN-1 "Description and technical context" table** — lists `legacy-monorepo/` and `tomato-cli/` as parallel umbrella subdirs. The first is fading into the structural-reorg's "out of scope deferred to plan 09"; the second is `open-tomato/cli/`. Rewrite the table to one column: upstream `open-tomato/` repo.
- **PLAN-1 "Stage: Upstream coordination"** — bullets file gaps against `open-tomato/plans/refactor/01-packages.md` and `06-tomato-cli.md`. Re-target to per-initiative task docs under `open-tomato/plans/<slug>/` using the YAML-frontmatter convention; cross-repo refs use `grow-box:docs/phases/phase-8/PLAN-N.md` per `plans/INDEX.md`.
- **PLAN-2 "What `tomato-cli` ships today"** — accurate description, but the path `open-tomato/tomato-cli/src/cli.ts` is now `open-tomato/cli/src/cli.ts`. The "Plan 06" reference is stale (done).
- **PREREQUISITES "Local linking of the two projects"** — every `cd /Users/marcos/projects/open-tomato/packages && bun install` and `cd /Users/marcos/projects/open-tomato/tomato-cli && bun install` step collapses to one `cd /Users/marcos/projects/open-tomato/open-tomato && bun install`. The per-package `bun link` registrations still work (each package keeps its own `package.json`) but the iteration story is simpler: one workspace install bootstraps everything.
- **PREREQUISITES "umbrella folder of independent git repos"** — false now. The umbrella is one repo; grow-box is the sole sibling. Update the language so an agent doesn't waste time looking for sibling `.git/` directories.
- **PLAN.md "Workspace layout (Grow Box-owned only)"** — text says `tools/` "depends on `@open-tomato/*` via Verdaccio" but later phrasing in PLAN-1/2 occasionally implies `@open-tomato/tomato-cli` is an upstream consumer of grow-box's local sources. It isn't — grow-box always consumes the registry version. The consumer model is unchanged by the reorg; the description just needs a once-over.
- **AGENTS.md naming clash check** — `packages/AGENTS.md` reserves `@open-tomato/config` for service-config (OPT-176) and `@open-tomato/agents-config` for the agent config. PLAN-1 uses the right name (`@open-tomato/config`) throughout — no rename needed, but the plans should add a one-liner pointer to `packages/AGENTS.md` so the next agent doesn't get tempted to add an "agents" sense to `@open-tomato/config`.
- **PLAN-3 "Vendor namespace and platform-heroku"** — currently scoped as "may be upstreamed". Re-scope to upstream-first: `platform-heroku` lives at `open-tomato/packages/shared/platform-heroku/`. There's no reason to seed it in grow-box; doing so creates the exact fork-drift PLAN-1 exists to avoid.

---

## Section E — Execution order

1. **open-tomato: `cli-core`** — Define `CliContext`/`CliOutput`/`ArgSpec`/`FlagSpec`/`CliEvent` types and `assembleContext`. (A1)
2. **open-tomato: `platform-core`** — `PlatformPlugin` interface + `Provision*` types. (A3)
3. **open-tomato: `vault`** — BWS strategies + id mapping. (A2)
4. **open-tomato: `config-schema-v2`** — Extend `@open-tomato/config` (vendor namespace, provision object, ownership); verify the Phase 7 fixture still validates. (A4)
5. **open-tomato: `cli-structured-output`** — Adopt `cli-core` in `cli/`; add `--output=json`, NDJSON, `describe`. (A5)
6. **open-tomato: `cli-external-discovery`** — `.open-tomato-root` walker + `ot.commands` manifest in `cli/`. (A6)
7. **open-tomato: `phase-8-registry-cut`** — Changeset + publish to `npm.heimdall.bifemecanico.com`; capture the version grow-box will pin. (A8)
8. **grow-box: `verdaccio`** — Optional mirror; not blocking if registry is reachable. (B7) — can run in parallel from step 1.
9. **grow-box: `tools-workspace`** — Bootstrap `tools/`, point `@open-tomato/*` at the registry version from step 7. (B1)
10. **grow-box: `platform-growbox`** — Schema extension + capability/trust/emit port. (B2)
11. **grow-box: `exec-adapter`** — Bash-line parser for `KIND: payload`. (B3)
12. **grow-box: `svc-commands`** — `svc validate/generate/reconcile/list` modules with metadata + NDJSON. (B4)
13. **grow-box: `setup-command`** — `setup` over `@open-tomato/exec`. (B5)
14. **grow-box: `tomatops`** — `tomatops` bin + `.open-tomato-root` + `ot.commands` manifest. (B6)
15. **grow-box: `parity-gate`** — Byte-parity test + bun CI section. (B9) — gates step 16.
16. **grow-box: `svc-shims`** — Delegate `scripts/svc/*.sh` to `tomatops`; retire bash modules where parity is green. (B8)
17. **open-tomato: `platform-heroku`** — Second plugin; proves the interface generalizes. (A7) — can run in parallel from step 4; not on grow-box's critical path.
18. **grow-box: `tui`** — Rust crate, engine adapter, screens, writers, `make tui` shim. (B10) — depends on stable `describe` + NDJSON from step 7.

---

## Section F — Pre-Phase-8 prerequisites

Outside the Phase 8 work itself, must land before step 1:

- **Toolchain**: bun pinned in `grow-box/tools/.bun-version`; bun on dev / homelab host / CI. Rust toolchain only required at `CI_STRICT=1` (TUI).
- **Phase 7 machinery present in grow-box**: `scripts/svc/*`, `governance/capabilities.yaml`, `governance/groups.yaml`, `samples/knowledge-base/service.config.yaml`, `tests/test_svc_*.sh`. The parity gate needs all of them runnable.
- **Bash substrate kept**: `scripts/setup.sh`, `scripts/lib/common.sh`, `scripts/lib/capabilities.sh` — anything `@open-tomato/exec` wraps must still work in bash.
- **Registry reachability**: `npm.heimdall.bifemecanico.com` reachable from dev / host / CI. The structural-reorg INITIATIVE notes this was VPN-flaky; confirm green from grow-box's network before step 7.
- **`BWS_ACCESS_TOKEN`** in the shell (dev permissive) and CI secret store (mandatory). The Bitwarden project/vault ids per env/region either mapped in `config.default.yaml` `vault:` or left to the naming-convention fallback.
- **Plan-registry initiative folders**: create the `open-tomato/plans/<slug>/` skeletons for all Section A initiatives up front (copy from `plans/_template/`), wire `context.read-first` to the relevant grow-box `docs/phases/phase-8/PLAN-N.md` files using `grow-box:` cross-repo refs, so the next agent finds context without naming-proximity guessing.
- **Plan-text refresh**: at minimum, update PLAN.md "Cross-repo model" + "Sequencing" and PLAN-1 "Description" tables to reflect the consolidated `open-tomato/` layout before any work begins, so subsequent agents don't act on stale paths.
