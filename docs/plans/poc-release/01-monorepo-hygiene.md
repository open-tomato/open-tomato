---
repo: open-tomato
tier: milestone
depends-on: []
parallel-with: [02, 03, 05-wave-0]
size: S
status: ready
linear: TBD (WS02)
---

# WS01 — Monorepo hygiene & release baseline

**Goal:** a green, trustworthy publish gate before any UI package ships through it.

## Milestones

1. **Wire in `packages/ui/*`**: add the glob to root `package.json` `workspaces` (verified absent today); commit the untracked `packages/ui/components` + `packages/ui/theme-default` scaffolds. Empty `src/` must not break the turbo gate — add a placeholder entry point/test so `build`, `check-types`, `test`, `lint` pass.
2. **Publish pending changesets**: CLI rename `tomato-cli` → `@open-tomato/cli` + dispatch fixes (`.changeset/cli-b397c0ec.md`, `cli-dispatch-contract.md`) versioned and published to Verdaccio.
3. **Orchestrator test debt** (commit `4461ab7` disabled `runner.test.ts`, `store/{jobs,tasks,workers}.test.ts`): re-enable, or explicitly quarantine each with a Linear issue so the gate is honest, not silently weakened.
4. **Normalize `packages/ui/theme-default`**: real package.json in the fixed version group (D2), even if content lands in WS05 wave 0.

## Cut-lines

- Orchestrator tests may stay quarantined (with tracked issues) if re-enabling requires dependency work out of scope here.

## Verification

- `bun run publish:dry` green across all workspaces (including the new ui scaffolds).
- Published CLI installable from `npm.heimdall.bifemecanico.com`.
