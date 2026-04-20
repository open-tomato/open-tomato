# Plan 07 — Skills & Documentation Consolidation

## Scope
Relocate `legacy-monorepo/skills/*` to the umbrella `./skills/` and do a coordinated documentation pass: every migrated project's `README.md`, `AGENTS.md`, `CLAUDE.md`, and any doc with relative path references gets repointed. Kill dead TODOs added during 02–06.

## Prerequisites
- [x] Plans 00–06 complete (targets exist; links can point to real files)

## Out of Scope
- Writing **new** skill content — only relocate and adjust paths.
- `SECURITY.md` rewrites (keep existing content, only repoint links).

---

## Skill Inventory (9 skills from `legacy-monorepo/skills/`)

```
api  dev-planner  documentation  drizzle-orm  git-workflow  hive-learning  n8n-nodes  react-query  styling
```

Each skill has its own directory with `SKILL.md` (or `SKILLS.md` for `git-workflow`).

---

## Target Layout

```
./skills/
├── README.md             # index of all skills, entry file naming quirk noted
├── api/
├── dev-planner/
├── documentation/
├── drizzle-orm/
├── git-workflow/
├── hive-learning/
├── n8n-nodes/
├── react-query/
└── styling/
```

---

## Steps

### Step 07.1 — Move skills directories
**Actions:**
1. For each skill: `mv legacy-monorepo/skills/<name> skills/<name>`.
2. Inside each moved skill, search for relative links pointing outside the skill folder (e.g., `../../packages/logger`) and update to the new locations (`../../packages/shared/logger`) — or absolute GitHub URLs if the convention calls for it.
3. Do **not** rename entry files (keep `SKILL.md` or `SKILLS.md` as-is).

**Commit:** one per skill or a single `refactor(skills): relocate skills/ to umbrella root` if bundling.

---

### Step 07.2 — Write `./skills/README.md` index
**Actions:**
1. Table with columns: Skill | Path | Entry file | Purpose | When to use.
2. Note the `git-workflow` entry-file quirk (`SKILLS.md` vs `SKILL.md`).

**Commit:** `docs(skills): add skills index`

---

### Step 07.3 — Repoint `open-tomato/AGENTS.md` and `open-tomato/CLAUDE.md`
**Actions:**
1. Replace every `skills/<name>/SKILL.md` → `../skills/<name>/SKILL.md`.
2. Replace every `packages/<name>` reference inside legacy docs → `../packages/<group>/<name>` per the Plan 01 grouping.
3. Resolve any TODO comments added in Plans 02–06 that deferred repointing to this plan.

**Commit:** `docs(open-tomato): repoint skills and package links to umbrella locations`

---

### Step 07.4 — Repoint each migrated service's docs
**For each service in `open-tomato/services/*`:**
1. Open `README.md` and `AGENTS.md` (if present).
2. Replace internal `../../packages/...` with `../../../packages/<group>/...`.
3. Replace any link into `legacy-monorepo/*` with either the new umbrella path or a GitHub URL.
4. Remove any references to legacy services not migrated (auth, knowledge-base, etc.) unless they appear in Plan 08 scope.

**Commit:** `docs(services): repoint internal links after split`

---

### Step 07.5 — Repoint each template's docs
- `template-service-express/README.md` and `template-service-mcp/README.md` — update `@open-tomato/*` import path examples to show both the local-dev `file:` form and the eventual published form.

**Commit:** `docs(templates): update adopter-facing path examples`

---

### Step 07.6 — Repoint `tomato-cli/` docs
- Remove references to legacy scripts directory.
- Fix `README.md` and `CONTRIBUTING.md` to reflect standalone layout.

**Commit:** `docs(tomato-cli): drop legacy scripts path references`

---

### Step 07.7 — Refresh umbrella `README.md` and `AGENTS.md`
**Actions:**
1. Umbrella `./README.md` — one-page map of top-level folders with one-line descriptions and a pointer to `plans/refactor/`.
2. Umbrella `./AGENTS.md` — authoritative directory of folders, their purpose, and which sub-`AGENTS.md` to read depending on the task.

**Commit:** `docs: refresh umbrella README and AGENTS with final split map`

---

### Step 07.8 — Link-check pass
**Actions:**
1. Run a markdown link checker across `./` (excluding `legacy-monorepo/` and `node_modules/`).
   - Tools: `bunx markdown-link-check` or `bunx lychee`.
2. Fix any 404s caught.
3. Save the output summary as `./plans/refactor/LINK_CHECK.md` with date + status.

**Commit:** `docs: fix broken links after skills/package relocation`

---

## Completion Criteria
- [ ] All 9 skills under `./skills/`.
- [ ] `./skills/README.md` index present.
- [ ] No doc in `./open-tomato/`, `./packages/`, `./tomato-cli/`, `./template-*/` links into `legacy-monorepo/`.
- [ ] Link checker report attached to `./plans/refactor/LINK_CHECK.md` with 0 failures.

## Exit
Proceed to [08-additional-services.md](./08-additional-services.md).
