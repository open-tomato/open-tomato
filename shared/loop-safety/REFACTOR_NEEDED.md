# REFACTOR_NEEDED — @open-tomato/loop-safety

> This package is not currently publishable to npm. This document describes
> why, and what needs to change before it can graduate. The refactor is
> tracked separately — do not attempt to lift this gate in a publish PR.

## Blocking reasons

- [ ] No README.
- [ ] No test script (uses `bun test` but no tests present).
- [ ] Exports `./src/index.ts` directly — verify entry is stable.
- [ ] No graduation changeset yet.

## Desired shape (sketch)

See `VERSIONING.md` for graduation criteria. At minimum: stable public
entry via `exports`, `"files"` whitelist, `README.md`, `description`,
`license`, and no transitive `private: true` deps.

## Removal criteria

This file is removed — and the package made `private: false` — in the same
PR that lands the refactor, along with a changeset declaring the graduation
bump (minor for pre-1.0, major for post-1.0).
