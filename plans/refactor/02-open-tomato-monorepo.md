# Plan 02 — `open-tomato/` Monorepo Scaffold

## Scope
Stand up `./open-tomato/` as the main application monorepo: turbo root, shared config, empty `app/` frontend stub, empty `services/`, `types/`, and a dev-loop `docker-compose.yml` capable of running all services + the app together. **No services are moved into it yet — that happens in Plan 03.**

## Prerequisites
- [x] Plan 00 complete
- [x] Plan 01 complete (shared packages reachable at `../packages/**`)

## Out of Scope
- Migrating the 4 services (Plan 03).
- Wiring the empty app to any backend — it is a blank Vite+React scaffold.
- Production Dockerfile hardening.

---

## Target Layout

```
./open-tomato/
├── .github/                  # GitHub Actions (CI stubs only for now)
├── app/                      # empty Vite+React scaffold (placeholder)
├── docs/                     # repo-level documentation
├── services/                 # will receive 4 services in Plan 03
├── types/                    # repo-level shared TS types (empty seed file)
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
├── SECURITY.md
├── docker-compose.yml        # dev-loop constellation: services + app
├── eslint.config.ts
├── package.json              # root scripts + workspace:["app","services/*","types"]
├── tsconfig.json             # extends ../packages/shared/typescript-config/base.json
├── turbo.json
└── .gitignore
```

---

## Steps

### Step 02.1 — Root workspace `package.json`
**Actions:**
1. Write `./open-tomato/package.json`:
   ```json
   {
     "name": "@open-tomato/monorepo",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "packageManager": "bun@1.3.9",
     "workspaces": ["app", "services/*", "types"],
     "scripts": {
       "build": "turbo run build",
       "check-types": "turbo run check-types",
       "dev": "turbo run dev",
       "dev:stack": "docker compose up --build",
       "lint": "turbo run lint",
       "test": "turbo run test"
     },
     "devDependencies": {
       "@open-tomato/eslint-config": "file:../packages/shared/eslint-config",
       "@open-tomato/typescript-config": "file:../packages/shared/typescript-config",
       "turbo": "^2.5.0",
       "typescript": "^5.9.3"
     },
     "engines": { "node": ">=18" }
   }
   ```
2. **Cross-root linking note:** because `./open-tomato/` and `./packages/` are separate workspace roots, shared packages cannot resolve via `workspace:*`. Use `file:../packages/shared/<name>` references until npm publishing is enabled, at which point switch to published semver ranges. For individual services that import shared packages (Plan 03), follow the same `file:` pattern.

**Commit:** `chore: scaffold open-tomato monorepo root package.json`

---

### Step 02.2 — `turbo.json` pipelines
**Actions:**
1. Port `./legacy-monorepo/turbo.json` but drop any project-specific overrides (e.g., `services/auth#build`).
2. Keep `build` with `^build` dependency, `lint` cache: false, `test` with `build` dependency, `dev` persistent.

**Commit:** `chore: add turbo pipelines for open-tomato`

---

### Step 02.3 — Root `tsconfig.json` and `eslint.config.ts`
**Actions:**
1. `./open-tomato/tsconfig.json`:
   ```json
   {
     "extends": "../packages/shared/typescript-config/base.json",
     "include": ["app/**/*","services/**/*","types/**/*","eslint.config.ts"],
     "exclude": ["node_modules","dist","build","coverage","**/.tmp/*","**/*.spec.ts","**/*.test.ts"]
   }
   ```
2. `./open-tomato/eslint.config.ts` — import and re-export from `@open-tomato/eslint-config`.

**Commit:** `chore: wire shared tsconfig and eslint at open-tomato root`

---

### Step 02.4 — Empty `app/` scaffold (Vite + React + TS)
**Rationale:** user asked for "a single app for frontend empty for now". Use the smallest viable Vite+React+TS template so future work can start without tooling archaeology.

**Actions:**
1. `cd open-tomato && bun create vite app --template react-ts` (accept defaults).
2. Edit `app/package.json`:
   - `"name": "@open-tomato/app"`
   - Add `"lint": "eslint --fix"` and dev dep on `@open-tomato/eslint-config` via `file:` path.
3. Replace the generated `App.tsx` content with a `<h1>Open Tomato</h1>` placeholder — no router, no state management, no API wiring.
4. Remove any Vite-generated CSS frippery except the base reset.

**Commit:** `feat: add empty Vite+React app scaffold`

**Verify:** `cd open-tomato/app && bun run build && bun run dev` — dev server loads the placeholder heading.

---

### Step 02.5 — Seed `types/` workspace package
**Actions:**
1. `./open-tomato/types/package.json`:
   ```json
   {
     "name": "@open-tomato/repo-types",
     "private": true,
     "type": "module",
     "main": "./index.ts",
     "types": "./index.ts"
   }
   ```
2. `./open-tomato/types/index.ts` with a single exported type `export type RepoMarker = "@open-tomato";` as a placeholder until Plan 03 populates it.

**Commit:** `chore: seed open-tomato types workspace`

---

### Step 02.6 — `docker-compose.yml` for dev loop
**Actions:**
1. Write `./open-tomato/docker-compose.yml` with service stanzas **commented/disabled** for each of the 4 planned services (notifications, orchestrator, scheduler, task-worker) plus the `app`, plus a shared `postgres:16-alpine` service.
2. Each service stanza includes: build context, `working_dir`, `command: bun run dev`, `env_file: ./services/<name>/.env`, port mapping, healthcheck, and `depends_on: [postgres]` where relevant.
3. Leave stanzas commented-out — they will be enabled incrementally in Plan 03 as each service is migrated.
4. Add a `scripts/dev-stack.sh` that runs `docker compose up --build` and streams logs.

**Commit:** `chore: add docker-compose dev stack skeleton`

---

### Step 02.7 — Seed docs
**Actions:**
1. Copy (and strip) `./legacy-monorepo/README.md` into `./open-tomato/README.md` — remove references to mcps, templates, and any packages not moving here.
2. Copy `./legacy-monorepo/AGENTS.md` → `./open-tomato/AGENTS.md`, strip sections pointing to legacy structure; update skills table to point to umbrella `../skills/` (populated in Plan 07).
3. Copy `./legacy-monorepo/CONTRIBUTING.md`, `SECURITY.md` with matching edits.
4. Replace every relative link that now points outside this folder with an absolute path or a TODO comment `<!-- TODO(07): repoint to ../skills/... after Plan 07 -->`.

**Commit:** `docs: seed open-tomato README/AGENTS/CONTRIBUTING/SECURITY`

---

### Step 02.8 — CI stub
**Actions:**
1. Add `./open-tomato/.github/workflows/ci.yml` running `bun install && bun lint && bun run test && bun run build` on push/pr to `main`.

**Commit:** `ci: add basic open-tomato workflow`

---

## Completion Criteria
- [ ] `cd open-tomato && bun install` succeeds (resolves `file:` refs to `../packages/shared/*`).
- [ ] `bun run build && bun run test && bun lint` green (even though services/ is empty).
- [ ] `bun run dev` in `app/` shows a placeholder page.
- [ ] docker-compose.yml parses (`docker compose config`) with services commented out.
- [ ] Seed docs present, legacy-only references marked with TODOs.

## Exit
Proceed to [03-services-migration.md](./03-services-migration.md).
