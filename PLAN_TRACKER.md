# Plan: Phase 8 registry cut

## Description

Coordinate the publish of all Phase 8 upstream packages to `npm.heimdall.bifemecanico.com` in a single release event so the grow-box repo can pin one consistent set of versions. Five publishable packages are involved: the four new ones (`@open-tomato/cli-core`, `@open-tomato/platform-core`, `@open-tomato/vault`, `@open-tomato/platform-heroku`) plus the extended `@open-tomato/config`. The private `@open-tomato/tomato-cli` is bumped in lockstep but does NOT publish (it ships internally; consumers run it via `bunx` against the workspace, not the registry).

This initiative does not write new source code. It composes the changesets, runs the publish pipeline, verifies every version landed on the registry, and captures the resulting versions in a release notes file so the grow-box `tools-workspace` initiative can pin `^X.Y.Z` deterministically. The pipeline is `bun run publish:dry` followed by `bun run publish:local`; both must run from the open-tomato repo root with registry credentials configured per `packages/RELEASING.md`.

This is the last upstream step before grow-box can begin its B-series work. After this initiative, `grow-box:phases/phase-8/tools-workspace` is unblocked.

Files created: `plans/phase-8-registry-cut/RELEASE_NOTES.md` (captures the version of each package after publish).

# Stage: Pre-publish verification

- [x] Verify `bun install` at the repo root completes without errors and the workspace lockfile is up to date
- [x] Verify the registry `npm.heimdall.bifemecanico.com` is reachable: run `curl -fsS https://npm.heimdall.bifemecanico.com/-/ping` and confirm a 2xx response
- [x] Verify registry write credentials are present: run `npm whoami --registry https://npm.heimdall.bifemecanico.com/` and confirm a non-error response
- [x] Verify `bun run preflight --skip-changeset` from the repo root exits 0
- [x] Verify all four new packages and `@open-tomato/config` have their respective initiatives' code merged into the working tree (check `git log --oneline` for the cli-core, platform-core, vault, platform-heroku, config-schema-v2 implementations) — cli-core, platform-core, vault, and config (schema v2) merged; platform-heroku deferred to follow-up cut (plan exists at plans/platform-heroku/ but package directory and commits absent)

# Stage: Compose changesets

- [x] Run `bunx changeset` and add a single changeset selecting `@open-tomato/cli-core` with `minor` bump (initial 0.1.0 release of the new package)
- [x] Run `bunx changeset` and add a single changeset selecting `@open-tomato/platform-core` with `minor` bump (initial 0.1.0 release) — already pending at `.changeset/platform-core-da7c4939.md`
- [x] Run `bunx changeset` and add a single changeset selecting `@open-tomato/vault` with `minor` bump (initial 0.1.0 release) — already pending at `.changeset/vault-71e01705.md`
- [x] Run `bunx changeset` and add a single changeset selecting `@open-tomato/platform-heroku` with `minor` bump (initial 0.1.0 release; if platform-heroku has not yet landed, skip this task and include it in a follow-up cut)
- [x] Run `bunx changeset` and add a changeset selecting `@open-tomato/config` with `minor` bump (schema v2 additive features, no breaking change) — already pending at `.changeset/config-f0e6455d.md` (covers platform refs pass-through, infrastructure pot, provision coercion, soft-required project.owner)
- [x] Add a body to each changeset describing the Phase 8 grouping ("Part of Phase 8 registry cut — see plans/phase-8/") — appended grouping line to cli-core-5ad1bb85.md, platform-core-da7c4939.md, vault-71e01705.md, config-f0e6455d.md
- [x] Run `bunx changeset version` to apply pending changesets, updating package.json versions and CHANGELOG.md files
- [x] Commit the version bumps with a single commit titled `chore: phase-8 registry cut version bumps` — already in place at 0de5094 (cli-core/config/platform-core/vault 0.1.0→0.2.0, tomato-cli 0.1.0→0.1.1 internal)

# Stage: Publish

- [x] Run `bun run publish:dry` from the repo root and verify the tarball staging plus `publint` validation pass for every package
- [x] Run `bun run publish:local` from the repo root to publish to `npm.heimdall.bifemecanico.com` — turbo pipeline aborted on pre-existing `@open-tomato/ui-skeleton` TS debt, so used the documented escape hatch (`bun packages/scripts/publish-packages.ts --yes`) per `skills/releasing-packages/SKILL.md`; published cli-core@0.2.0, config@0.2.0, platform-core@0.2.0, vault@0.2.0
- [x] Capture the exact published version of each package from the publish output — `@open-tomato/cli-core@0.2.0`, `@open-tomato/config@0.2.0`, `@open-tomato/platform-core@0.2.0`, `@open-tomato/vault@0.2.0` (published 2026-06-26 via `bun packages/scripts/publish-packages.ts --yes`; commit `00579dd`); `@open-tomato/platform-heroku` deferred (package not yet landed)

# Stage: Post-publish verification

- [x] Run `npm view @open-tomato/cli-core versions --registry https://npm.heimdall.bifemecanico.com/` and confirm the new version is listed
- [x] Run `npm view @open-tomato/platform-core versions --registry https://npm.heimdall.bifemecanico.com/` and confirm the new version is listed (versions: 0.1.0, 0.2.0)
- [x] Run `npm view @open-tomato/vault versions --registry https://npm.heimdall.bifemecanico.com/` and confirm the new version is listed (versions: 0.1.0, 0.2.0)
- [x] Run `npm view @open-tomato/platform-heroku versions --registry https://npm.heimdall.bifemecanico.com/` and confirm the new version is listed (skipped — platform-heroku was deferred to a follow-up cut; registry returns 404 as expected)
- [x] Run `npm view @open-tomato/config versions --registry https://npm.heimdall.bifemecanico.com/` and confirm the new version is listed
- [x] Run `npm pack @open-tomato/cli-core --dry-run --registry https://npm.heimdall.bifemecanico.com/` from a scratch directory and confirm the tarball downloads (verified 0.2.0 tarball, 12.3 kB, 19 files, exit 0)
- [x] Write `plans/phase-8-registry-cut/RELEASE_NOTES.md` listing each package and its published version, the registry URL, and the date
- [x] Commit the release notes with a commit titled `docs(phase-8): capture registry-cut versions` (commit 9a86d05)
