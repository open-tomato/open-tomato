# REFACTOR_NEEDED — @open-tomato/notifications-plugin-anthropic

> This package is not currently publishable to npm. This document describes
> why, and what needs to change before it can graduate. The refactor is
> tracked separately — do not attempt to lift this gate in a publish PR.

## Blocking reasons

- [ ] Awaiting Wave 3 graduation PR (see design spec).
- [ ] No README with install + usage.
- [ ] No `license`, `description`, `repository`, `homepage`, `bugs` fields.
- [ ] No `"files"` whitelist.
- [ ] Confirm unit tests exercise the public entry.

## Desired shape (sketch)

See `VERSIONING.md` for graduation criteria. At minimum: stable public
entry via `exports`, `"files"` whitelist, `README.md`, `description`,
`license`, and no transitive `private: true` deps.

## Removal criteria

This file is removed — and the package made `private: false` — in the same
PR that lands the Wave 3 graduation, along with a changeset declaring the
bump.
