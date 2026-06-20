# Releasing

How to ship a change to an `@open-tomato/*` package.

> **Registry:** every `@open-tomato` / `@bifemecanico` package publishes to the
> **private** registry `https://npm.heimdall.bifemecanico.com/` — never public
> npm or GitHub Packages. This is pinned in [`.npmrc`](./.npmrc) (committed,
> token-free) so it holds in a clean CI checkout too.

## Local / private-registry release (current stage)

Right now releases are **driven manually from a developer machine**. The
commands below are turbo-orchestrated and map 1:1 onto the future pipeline
(see [Pipeline parity](#pipeline-parity)).

```bash
# 0. Auth: your global ~/.npmrc already has the heimdall _authToken
#    (verify with: npm whoami --registry https://npm.heimdall.bifemecanico.com/)

# 1. Make changes + add a changeset (see "Regular flow" below).
bunx changeset

# 2. Apply version bumps from pending changesets.
bunx changeset version

# 3. Standards check only (registry/semver/naming/changeset coverage/deprecation):
bun run preflight

# 4. Dry run — build, test, lint, preflight, stage, publint, npm pack --dry-run.
bun run publish:dry

# 5. Publish for real to the private registry (build+test+lint+preflight gated).
bun run publish:local
```

What the tooling guarantees before anything is published (`bun scripts/preflight.ts`):

- **Registry** — every scope resolves to the private registry; fails if any
  scope is unpinned or points at npmjs/GitHub.
- **Manifests** — valid semver + package name matches the directory convention.
- **Changeset coverage** — every *changed* publish-eligible package has a
  pending version bump.
- **Local refs** — eligible packages' `file:`/`workspace:` deps resolve to
  eligible siblings.
- **Deprecation** — no eligible package consumes a deprecated version of an
  internal `@open-tomato` dependency (queried against the private registry).

The publish driver ([`scripts/publish-packages.ts`](./scripts/publish-packages.ts))
selects the publish set by **registry diff** (anything whose local version
isn't on the registry yet), publishes in dependency order, rewrites
`file:`/`workspace:` refs to `^version` at stage time, and runs `publint` on
each staged tarball. It needs `--yes` to publish for real; without it, it dry
runs.

## Pipeline parity

The same scripts run unchanged in CI. The only environment differences:

- **Auth:** inject the registry token from a secret before publishing —
  ```bash
  echo "//npm.heimdall.bifemecanico.com/:_authToken=${NPM_TOKEN}" >> .npmrc
  ```
  (the committed `.npmrc` supplies only the scope→registry mapping).
- **Provenance:** OFF by default. Sigstore/OIDC provenance is npmjs-only and a
  private registry can't honor it, so leave `NPM_CONFIG_PROVENANCE` unset. The
  driver only adds `--provenance` when `NPM_CONFIG_PROVENANCE=true`.

A CI job is just: `bun install --frozen-lockfile` → `bun run prepublish:check`
→ `bun scripts/publish-packages.ts --yes`. The legacy
[`packages-publish.yml`](./.github/workflows/packages-publish.yml) +
[`scripts/publish-all.ts`](./scripts/publish-all.ts) changesets-action path
still exists for reference; migrate it to the driver above when wiring the
private-registry pipeline.

## One-time setup

Nothing per-developer. Changesets is pre-installed; the local commands above
build/test/lint via turbo before publishing.

## Regular flow

1. **Make your change** in a feature branch. Include tests.
2. **Create a changeset** before opening the PR:
   ```bash
   bunx changeset
   ```
   The prompt will ask:
   - Which packages changed (select with space, confirm with enter).
   - Bump level per package (patch/minor/major — see [VERSIONING.md](./VERSIONING.md)).
   - A short summary (one line; this becomes the CHANGELOG entry).

   A file appears at `.changeset/<random-words>.md`. Commit it with your
   change. Do **not** edit any `package.json` `version` field yourself.

3. **Open a PR** targeting `main`. CI runs:
   - `verify` — tests, linting, type checking (affected only via Turbo).
   - `preview` — rewrites each affected package's `file:` deps in a
     staging dir, runs `npm pack --dry-run`, runs `publint`, and uploads
     artifacts summarizing what would ship.

4. **Merge the PR.** Nothing publishes yet. A "Version Packages" PR appears
   (or updates) on `main`, opened by `github-actions[bot]`. It aggregates
   pending changesets across all merged PRs and shows the proposed bumps
   + auto-generated CHANGELOG diff.

5. **Review and merge the Version PR** when you're ready to release.
   Merging it:
   - Commits the new `version` fields + CHANGELOG.md entries to `main`.
   - Triggers the publish matrix: each bumped package is staged, `file:`
     refs are rewritten to `^<version>`, and published via
     `bun publish --access public --provenance`.
   - Creates a GitHub Release per published package.

## Skipping the changeset requirement

Some PRs don't need a changeset (CI config, docs that don't ship in the
tarball, internal refactors with no public-API effect). Add the
`no-changeset` label to the PR and the `verify` job skips the check.

## Manual retry

If a publish transiently fails (npm outage, rate limit), trigger the
workflow manually via **Actions → packages-publish → Run workflow** on
`main`. It re-computes the publish set and retries only the unpublished
packages.

## Creating a new publishable package (graduation)

The mechanical un-gating is automated by `scripts/graduate.ts`:

```bash
# one package (by path or name)
bun scripts/graduate.ts shared/logger --set-version 0.1.0
# or every still-gated package at once
bun scripts/graduate.ts --all --set-version 0.1.0 --dry-run   # preview
bun scripts/graduate.ts --all --set-version 0.1.0             # apply
```

It (1) deletes `REFACTOR_NEEDED.md`, (2) sets `"private": false`, (3) sets the
version baseline, (4) ensures `"publishConfig": { "access": "public" }`, and
(5) removes the package from the `ignore` list in `.changeset/config.json`.

Then, **per package, by hand** (content the tool can't infer):

- Add/verify `description`, `license`, `repository`, `homepage`, `bugs`.
- Add `"files": [...]` to restrict tarball contents (otherwise tests/configs
  ship too).
- Write/expand `README.md`: purpose, install, minimal usage example.
- Confirm the entry point exists — `exports["."]` / `main` must point at a real
  file (`publint` enforces this; the publish driver skips packages that fail).

**Initial release vs. ongoing.** For a first publish, set the `0.1.0` baseline
directly (as above) — `changeset version` does *relative* bumps with internal-
dependency cascades and can't land everyone on a uniform `0.1.0`. After the
first release, every change goes through the normal changeset flow at the top
of this doc, and `bun run publish:local`'s preflight enforces the
changed-must-bump rule. (Run the initial graduation publish with the driver
directly — `bun scripts/publish-packages.ts --yes` — since there are no
changesets yet; preflight's `--skip-changeset` covers the same case.)

## Troubleshooting

- **"publish failed: package is private"** — you forgot to remove the
  package from `.changeset/config.json#ignore` or forgot
  `"private": false`.
- **"dependency X is not publish-eligible"** — you're trying to publish a
  package whose internal dep is still `private: true`. Graduate the dep
  first.
- **"file: refs remain after rewrite"** — the shim couldn't resolve a
  `file:../x` path. Check that the target package exists and isn't
  misnamed.
- **"OIDC token missing"** — the workflow step needs
  `permissions: { id-token: write }`. Don't remove that.
