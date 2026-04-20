# Plan 03 — Services Migration into `open-tomato/services/`

## Scope
Move the four mapped services from `legacy-monorepo/services/*` into `./open-tomato/services/*` (with renames), rewire their `workspace:*` dependencies to `file:../../../packages/**` references, confirm each builds/tests/lints individually, and incrementally enable their stanzas in `docker-compose.yml`.

## Prerequisites
- [x] Plan 00 complete
- [x] Plan 01 complete (packages live at `../packages/{shared,service,notifications}/*`)
- [x] Plan 02 complete (open-tomato monorepo scaffold exists)

## Out of Scope
- Migrating `auth`, `knowledge-base`, `token-monitor` (those wait for Plan 04 to finish and are handled in Plan 08 using the template).
- Feature additions, dependency bumps, or API changes.

---

## Mapping

| Legacy path | New path | Package name (unchanged) |
|-------------|----------|--------------------------|
| `legacy-monorepo/services/notifications` | `open-tomato/services/notifications` | `@open-tomato/notifications` |
| `legacy-monorepo/services/executor` | `open-tomato/services/orchestrator` | `@open-tomato/orchestrator` (renamed from `@open-tomato/executor`) |
| `legacy-monorepo/services/schedulus` | `open-tomato/services/scheduler` | `@open-tomato/scheduler` (renamed from `@open-tomato/schedulus`) |
| `legacy-monorepo/services/task-worker` | `open-tomato/services/task-worker` | `@open-tomato/task-worker` |

**Renames:** executor→orchestrator and schedulus→scheduler require a repo-wide grep-and-replace for the npm name. Plan 04 (template) extracts **before** these renames are propagated to avoid dragging the rename through the template.

---

## Shared Step Template (per service)

Apply this sequence for each service in the order they appear below (easiest first):

1. **Copy** `cp -R legacy-monorepo/services/<legacy> open-tomato/services/<new>`.
2. **Remove** `node_modules/`, `dist/`, `.turbo/`, lockfiles if any.
3. **Rewrite `package.json` dependencies:** replace every `"@open-tomato/<x>": "workspace:*"` with `"@open-tomato/<x>": "file:../../../packages/<group>/<name>"` per the Plan 01 layout. Use the mapping table at the bottom of this plan.
4. **Update imports** only if a package **folder** name changed (the plugins lost their `notifications-` prefix in the folder, but their npm name didn't — no code change needed).
5. **Rename package name** (for executor→orchestrator and schedulus→scheduler):
   - Update `package.json#name`.
   - `grep -r "@open-tomato/executor"` / `"@open-tomato/schedulus"` across the repo; replace where it appears in consumer `package.json` files.
   - No consumers exist yet for the renamed services (they only run their own CLIs), so this is local.
6. **`bun install`** inside the service.
7. **`bun lint`**, **`bun run test`**, **`bun run build`** (or `check-types`). Fix blockers.
8. **Enable the docker-compose stanza** for this service (uncomment the block added in Plan 02.6).
9. **Docs pass:** update the service's `README.md` to:
   - Replace any `legacy-monorepo/...` paths with `open-tomato/...`.
   - Update the package name in examples if it was renamed.
   - Mark any link to `skills/`, `packages/`, or `docs/` outside this service with a TODO if Plan 07 hasn't run yet.
10. **Commit:** `refactor(services): migrate <legacy> -> <new>`; if rename: add `BREAKING CHANGE: package renamed @open-tomato/<old> -> @open-tomato/<new>` in the body.

---

## Steps

### Step 03.0 — Remove stale target shells
**Actions:**
1. Plan 00 already scrubbed `node_modules/dist`. Re-verify `ls open-tomato/services/` — if `worker/` still exists, `rm -rf open-tomato/services/worker` (it will be re-created as `task-worker/`).
**Commit:** `chore: remove stale target shells in open-tomato/services`

---

### Step 03.1 — Migrate `notifications`
- Follow template above. Simplest first because the express template will be extracted from it in Plan 04.
- Extra: this service has a Drizzle/pg setup. Keep it intact. Verify `docker compose up postgres notifications` brings both up.

**Commit:** `refactor(services): migrate notifications`

**Verify gate:**
- `bun run test` inside service: green
- `curl http://localhost:<port>/health` returns 200 when running via compose.

---

### Step 03.2 — Migrate `executor → orchestrator` (rename)
- Follow template; additionally:
  - Change `package.json#name` from `@open-tomato/executor` to `@open-tomato/orchestrator`.
  - Search codebase for string `"executor"` inside this service and in the newly migrated `notifications` — replace only unambiguous package refs (not domain-model fields named "executor").
  - If any file/folder inside the service is named `executor*`, consider renaming for clarity — but do not rename symbols that are public API until the consuming repo catches up.

**Commit:** `refactor(services): migrate executor -> orchestrator`

**Docs:** `docs: rename executor -> orchestrator in service README` as a follow-up commit.

---

### Step 03.3 — Migrate `schedulus → scheduler` (rename)
- Follow template; rename npm name `@open-tomato/schedulus` → `@open-tomato/scheduler`.
- Scheduler depends on `@open-tomato/linear` — ensure the relative path points to `../../../packages/shared/linear`.

**Commit:** `refactor(services): migrate schedulus -> scheduler`

---

### Step 03.4 — Migrate `task-worker` (no rename)
- Follow template. Name stays `@open-tomato/task-worker`.
- Per clarification #7: review `legacy-monorepo/scripts/` for any loose files that were worker-helpers (likely candidates: anything referencing `worker-protocol` or orchestrating tasks). Move those into `open-tomato/services/task-worker/scripts/` rather than into `tomato-cli/`. Do this as a separate commit after the base migration.

**Commits:**
1. `refactor(services): migrate task-worker`
2. `refactor(task-worker): absorb worker-related scripts from legacy scripts folder`

---

### Step 03.5 — Orchestrated smoke test
**Goal:** all 4 services start together and respond to `/health`.

**Actions:**
1. `cd open-tomato && bun run dev:stack` (or `docker compose up --build`).
2. Hit each service's `/health` endpoint sequentially.
3. Shut down cleanly.

**Commit:** `test: document dev-stack smoke flow in open-tomato/README.md`

---

### Step 03.6 — Root open-tomato test pass
**Actions:**
1. From `./open-tomato/`: `bun install && bun run build && bun run test && bun lint`.
2. All green before exiting this plan.

**Commit:** none (verification step only). If fixes are needed, commit them as `fix: <service> <desc>`.

---

## Package Reference Mapping (for Step 3 above)

| Workspace name | Legacy location | New file: reference from a service |
|----------------|-----------------|------------------------------------|
| `@open-tomato/eslint-config` | `legacy-monorepo/packages/eslint-config` | `file:../../../packages/shared/eslint-config` |
| `@open-tomato/typescript-config` | `legacy-monorepo/packages/typescript-config` | `file:../../../packages/shared/typescript-config` |
| `@open-tomato/logger` | `legacy-monorepo/packages/logger` | `file:../../../packages/shared/logger` |
| `@open-tomato/errors` | `legacy-monorepo/packages/errors` | `file:../../../packages/shared/errors` |
| `@open-tomato/linear` | `legacy-monorepo/packages/linear` | `file:../../../packages/shared/linear` |
| `@open-tomato/service-core` | `legacy-monorepo/packages/service-core` | `file:../../../packages/service/service-core` |
| `@open-tomato/express` | `legacy-monorepo/packages/express` | `file:../../../packages/service/express` |
| `@open-tomato/worker-protocol` | `legacy-monorepo/packages/worker-protocol` | `file:../../../packages/service/worker-protocol` |
| `@open-tomato/notifications-plugin-anthropic` | `legacy-monorepo/packages/notifications-plugin-anthropic` | `file:../../../packages/notifications/plugin-anthropic` |

---

## Completion Criteria
- [ ] 4 services live under `./open-tomato/services/` with renamed folders and packages where required.
- [ ] Each service: `bun run {build,test,lint}` green.
- [ ] `docker compose up` brings all 4 services + postgres + app online.
- [ ] No service imports `legacy-monorepo/` paths.
- [ ] Root `open-tomato` turbo pipelines pass end-to-end.

## Exit
Proceed to [04-template-service-express.md](./04-template-service-express.md).
