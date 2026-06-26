# Plan: Phase 8 registry cut

## Description

Coordinate the publish of all Phase 8 upstream packages to `npm.heimdall.bifemecanico.com` in a single release event so the grow-box repo can pin one consistent set of versions. Five publishable packages are involved: the four new ones (`@open-tomato/cli-core`, `@open-tomato/platform-core`, `@open-tomato/vault`, `@open-tomato/platform-heroku`) plus the extended `@open-tomato/config`. The private `@open-tomato/tomato-cli` is bumped in lockstep but does NOT publish (it ships internally; consumers run it via `bunx` against the workspace, not the registry).

This initiative does not write new source code. It composes the changesets, runs the publish pipeline, verifies every version landed on the registry, and captures the resulting versions in a release notes file so the grow-box `tools-workspace` initiative can pin `^X.Y.Z` deterministically. The pipeline is `bun run publish:dry` followed by `bun run publish:local`; both must run from the open-tomato repo root with registry credentials configured per `packages/RELEASING.md`.

This is the last upstream step before grow-box can begin its B-series work. After this initiative, `grow-box:phases/phase-8/tools-workspace` is unblocked.

Files created: `plans/phase-8-registry-cut/RELEASE_NOTES.md` (captures the version of each package after publish).

# Stage: Pre-publish verification

- [ ] Verify `bun install` at the repo root completes without errors and the workspace lockfile is up to date
- [x] Verify the registry `npm.heimdall.bifemecanico.com` is reachable: run `curl -fsS https://npm.heimdall.bifemecanico.com/-/ping` and confirm a 2xx response
- [ ] Verify registry write credentials are present: run `npm whoami --registry https://npm.heimdall.bifemecanico.com/` and confirm a non-error response
- [x] Verify `bun run preflight --skip-changeset` from the repo root exits 0
- [ ] Verify all four new packages and `@open-tomato/config` have their respective initiatives' code merged into the working tree (check `git log --oneline` for the cli-core, platform-core, vault, platform-heroku, config-schema-v2 implementations)

# Stage: Compose changesets

- [x] Run `bunx changeset` and add a single changeset selecting `@open-tomato/cli-core` with `minor` bump (initial 0.1.0 release of the new package)
- [ ] Run `bunx changeset` and add a single changeset selecting `@open-tomato/platform-core` with `minor` bump (initial 0.1.0 release)
- [ ] Run `bunx changeset` and add a single changeset selecting `@open-tomato/vault` with `minor` bump (initial 0.1.0 release)
- [x] Run `bunx changeset` and add a single changeset selecting `@open-tomato/platform-heroku` with `minor` bump (initial 0.1.0 release; if platform-heroku has not yet landed, skip this task and include it in a follow-up cut)
- [ ] Run `bunx changeset` and add a changeset selecting `@open-tomato/config` with `minor` bump (schema v2 additive features, no breaking change)
- [x] Add a body to each changeset describing the Phase 8 grouping ("Part of Phase 8 registry cut — see plans/phase-8/")
- [ ] Run `bunx changeset version` to apply pending changesets, updating package.json versions and CHANGELOG.md files
- [x] Commit the version bumps with a single commit titled `chore: phase-8 registry cut version bumps`

# Stage: Publish

- [ ] Run `bun run publish:dry` from the repo root and verify the tarball staging plus `publint` validation pass for every package
- [ ] Run `bun run publish:local` from the repo root to publish to `npm.heimdall.bifemecanico.com`
- [ ] Capture the exact published version of each package from the publish output

# Stage: Post-publish verification

- [ ] Run `npm view @open-tomato/cli-core versions --registry https://npm.heimdall.bifemecanico.com/` and confirm the new version is listed
- [ ] Run `npm view @open-tomato/platform-core versions --registry https://npm.heimdall.bifemecanico.com/` and confirm the new version is listed
- [ ] Run `npm view @open-tomato/vault versions --registry https://npm.heimdall.bifemecanico.com/` and confirm the new version is listed
- [ ] Run `npm view @open-tomato/platform-heroku versions --registry https://npm.heimdall.bifemecanico.com/` and confirm the new version is listed (skip if platform-heroku was deferred)
- [ ] Run `npm view @open-tomato/config versions --registry https://npm.heimdall.bifemecanico.com/` and confirm the new version is listed
- [ ] Run `npm pack @open-tomato/cli-core --dry-run --registry https://npm.heimdall.bifemecanico.com/` from a scratch directory and confirm the tarball downloads
- [ ] Write `plans/phase-8-registry-cut/RELEASE_NOTES.md` listing each package and its published version, the registry URL, and the date
- [ ] Commit the release notes with a commit titled `docs(phase-8): capture registry-cut versions`
