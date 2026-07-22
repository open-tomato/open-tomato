---
repo: open-tomato
tier: milestone
depends-on: [05, 07]
parallel-with: [12]
size: S
status: pending
linear: OPT-252
---

# WS13 — Cleanup

**Goal:** remove scaffolding debt once the pipeline has fully replaced it.

## Milestones

1. **Remove `packages/ui-skeleton`** (D9): confirm zero imports anywhere (`grep -r "ui-skeleton"` across workspaces + apps), then delete the workspace and its glob entry. Recoverable via git history.
2. **`.temp/` sweep**: specs already copied to `docs/plans/poc-release/reference/`; delete `.temp/` from the working tree (it was never tracked) after confirming nothing else references it.
3. **Final gate sanity**: `bun run publish:dry` green; changeset status clean; no dangling `workspace:*` refs to removed packages.
4. **CB follow-ups triage** (not necessarily executed here — file in Linear if still open): tokens.css `@layer base` cascade fix, durable CI visual-baseline storage, self-hosted fonts, stale `package-lock.json` removal, runner org registration.

## Verification

- Turbo gate green; fresh clone + `bun install` + `bun run build` works; published packages install from Verdaccio into a scratch project.
