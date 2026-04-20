# Plan 09 — Legacy Cleanup & Finalization

## Scope
Delete `./legacy-monorepo/` after confirming nothing depends on it. Final documentation and top-level hygiene pass. This plan is intentionally last — do not start until every other plan has passed its completion gate.

## Prerequisites
- [x] Plans 00–08 complete
- [x] `BASELINE.md`, `LINK_CHECK.md`, `PLAN_08_RESULTS.md` all recorded green

## Out of Scope
- Content changes to the migrated projects.
- Publishing packages/CLI to npm — that is a separate follow-up after this refactor lands.

---

## Steps

### Step 09.1 — Full regression pass from each repo
**Actions:**
1. Run in this order:
   - `cd packages && bun install && bun run build && bun run test && bun lint`
   - `cd open-tomato && bun install && bun run build && bun run test && bun lint`
   - `cd tomato-cli && bun install && bun run build && bun run test && bun lint`
   - `cd template-service-express && bun install && bun run build && bun run test && bun lint`
   - `cd template-service-mcp && bun install && bun run build && bun run test && bun lint`
   - `cd auth && ...`, `cd knowledge-base && ...`, `cd token-monitor && ...` (from Plan 08)
2. Save aggregated results as `./plans/refactor/FINAL_REGRESSION.md` with exit codes and timings.

**Commit:** `docs: record final regression results before legacy-monorepo deletion`

---

### Step 09.2 — Orphan search (nothing imports legacy-monorepo)
**Actions:**
1. Run `mgrep "legacy-monorepo"` across the umbrella excluding `plans/refactor/` and `legacy-monorepo/` itself.
2. Expected hits: only this plans directory and maybe the umbrella `BASELINE.md`. Anything else means a link/import was missed in Plan 07 — fix it and re-run.
3. Run `mgrep "from ['\\\"].*legacy-monorepo"` (source imports). Must return zero.

**Commit (if fixes needed):** `fix: drop residual legacy-monorepo references`

---

### Step 09.3 — Archive snapshot
**Goal:** before deletion, preserve a snapshot tag so the legacy source can be recovered from git history.

**Actions:**
1. Ensure the current umbrella dir is a git repo (it isn't per initial check — confirm user intent; if not a repo, initialize `git init` before this step, or skip archive-in-git and instead create a tarball).
2. If git-backed: `git tag pre-legacy-cleanup-$(date +%Y%m%d)` and push if remote exists.
3. If not git-backed: `tar -czf ~/backups/open-tomato-legacy-monorepo-$(date +%Y%m%d).tar.gz legacy-monorepo/`. Record the path in `./plans/refactor/FINAL_REGRESSION.md`.

**Commit (if git):** `chore: tag pre-legacy-cleanup snapshot`

---

### Step 09.4 — Delete `legacy-monorepo/`
**Actions:**
1. `rm -rf legacy-monorepo/`.
2. Delete the ignored `workflows/`, `documentation/`, `legacy-app/` umbrella folders as well — they were clarified as ignored/incomplete. **Confirm with user one more time** before deleting `legacy-app/` because it is a separate Electron-looking app; if uncertain, leave it and surface it as a follow-up question.

**Commit:** `chore: remove legacy-monorepo and incomplete umbrella stubs`

---

### Step 09.5 — Re-run regression post-deletion
**Actions:**
1. Repeat every command from 09.1.
2. Any failure here indicates something was still relying on `legacy-monorepo/` — `git revert` the deletion commit, fix the root cause, and retry.

**Commit:** none (verification).

---

### Step 09.6 — Final umbrella docs pass
**Actions:**
1. Update `./README.md` to reflect the post-cleanup layout:
   ```
   ./
   ├── auth/
   ├── knowledge-base/
   ├── open-tomato/
   ├── packages/
   ├── plans/
   ├── skills/
   ├── template-service-express/
   ├── template-service-mcp/
   ├── token-monitor/
   └── tomato-cli/
   ```
2. Drop any "migration in progress" language.
3. Update `./AGENTS.md` to remove references to `legacy-monorepo/`.
4. Move `BASELINE.md`, `LINK_CHECK.md`, `PLAN_08_RESULTS.md`, `FINAL_REGRESSION.md` into `./plans/refactor/archive/` to keep the refactor history but separate it from active plans.

**Commit:** `docs: finalize umbrella README and AGENTS post-cleanup`

---

### Step 09.7 — Plans index marker
**Actions:**
1. Update `./plans/refactor/README.md` with a top banner: `> Status: completed <YYYY-MM-DD>. Retained for historical reference.`

**Commit:** `docs: mark refactor plans as completed`

---

### Step 09.8 — Optional: rename `./open-tomato/` to something shorter
The umbrella dir and the monorepo both carry "open-tomato" in their name (`./open-tomato/open-tomato/`). Consider renaming the monorepo folder to `./app-platform/` or `./main/`, or renaming the umbrella to `./open-tomato-workspace/`. **Do not do this in this plan** — capture as a follow-up issue only.

**Commit:** none. Open a tracked note.

---

## Completion Criteria
- [ ] `legacy-monorepo/` gone.
- [ ] `workflows/`, `documentation/` gone (and `legacy-app/` per user confirmation).
- [ ] All 9+ standalone repos pass regression.
- [ ] No file in the umbrella references `legacy-monorepo` except the archived refactor plans.
- [ ] README and AGENTS reflect final layout.
- [ ] Refactor plans marked completed.

## Exit
Refactor is complete. Follow-up work tracked separately:
- npm publishing activation (disabled stubs exist).
- `tomato-cli` feature enhancements (user has a separate roadmap).
- Rename of umbrella or monorepo folder to avoid the `open-tomato/open-tomato/` nesting (optional).
