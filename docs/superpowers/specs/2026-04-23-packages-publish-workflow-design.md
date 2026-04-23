# Packages Publish Workflow — Design

**Status:** Approved, ready for implementation planning
**Date:** 2026-04-23
**Scope:** Workflow, procedure, and guideline work. No refactor of package internals is forced by this plan; individual package graduation is opt-in per PR.

## Summary

Set up a GitHub Actions pipeline that safely publishes `@open-tomato/*` packages from this monorepo to npm. Use **Changesets** to manage semver (per-package intent declared in feature PRs, aggregated in a standing "Version Packages" PR, versions bumped at merge). Keep the `file:` dependency refs that enable cross-repo linking intact in the worktree; rewrite them to concrete semver only inside the published tarball via a small CI-only shim. Ship TS source directly — Bun is the runtime, no build step in the publish path.

Land the workflow plus a three-wave pilot: `@open-tomato/typescript-config`, then `@open-tomato/eslint-config`, then one `notifications/plugin-*`. The other 19 packages stay `"private": true` and carry a `REFACTOR_NEEDED.md` describing what they need before they can graduate.

## Context and constraints

- Monorepo: `packages/` root with Bun 1.3.9 + Turbo 2.5. 22 packages in three category folders: `shared/`, `service/`, `notifications/`.
- Today only the three `notifications/plugin-*` packages are `"private": false`, but none of them emit built output — they declare `build: tsc --noEmit`. As-is, publishing them would ship raw TS.
- Cross-package deps use `"file:../..."` references. Commit `22299bb` ("convert intra-package workspace:\* to file: refs") made this deliberate: it enables cross-repo consumption from `open-tomato/services/*`, which couldn't resolve `workspace:*` paths. This plan preserves that choice.
- Consumers of these packages currently live in the sibling `open-tomato` umbrella repo and link via `file:` paths. No npm-published consumers yet.
- Team preference: this is procedure work, not refactor. Package authors opt in to publishing one at a time when their package is ready.
- Package manager is Bun. TS is the runtime format (executed natively by Bun in consumer projects). Only `shared/cache` and `shared/logger` have real build pipelines, and those exist for browser/server runtime splits — not for publishing — so they stay as-is.
- npm scope: `@open-tomato`. The `@opentomato` scope is squatted for typo protection only (not a publish target).

## Architecture

### Core stack

- **Changesets** (`@changesets/cli` + `changesets/action@v1`) for version management.
- **Matrix-driven publish workflow** — one GitHub Actions file, one job expanded per affected package.
- **`scripts/prepare-publish.ts`** — CI-only shim that stages each package into a temp dir and rewrites `file:` refs to `^<version>` before `bun publish`.
- **npm OIDC trusted publishing** + `--provenance` — no long-lived `NPM_TOKEN` in GitHub secrets.
- **Turbo** — continues to drive `build`/`test`/`lint`/`check-types` on PRs (with `--affected` filter). Stays out of the publish path.

### End-to-end flow

1. **Feature PR.** Author runs `bunx changeset`, picks affected packages + bump level (patch/minor/major) + writes a one-line summary. The generated `.changeset/<id>.md` is committed with the change. PR CI runs `turbo run build test lint check-types --affected`. Version fields are not touched.
2. **Merge feature PR → `main`.** Nothing publishes. The Changesets action opens or updates a standing "Version Packages" PR that aggregates pending changesets; it previews bumps + auto-generated changelog diff.
3. **Review Version PR.** Reviewer sanity-checks the proposed bumps and changelog entries. CODEOWNERS gates who can approve.
4. **Merge Version PR → `main`.** This is the publish trigger. The same merge commits the bumped `version` fields and CHANGELOG.md updates back to `main` — git is the source of truth.
5. **Publish job.** Computes the publish set via `changeset status --output=json`. For each package, stages + rewrites + verifies + `npm pack --dry-run` preview + `bun publish --access public --provenance` from the staging dir. Topological order handled by Changesets.
6. **Post-publish.** A GitHub Release is created per published package; `@open-tomato/<name>@<version>` tag, body = that package's new CHANGELOG entry.

### Why this shape

- **No version edits in the worktree** — eliminates parallel-PR version races.
- **Zero publishes without an explicit Version PR merge** — a human must approve the release batch.
- **`file:` stays the worktree primitive** — cross-repo linking keeps working unchanged.
- **Adding a new publishable package is a package.json flip + a changeset** — no YAML churn.
- **Dependents auto-bump** — Changesets fans out internal dependency bumps automatically.

## Versioning policy (`VERSIONING.md` at repo root)

One file at the repo root, referenced from the README and every package's generated CHANGELOG header. These are the rules `bunx changeset` asks authors to apply.

### patch — `0.0.X`
- Bug fixes that don't alter public API.
- Internal refactors (file moves, renamed internals, extracted helpers).
- Dependency bumps within the same declared semver range that don't change observable behavior.
- Doc-only changes that ship in the tarball (README, JSDoc).
- Test-only changes.

### minor — `0.X.0`
- Additive public API: new exported symbol, new optional function argument, new optional config field.
- New opt-in behavior gated behind a new flag.
- Deprecation marks on existing API (warnings, `@deprecated` JSDoc). Removal is a separate major.
- Widening peer-dep support (e.g., `zod: ^3` → `^3 || ^4`).

### major — `X.0.0`
- Removed or renamed export.
- Changed function signature (argument count, type, or return type).
- Changed runtime semantics of an existing export.
- Raised peer-dep floor (e.g., `zod: ^3.25` → `^3.30`) or dropped a supported range.
- Raised required Bun or Node version.
- Moved an export to a different subpath.

### Pre-1.0 handling

Every package starts in `0.x.y`. To keep the rules meaningful during pre-1.0: treat `0.minor.patch` the same way as `major.minor.patch` — `0.2.0 → 0.3.0` is a breaking change. A package stabilizes by landing an explicit **major** changeset that bumps it to `1.0.0`.

### Cross-cutting rules

- If unsure whether a change is minor or major, default to **major** and note why in the changeset summary.
- Transitive bumps are handled automatically by Changesets — authors don't need separate changesets for dependent packages.
- A single changeset file can declare different bump levels for multiple packages.

## Graduation criteria (per package)

A package becomes publish-eligible when **all** criteria below are met. Until then, it stays `"private": true` and carries a `REFACTOR_NEEDED.md`.

1. **`package.json` hygiene.**
   - `"private": false`.
   - `"publishConfig": { "access": "public" }`.
   - `"license": "MIT"` (repo default; owners may override).
   - `"description"` set (one sentence).
   - `"repository"`, `"homepage"`, `"bugs"` pointing at the monorepo.
   - `"files"` whitelist restricting tarball content to `src/**`, `README.md`, `LICENSE` (plus `dist/**` for `shared/cache` and `shared/logger` which legitimately build for runtime splits).
   - `"exports"` / `"main"` / `"types"` point at stable entry points (no deep internal paths).
2. **`README.md`** — one-line purpose, install command, minimal usage example, link to CHANGELOG. A minimal auto-scaffolded README is acceptable for graduation; richer docs can land later.
3. **Dependency closure is publishable.** Every `@open-tomato/*` entry in `dependencies` / `peerDependencies` / `devDependencies` (config packages count) points at a package that is itself publish-eligible. The rewrite shim enforces this: publish fails if it encounters a `file:` ref to a package whose `private: true` is still set.
4. **No `REFACTOR_NEEDED.md`** in the package directory.
5. **Tests exist.** Minimum: a `test` script that passes. Config-only packages (`typescript-config`, `eslint-config`) can satisfy this via the repo's own `lint` / `check-types` run. Code packages need at least a smoke test exercising the public entry.
6. **Changeset present** in the graduation PR declaring the initial bump.

## `REFACTOR_NEEDED.md` (per package, when blocked)

When a package cannot version cleanly today, drop this file at `<package>/REFACTOR_NEEDED.md`. The workflow reads its presence as a hard gate: if it exists, publish is blocked regardless of other state.

### Template

```markdown
# REFACTOR_NEEDED — @open-tomato/<package-name>

> This package is not currently publishable to npm. This document describes
> why, and what needs to change before it can graduate. The refactor is
> tracked separately — do not attempt to lift this gate in a publish PR.

## Blocking reasons

- [ ] <one bullet per reason the package can't version cleanly>

Examples:
- Public API re-exports internal modules (stability risk).
- Mutable singleton exported — consumers get shared state.
- Entry point requires a specific runtime setup that isn't declared.
- Types leak internal implementation details that would force majors for
  internal refactors.
- Depends on internal package(s) not yet publish-eligible: <list>.

## Desired shape (sketch)

<optional short code sketch of the target public interface once refactored>

```ts
// example: the shape we'd want to land on
export function createThing(opts: CreateThingOptions): Thing;
export type Thing = { … };
```

## Removal criteria

This file is removed — and the package made `private: false` — in the same
PR that lands the refactor, along with a changeset declaring the graduation
bump (minor for pre-1.0, major for post-1.0).
```

## Workflow structure

One file: `.github/workflows/packages-publish.yml` (replaces the current stub).

### Triggers

- `push` to `main` — drives the Changesets action (open/update Version PR) and, when the push is a Version PR merge, the publish matrix.
- `pull_request` targeting `main` — drives the preview job.
- `workflow_dispatch` — manual escape hatch for re-running a publish after transient npm failures. No version changes; replays publish for current `main`.

### Jobs

1. **`verify`** (PR + push to main).
   - `bun install --frozen-lockfile`.
   - `turbo run lint check-types test --affected`.
   - `bunx changeset status --since=origin/main` — fails if the PR touches package source without a changeset. Escape valve: a `no-changeset` label bypasses this for docs / refactor / CI-only PRs.
2. **`preview`** (PR only).
   - For each affected package: run the rewrite shim in dry-run mode, `npm pack --dry-run` from the staged dir, `publint` on the staged manifest.
   - Posts a single PR comment summarizing: packages affected, proposed bumps, tarball size, tarball contents, publint findings.
3. **`version-or-publish`** (push to `main` only). The Changesets action:
   - If pending changesets exist in `main`: open/update the "Version Packages" PR. No publish.
   - If the push is the Version PR merge (no pending changesets remain, versions just changed): expand into the publish matrix.
4. **`publish`** (matrix job inside `version-or-publish`).
   - Matrix entries from `changeset status` output. Topological order via generated `needs:` chains (a prep step computes the dep graph).
   - Each shard:
     - `bun install --frozen-lockfile`.
     - `bun scripts/prepare-publish.ts <pkg-path>` — stages, rewrites `file:` → `^<version>`, verifies no `file:` / `workspace:` / relative-path deps remain, verifies no `REFACTOR_NEEDED.md`, runs `publint` on the staged manifest.
     - `npm pack --dry-run` for provenance logging.
     - `bun publish --access public --provenance` from the staging dir.
   - OIDC token via `permissions: { id-token: write }`. No `NPM_TOKEN` secret.
5. **`summary`** (always, after `publish`).
   - Creates a GitHub Release per published package (tag `@open-tomato/<name>@<version>`, body = new CHANGELOG entry).
   - Records the publish set in the workflow summary.

### Concurrency / permissions

- `concurrency: { group: packages-publish-${{ github.ref }}, cancel-in-progress: false }` — queue, don't cancel a publish in flight.
- Workflow-level `permissions: read-all`. Per-job writes only where needed:
  - `contents: write` for the Changesets PR commits and release tags.
  - `id-token: write` for OIDC publish.
  - `pull-requests: write` for preview comments.

### Files added by this plan

- `.github/workflows/packages-publish.yml` (replaces stub).
- `.changeset/config.json`.
- `scripts/prepare-publish.ts` (the rewrite shim, ~50 LOC).
- `VERSIONING.md` at repo root.
- `RELEASING.md` at repo root — "how to create a changeset", "how the Version PR flow works", "how to trigger a manual republish". (Separate from any future CONTRIBUTING.md; scope-limited to release mechanics.)
- `.github/CODEOWNERS` — gates `.changeset/`, `.github/workflows/packages-publish.yml`, and `scripts/prepare-publish.ts` behind a maintainer group.
- Per-non-pilot package: `REFACTOR_NEEDED.md` scaffolded with prefilled blocking reasons.

## Safeguards

### Must-have (blocking, wired in this plan)

**Authentication / provenance**
- npm OIDC trusted publishing, scope- or package-registered against `open-tomato/packages` + `.github/workflows/packages-publish.yml`.
- `--provenance` flag on `bun publish`. Publishes a signed attestation linking tarball ↔ workflow run ↔ commit SHA.

**Content / correctness**
- Rewrite-shim round-trip check: after rewriting `file:` → semver, hard-fail if any `file:`, `workspace:`, or relative-path dep remains in the staged manifest.
- `publint` on the staged manifest; blocks on errors, warnings logged.
- `REFACTOR_NEEDED.md` presence in a package in the publish set is a hard fail.
- Dependency closure: shim fails if a dep points at a `@open-tomato/*` package still `private: true`.
- No-op publish guard: explicit assertion before matrix expansion. Belt-and-suspenders with Changesets' own behavior.
- Changeset required on source-touching PRs (`no-changeset` label as escape valve).

**Process / authorization**
- Branch protection on `main`: linear history, required status checks (`verify`, `preview`), required approving review, no force pushes, no direct pushes (except the Changesets action's `github-actions[bot]` via `GITHUB_TOKEN`, which still flows through a merged PR for the Version PR).
- CODEOWNERS gates `.changeset/*`, `.github/workflows/packages-publish.yml`, and `scripts/prepare-publish.ts` behind a maintainer group. The Version Packages PR inherits these.
- Concurrency guard (publishes queue, they don't race).

### Nice-to-have (Phase 2, documented, not wired)

- Tarball size budget (per-package max, warn-only initially).
- Canary / snapshot releases (`changeset version --snapshot=canary`) for in-situ validation from feature branches.
- Sigstore signing beyond npm provenance (revisit if compliance asks).
- Cross-repo `repository_dispatch` to umbrella consumers. Pattern and payload shape documented here so each consumer repo can replay; see "Cross-repo signalling pattern" below.
- `attw` (are-the-types-wrong) — designed for packages emitting `.d.ts`; skip until a package emits a `dist/`.

### Not doing

- No build step in the publish path (TS source is the artifact; Bun is the runtime in consumer projects).
- No pre-commit hooks added to contributor local setup.
- No Turbo `publish` task — Changesets drives publish.

## Cross-repo signalling pattern (deferred, documented)

When cross-repo consumers are ready to adopt this, each should:

1. Listen for a `repository_dispatch` event:
   ```yaml
   on:
     repository_dispatch:
       types: [open-tomato-pkg-published]
   ```
2. Payload: `{ "package": "@open-tomato/<name>", "version": "<semver>", "commit": "<sha>" }`.
3. Consumer workflow runs integration / e2e against the new version (either by temporarily pinning in a throwaway branch, or by running against the already-installed version if Renovate has already landed the bump).

The publish workflow in this repo does **not** fire these dispatches until the pattern proves itself in at least one consumer. When we wire it, it's a single step at the end of the `publish` matrix, reading a `configs/consumers.yml` list. Tracked in Phase 2.

## Pilot plan (three waves, three PRs)

### Wave 0 — setup PR

Lands the workflow, Changesets config, `scripts/prepare-publish.ts`, `VERSIONING.md`, `RELEASING.md`, `.github/CODEOWNERS`, the 19 `REFACTOR_NEEDED.md` stubs for non-pilot packages, **and the Wave 1 graduation** (`typescript-config`).

This invariant holds from PR 1: every `private: true` package has a `REFACTOR_NEEDED.md`; every package without `REFACTOR_NEEDED.md` is `private: false` and publish-eligible.

### Wave 1 — `@open-tomato/typescript-config` (in Wave 0 PR)

**Why first:** ships `.json` only, zero `@open-tomato/*` deps, already declares `"publishConfig": { "access": "public" }`.

**Edits:**
- `"private": true` → `false`.
- Add `description`, `license: "MIT"`, `repository`, `homepage`, `bugs`, `author`.
- `"files": ["base.json", "react.json", "nextjs.json", "README.md", "LICENSE"]`.
- Write minimal `README.md` (purpose + install + "extend in your tsconfig").
- Add a changeset: **minor**, landing as `0.1.0`.

**Risks:** None identified. Intra-repo consumers keep resolving via `file:../typescript-config` unchanged. Cross-repo consumers switch from `file:` to `^0.1.0` on their own timeline.

### Wave 2 — `@open-tomato/eslint-config` (separate PR, after Wave 1's first publish is green)

**Why second:** ships `.mjs` directly (no build), devDep on `@open-tomato/typescript-config` via `file:../typescript-config`. Wave ordering ensures that dep is publish-eligible by the time Wave 2 ships.

**Edits:**
- Same `package.json` hygiene pass.
- `"files"`: the `.mjs` config files, `README.md`, `LICENSE`. Verify no dev-only scripts leak.
- README covering all three subpath exports (`/`, `/next`, `/react`).
- Changeset: **minor**, landing as `0.1.0`.

**Risks:**
- First real publint run on a package with a large transitive `eslint-plugin-*` footprint — expect warnings; tune `files` / `exports` accordingly.
- Wave 1 must be published to npm before Wave 2 merges its Version PR, since the shim will rewrite `file:../typescript-config` → `^0.1.0` and that version must exist on the registry.

### Wave 3 — one `@open-tomato/notifications-plugin-*` (separate PR, after Wave 2 is green)

**Why third:** already `"private": false`, has a runtime dep (`zod`), exercises the workflow against a non-trivial package.

**Candidate:** default **`@open-tomato/notifications-plugin-anthropic`** (already at `0.1.0`, more code to be a real smoke test). Fallbacks: `plugin-executor`, `plugin-tech-tree`.

**Edits:**
- Same `package.json` hygiene pass.
- Verify / add unit test (smoke test importing main entry + exercising public surface).
- Add `"test"` script if missing.
- Confirm no `REFACTOR_NEEDED.md` in the candidate.
- Changeset: author picks **patch** (→ `0.1.1`) if the state shipped matches current `main` with no API clarification, or **minor** (→ `0.2.0`) if adding coverage materially clarifies the public surface.

**Branch point:** if the chosen plugin's public API turns out to be ambiguous (re-exports, mutable singletons), land a `REFACTOR_NEEDED.md` on it instead and swap to the next candidate for Wave 3.

### Non-pilot packages (the other 19)

Scaffolded with `REFACTOR_NEEDED.md` in Wave 0, with "Blocking reasons" prefilled based on a quick per-package scan (e.g., "exports `./src/index.ts` — needs a stable public entry", "depends on internal package X which is not publish-eligible yet", "no documented public API"). Owners refine on their own cadence. Removing the file + flipping `private: false` + adding a changeset graduates the package.

## Open questions / known unknowns

- **`bun publish` + OIDC trusted publishing** — verify behavior end-to-end. If Bun's publish client doesn't emit the OIDC token header npm expects, fall back to `npm publish` from the staging dir (the content is identical; only the CLI differs). Plan assumes Bun works; implementation will verify and downgrade if not.
- **Changesets + `file:` deps** — Changesets' native rewrite targets `workspace:` protocol, not `file:`. The `scripts/prepare-publish.ts` shim covers the gap. Worth confirming Changesets doesn't choke on `file:` refs during `changeset version` (it shouldn't; it only mutates version fields).
- **Wave 3 candidate viability** — a deeper read of `plugin-anthropic`'s public API may surface refactor blockers not visible from package.json alone. Noted as a Wave 3 branch point.

## Success criteria

1. A contributor can ship a change to a public package (e.g., a `typescript-config` tweak) by committing a changeset alongside their feature PR, with zero manual version edits anywhere.
2. The Version Packages PR is the only place versions mutate, and it requires maintainer approval to merge.
3. A publish to npm happens automatically on Version PR merge, with provenance, and only for packages that actually changed.
4. A package with `REFACTOR_NEEDED.md` cannot be published even if someone flips `private: false` by mistake.
5. Intra-repo `file:` linking continues to work unchanged for dev and for cross-repo consumption from `open-tomato/services/*`.
6. The three pilot packages (`typescript-config`, `eslint-config`, one notifications plugin) are live on npm under `@open-tomato` with signed provenance, each behind its own independent PR.
