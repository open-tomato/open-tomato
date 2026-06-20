# Versioning Policy

All `@open-tomato/*` packages follow semver. Version bumps are declared by
authors via Changesets — never edited directly in `package.json`.

## patch — `0.0.X`

- Bug fixes that don't alter the public API.
- Internal refactors (file moves, renamed internals, extracted helpers).
- Dependency bumps within the same declared semver range that don't change
  observable behavior.
- Doc-only changes that ship in the tarball (README, JSDoc).
- Test-only changes.

## minor — `0.X.0`

- Additive public API: new exported symbol, new optional function argument,
  new optional config field.
- New opt-in behavior gated behind a new flag.
- Deprecation marks on existing API (warnings, `@deprecated` JSDoc).
  Removal is a separate major.
- Widening peer-dep support (e.g., `zod: ^3` → `^3 || ^4`).

## major — `X.0.0`

- Removed or renamed export.
- Changed function signature (argument count, type, or return type).
- Changed runtime semantics of an existing export.
- Raised peer-dep floor (e.g., `zod: ^3.25` → `^3.30`) or dropped a
  supported range.
- Raised required Bun or Node version.
- Moved an export to a different subpath.

## Pre-1.0

All packages start in `0.x.y`. During pre-1.0 we treat `0.minor.patch` the
same way as `major.minor.patch` — i.e., `0.2.0 → 0.3.0` is a breaking
change. A package stabilizes by landing an explicit **major** changeset
that bumps it to `1.0.0`.

## Cross-cutting rules

- If unsure whether a change is minor or major, default to **major** and
  explain why in the changeset summary.
- Transitive bumps are handled automatically by Changesets — authors don't
  need separate changesets for dependent packages.
- A single changeset file can declare different bump levels for multiple
  packages.

## When a package cannot version cleanly

If a package's public API is too coupled to its internals to version
cleanly (re-exports of deep internals, no stable entry point, mutable
singleton exports, etc.), drop a `REFACTOR_NEEDED.md` in the package
directory describing what needs to change. Such packages stay
`"private": true` until refactored.
