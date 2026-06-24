# AGENTS — app/

Frontend application (Vite + React + TypeScript). Workspace member; consumes `@open-tomato/*` packages from the workspace via `workspace:^`.

**Before working here:** read [`../AGENTS.md`](../AGENTS.md) (umbrella + workflow).

## Status

Placeholder until feature work begins. The eventual home for the open-tomato frontend will assemble components from `packages/ui-skeleton/` once the design-system → core-ui conversion resumes (depends on the visual-testing pipeline; see `../plans/INDEX.md`).

## Conventions when active

- Use components from `@open-tomato/ui-skeleton` (`packages/ui-skeleton`) — do not duplicate primitives.
- Type-only cross-area imports go through `@open-tomato/repo-types` (`types/`).
- Follow the web rules in `../skills/` and the design-quality standards in the ECC ruleset.

## See also

- [`../AGENTS.md`](../AGENTS.md) — root umbrella
- [`../packages/ui-skeleton/`](../packages/ui-skeleton/) — component source
- [`../plans/INDEX.md`](../plans/INDEX.md) — initiative registry
