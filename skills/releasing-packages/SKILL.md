---
name: releasing-packages
description: Use at the end of a development session/round in the open-tomato packages/ monorepo when @open-tomato/* packages have changed and are about to be published to the private registry. Triggers include "ready to ship/release", "cut a release", "bump versions", "prepare changesets", or before running any publish command.
---

# Releasing Packages

End-of-session release prep for the `@open-tomato/*` monorepo (`packages/`): turn this
session's changes into correct changesets + version bumps, verify, then publish to the
**private** registry `https://npm.heimdall.bifemecanico.com/` — never public npm or GitHub.

## Core model (read first)

- **Publishing is registry-diff.** `publish-packages.ts` ships a package only if its local
  `version` isn't on the registry yet. **An un-bumped package ships nothing — the release IS
  the version bumps.**
- **Only genuinely-changed packages get a changeset.** A bump is warranted only when a file
  that *ships in the tarball* changed (the package's `src/`, entry points). `package.json`
  metadata churn, root files (`scripts/`, docs, `.changeset/config.json`), and tests in
  packages that exclude them do **not** warrant a bump.
- **Versions are changeset-driven** — never hand-edit a `version` field. (The only exception
  is a one-time initial graduation via `graduate.ts --set-version`; not a normal release.)
- **Eligibility gate:** a package must be `private:false` with no `REFACTOR_NEEDED.md` to
  publish at all. First-ever publish of a gated package → see `packages/RELEASING.md`
  graduation + `graduate.ts`, not this flow.

## Flow

1. **Survey what actually changed**, per package:
   ```bash
   git status --porcelain
   git diff --name-only main...HEAD
   ```
   Map each changed file to its package; ignore non-shipping noise (root files,
   metadata-only manifest edits).

2. **Clean stale changesets.** Read every `.changeset/*.md`. Delete or rewrite any that no
   longer match reality (wrong packages, wrong level, outdated summary). A leftover changeset
   silently bumps packages you never touched on `changeset version`.

3. **Author one changeset for the changed set** — `bunx @changesets/cli` (plain
   `bunx changeset` fails with "could not determine executable" because the package is
   `@changesets/cli`, not `changeset`), or write `.changeset/<name>.md` directly:
   ```markdown
   ---
   "@open-tomato/logger": minor
   "@open-tomato/errors": patch
   ---

   logger: add `child()` for scoped sub-loggers.
   errors: fix stack truncation on re-thrown AppError.
   ```
   - List **only** changed packages.
   - One present-tense line per package describing the *observable* change (this becomes the
     CHANGELOG entry — not "updated code").
   - Choose the bump level per the table below.

4. **Verify coverage — while changesets are still pending** (the changed-must-bump check
   only works before versions are applied):
   ```bash
   bun run prepublish:check   # build+check-types+test+lint + preflight (incl. changed-must-bump)
   ```
   Every changed package must be covered by a pending changeset here.

5. **Apply versions:** `bunx @changesets/cli version`. This bumps each `package.json`, writes each
   package's `CHANGELOG.md`, and consumes the changeset files. Review the diff — changesets
   cascades internal-dependency bumps (`updateInternalDependencies: patch`), so confirm
   nothing unexpected moved:
   ```bash
   git diff --stat -- '**/package.json' '**/CHANGELOG.md'
   ```

6. **Publish** (changesets are now consumed, so these run preflight with `--skip-changeset`;
   the registry-diff driver ships only the bumped versions):
   ```bash
   bun run publish:dry   # gates + preflight + stage + publint + npm pack --dry-run
   bun run publish:local # same, then publishes the bumped set to the private registry
   ```
   In the dry run, confirm the publish set is **exactly** the packages you bumped.

## Bump levels (pre-1.0 — see `packages/VERSIONING.md`)

| Level | When |
|-------|------|
| `patch` | bug fix, internal refactor, test-only change, in-tarball docs, in-range dep bump |
| `minor` | additive public API (new export / optional arg / opt-in flag), `@deprecated` mark |
| `major` | removed/renamed export, changed signature or runtime semantics, raised dep/runtime floor |

Pre-1.0, treat the `0.MINOR` digit as the breaking axis. Unsure between minor/major →
choose **major** and explain why in the summary.

## Common mistakes

| Mistake | Reality |
|---------|---------|
| Bumping every package "to be safe" | Registry-diff + changesets ship only what you bump. Bump only what changed. |
| Leaving a stale changeset in `.changeset/` | It bumps unrelated packages on `changeset version`. Review every `.md` first. |
| Treating a `package.json`-only edit as shippable | Metadata churn isn't a tarball change → no changeset. |
| Hand-editing a `version` field | Versions are changeset-driven; only `graduate.ts` sets a baseline, once. |
| Expecting `publish:local` to ship an un-bumped package | Same version as registry → nothing ships. |
| Reaching for `--skip-changeset` | That flag is only for the one-time initial graduation, not a normal release. |
| Summary like "update logger" | Summaries are CHANGELOG entries — describe the observable change. |
| `changeset:add` exits "no target packages" | `bun run changeset:add` only auto-detects packages from **uncommitted** git changes. If you committed first, pass `--pkg <name>:<level>` explicitly. |
| `publish:dry`/`publish:local` aborts before staging | The turbo pipeline runs `build check-types test lint` **first**; a failing test in *any* package (incl. pre-existing debt — see root `AGENTS.md`) aborts before the publish stage. Use the direct-script escape hatch below. |

## Troubleshooting — pipeline aborts on unrelated failures

`bun run publish:dry` and `bun run publish:local` run the full `turbo run build check-types
test lint` pipeline **before** the publint + tarball step. Pre-existing test failures in
unrelated packages (e.g. `services/orchestrator` debt) abort the run before publish ever
executes. To exercise just the stage + publint + pack step for the packages you actually
bumped, invoke the publish script directly:

```bash
bun packages/scripts/publish-packages.ts --dry-run   # stage + publint + npm pack --dry-run; prints "All good!"
bun packages/scripts/publish-packages.ts --yes       # same, then bun publish to the private registry, in dep order
```

- Both forms stage **every eligible package** (any whose local `version` is not yet on the
  registry), **not just yours**. Read the `[publish] PUBLISH -> ...` preamble before letting
  `--yes` proceed — if another in-flight package has an unreleased bump, you'll publish it too.
- Registry auth lives in `~/.npmrc`
  (`//npm.heimdall.bifemecanico.com/:_authToken=...`); the committed `packages/.npmrc` only
  handles scope→registry routing.
- This bypasses the turbo gates — only reach for it when the *only* thing failing the pipeline
  is unrelated debt. Run `bun run prepublish:check` for your own package first.

## See also

- `packages/RELEASING.md` — full flow, graduation, CI parity, troubleshooting.
- `packages/VERSIONING.md` — bump-level policy in detail.
- `packages/scripts/` — `preflight.ts`, `publish-packages.ts`, `graduate.ts` (run with `--help`-style `--dry-run` first).
