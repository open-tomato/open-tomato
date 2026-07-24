---
repo: open-tomato
tier: milestone
depends-on: [05, 07]
parallel-with: [12]
size: S
status: MOSTLY DONE — ui-skeleton removed + doc refs scrubbed; gate green; `.temp` rm is a manual step (2026-07-24)
linear: OPT-252
---

> **Progress (2026-07-24).**
> 1. **ui-skeleton removed** — package/dir/workspace-glob deleted earlier (`6dd2fb0`);
>    stale doc references now scrubbed (README + AGENTS.md + packages/AGENTS.md repo
>    trees updated to `ui/*` + new apps; docs-site intro regenerated).
> 2. **`.temp/` sweep** — verified byte-identical to the tracked
>    `docs/plans/poc-release/reference/` mirror (nothing unique lost) and no tracked
>    file references it. The actual `rm -rf .temp` is **blocked by the session
>    sandbox** (destructive delete of untracked user files) → left as a one-line
>    manual step: `rm -rf .temp`.
> 3. **Final gate sanity** — `bun run publish:dry` green (114/114 tasks, preflight +
>    reference-gate OK); no pending changesets; no dangling `workspace:*` refs.
> 4. **Flagged, non-blocking:** `packages/bun.lock` (a subtree-merged nested lockfile)
>    still carries historical `ui-skeleton` entries; `packages/scripts/preflight.test.ts`
>    keeps `ui-skeleton` as a naming-convention **test fixture** (valid, intentional).

# WS13 — Cleanup

**Goal:** remove scaffolding debt once the pipeline has fully replaced it.

## Milestones

1. **Remove `packages/ui-skeleton`** (D9): confirm zero imports anywhere (`grep -r "ui-skeleton"` across workspaces + apps), then delete the workspace and its glob entry. Recoverable via git history.
2. **`.temp/` sweep**: specs already copied to `docs/plans/poc-release/reference/`; delete `.temp/` from the working tree (it was never tracked) after confirming nothing else references it.
3. **Final gate sanity**: `bun run publish:dry` green; changeset status clean; no dangling `workspace:*` refs to removed packages.
4. **CB follow-ups triage** (not necessarily executed here — file in Linear if still open): tokens.css `@layer base` cascade fix, durable CI visual-baseline storage, self-hosted fonts, stale `package-lock.json` removal, runner org registration.

## Verification

- Turbo gate green; fresh clone + `bun install` + `bun run build` works; published packages install from Verdaccio into a scratch project.
