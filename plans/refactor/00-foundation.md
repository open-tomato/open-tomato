# Plan 00 — Foundation & Umbrella Tooling

## Scope
Establish the top-level directory as a workable multi-repo umbrella: baseline lint/type configs, a predictable workspace layout, and a verification script that each subsequent plan can rely on. **No code is moved in this plan.**

## Prerequisites
- None. This is the starting point.

## Out of Scope
- Moving any service, package, or script (handled in 01–09).
- Publishing packages to npm (stub only, kept disabled until finalization).
- Introducing new tools or frameworks.

---

## Current State (verified 2026-04-20)
Top-level already contains these scaffolded-but-empty folders (LICENSE + README only, no code):
- `./open-tomato/` (has `services/{notifications,orchestrator,scheduler,worker}/node_modules` only)
- `./packages/`
- `./skills/`
- `./template-backend-express/` (to be renamed `./template-service-express/` in Plan 04)
- `./template-service-mcp/`
- `./tomato-cli/` (has `{dependencies,event,linear,ralph}/node_modules` only)
- `./workflows/`, `./documentation/`, `./legacy-app/` — **ignored** per clarifications

---

## Steps

### Step 00.1 — Clean existing scaffold stubs
**Goal:** Remove stale `node_modules` and empty sub-dirs inside the scaffolded targets so subsequent plans start from a known clean state.

**Actions:**
1. In each of `./open-tomato/services/{notifications,orchestrator,scheduler,worker}`, `./tomato-cli/{dependencies,event,linear,ralph}`, `./template-service-mcp/`: remove `node_modules/` and `dist/`.
2. Leave `LICENSE` and `README.md` files in place (top-level scaffolds).
3. Do **not** delete the `workflows/`, `documentation/`, or `legacy-app/` folders — user said to ignore them, not remove.

**Commit:** `chore: clean stale node_modules from scaffolded target directories`

**Verify:**
- `ls ./open-tomato/services/worker` → only README-level artifacts remain (or directory empty except for scaffolding).
- No broken lockfiles remain in target dirs.

---

### Step 00.2 — Create `./plans/refactor/` tracking dir
**Goal:** Ensure this plan directory exists and is tracked.

**Actions:**
1. Confirm `./plans/refactor/*.md` files exist (they should by virtue of executing this plan).
2. Add a `./plans/README.md` one-liner pointing to `refactor/README.md`.

**Commit:** `docs: add refactor plan index`

---

### Step 00.3 — Write umbrella `.gitignore`
**Goal:** Baseline `.gitignore` at the umbrella root that covers `node_modules/`, `dist/`, `coverage/`, `.turbo/`, `.DS_Store`, `.env*`, `*.log`.

**Actions:**
1. If no `.gitignore` exists at `/Users/marcos/projects/open-tomato/.gitignore`, create one; if it exists, augment it.
2. Make sure `legacy-monorepo/` is **not** gitignored — we will delete it in Plan 09 but want its content visible until then.

**Commit:** `chore: add umbrella .gitignore`

---

### Step 00.4 — Record refactor invariants in `./AGENTS.md`
**Goal:** Capture the high-level split map so future agents see the target architecture immediately.

**Actions:**
1. Create (or update) `./AGENTS.md` at the umbrella root with:
   - Name and role of each top-level folder.
   - Execution order reference → `plans/refactor/README.md`.
   - Note that `legacy-monorepo/` is the source of truth until Plan 09 deletes it.

**Commit:** `docs: seed umbrella AGENTS.md with split map`

---

### Step 00.5 — Verify the legacy monorepo still builds
**Goal:** Baseline snapshot of what passes today. Any regression in later plans must point back to a commit after this baseline.

**Actions:**
1. `cd legacy-monorepo && bun install`
2. `bun lint` → record output (expected: green; note any pre-existing warnings).
3. `bun run test` → record output.
4. `bun run build` → record output.
5. Save a short summary as `./plans/refactor/BASELINE.md` with the exit status of each command and the git SHA of `legacy-monorepo/` at the time.

**Commit:** `docs: record legacy-monorepo baseline before refactor`

**Verify:**
- `./plans/refactor/BASELINE.md` exists and contains lint/test/build exit codes.

---

## Completion Criteria
- [ ] Scaffolded empty dirs cleaned of stale `node_modules`.
- [ ] `./plans/refactor/` index committed.
- [ ] Umbrella `.gitignore` and `AGENTS.md` in place.
- [ ] `BASELINE.md` captures legacy passing state.
- [ ] Repository tree still builds end-to-end from `legacy-monorepo/`.

## Exit
When complete, proceed to [01-packages.md](./01-packages.md).
