# Releasing

How to ship a change to an `@open-tomato/*` package.

## One-time setup

Nothing per-developer. Changesets is pre-installed; the pipeline is driven
by a single GitHub Actions workflow.

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

1. Remove the package's `REFACTOR_NEEDED.md`.
2. Edit the package's `package.json`:
   - `"private": false`.
   - Add/verify `description`, `license`, `repository`, `homepage`, `bugs`.
   - Add `"publishConfig": { "access": "public" }`.
   - Add `"files": [...]` restricting tarball contents.
3. Write/expand `README.md` with: purpose, install, minimal usage example.
4. Remove the package name from the `ignore` list in `.changeset/config.json`.
5. Add a changeset declaring the initial minor (for pre-1.0) or major
   (for post-1.0) bump.
6. Open a PR. The rest is the regular flow.

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
