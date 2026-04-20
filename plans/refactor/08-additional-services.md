# Plan 08 — Migrate Additional Services via the Express Template

## Scope
Migrate the remaining legacy services (`auth`, `knowledge-base`, `token-monitor`) into their own dedicated repo folders at the umbrella root, using `template-service-express` as the reference shape so they conform to the service-as-a-package pattern. Each lands as an **independent** sibling folder (not inside `open-tomato/services/`) because the user wants them decoupled from the main monorepo.

**Recruiter-pipeline** has no `package.json` and appears to be an empty stub — skipped, deleted in Plan 09.

## Prerequisites
- [x] Plan 01 complete
- [x] Plan 04 complete (template ready to clone from)
- [x] Plans 02–03 complete (reference for service conventions)

## Out of Scope
- Adding features, API changes, or schema changes.
- Merging these services back into `open-tomato/services/` — they stay standalone.

---

## Target Layout

```
./auth/
./knowledge-base/
./token-monitor/
```

Each follows `template-service-express/` structure as closely as the existing code allows — with domain code preserved.

---

## Shared Step Template (per service)

For each of `auth`, `knowledge-base`, `token-monitor`:

1. **Clone template:** `cp -R template-service-express <name>/`. Delete template-only `.example` files you won't use.
2. **Overlay legacy code:** `rsync -av legacy-monorepo/services/<legacy>/ <name>/` excluding `node_modules`, `dist`, `.turbo`. Allow it to overwrite template `src/` with domain code.
3. **Reconcile `package.json`:**
   - `name` stays `@open-tomato/<x>` (preserve the existing legacy names).
   - Dependencies: point every `@open-tomato/*` to `file:../packages/<group>/<name>`.
   - Scripts: align with template (`dev`, `start`, `build`, `check-types`, `lint`, `test`, `docs:generate` optional).
4. **Adopt template config files** (`eslint.config.mjs`, `tsconfig.json`) unless the legacy ones diverged meaningfully — prefer template; document divergence if kept.
5. **Dockerfile/compose:** adopt from template; if legacy had a custom one, merge by porting only custom bits.
6. **Smoke test:** `bun install && bun lint && bun run test && bun run build`. If tests relied on workspace-local fixtures, keep them but fix imports.
7. **Docs pass:** update `README.md`, `AGENTS.md` (if present) with new package paths.
8. **Commit:** `refactor(<service>): migrate to standalone repo using template-service-express`.

---

## Service-Specific Notes

### Step 08.1 — `auth`
- Package name: `@open-tomato/auth-service` (confirmed from legacy `package.json`).
- Had a turbo-level override in legacy `turbo.json#services/auth#build` — investigate what it was (probably a generated client) and re-add inside the new `auth/turbo.json` if applicable.

### Step 08.2 — `knowledge-base`
- Depends on drizzle + pg. Use the template's drizzle example as the shape; port the actual schema and queries.
- Likely shares logical schema with the MCP template's ingestion target — verify they can co-exist against one database.

### Step 08.3 — `token-monitor`
- Legacy `package.json#name` is `claude-dashboard-backend` — **keep** this name (external tool may reference it). Document as a known divergence in the service's `README.md`.
- This service looks less aligned with the template (no drizzle). Expect more config diffs; keep them intentional and documented.

---

### Step 08.4 — Verify docker-compose coverage
**Actions:**
1. Decide: do these services belong in the `open-tomato/docker-compose.yml` dev stack? If user later wants them joinable, they can be added as external services pointing to the sibling folder via `context: ../auth`.
2. Stub entries are **commented out** in `open-tomato/docker-compose.yml` but documented in `open-tomato/README.md` under "External services".

**Commit:** `docs(open-tomato): document external services (auth, knowledge-base, token-monitor)`

---

### Step 08.5 — Cross-repo test pass
**Actions:**
1. `cd auth && bun run test` (and same for the other two).
2. From umbrella root, run a quick script that iterates over each standalone folder, runs `bun lint && bun run test && bun run build`. Save results to `./plans/refactor/PLAN_08_RESULTS.md`.

**Commit:** none — verification.

---

## Completion Criteria
- [ ] `./auth/`, `./knowledge-base/`, `./token-monitor/` each standalone with template-aligned structure.
- [ ] Each builds, tests, lints green.
- [ ] Package references point to `../packages/<group>/<name>` — no imports from `legacy-monorepo/*`.
- [ ] Divergences from template documented in each service's `README.md`.
- [ ] `recruiter-pipeline` verified empty (no `package.json` present) — queued for deletion in Plan 09.

## Exit
Proceed to [09-legacy-cleanup.md](./09-legacy-cleanup.md).
