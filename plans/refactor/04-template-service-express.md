# Plan 04 — `template-service-express/`

## Scope
Carve a minimal, reusable Express service boilerplate out of `open-tomato/services/notifications`. The template demonstrates the service-as-a-package pattern (`createService` from `@open-tomato/express`) and ships **commented/optional** examples for RPC, SSE, and Drizzle — enabled explicitly by the adopter, not bundled by default.

## Prerequisites
- [x] Plan 01 complete (`@open-tomato/express`, `service-core`, `logger`, `errors` live under `./packages/`)
- [x] Plan 03 complete (notifications migrated — serves as the source)

## Out of Scope
- Migrating `auth` / `knowledge-base` / `token-monitor` — that is Plan 08 **after** this template lands.
- Publishing the template to npm or a GitHub template repo — add a CI stub (disabled).
- Business logic: absolutely no notification-specific code is kept.

---

## Decision: Template folder name

Two names are in play: spec says `template-service-express` and scaffolding exists at `template-backend-express`. **Winner: `template-service-express`** — rationale: (a) mirrors `template-service-mcp`, (b) matches the user's stated spec, (c) the term "service" is what the monorepo conventions use.

**Action:** rename `./template-backend-express/` → `./template-service-express/` in Step 04.1 (git mv).

---

## Target Layout

```
./template-service-express/
├── .github/workflows/
│   └── ci.yml
├── docs/
│   ├── rpc.md                 # opt-in RPC layer doc
│   ├── sse.md                 # opt-in SSE doc
│   └── drizzle.md             # opt-in Drizzle/db doc
├── src/
│   ├── index.ts               # createService entrypoint
│   ├── config.ts              # zod env schema
│   ├── routes/
│   │   ├── health.ts
│   │   └── example.ts
│   ├── services/
│   │   └── example.service.ts
│   └── types.ts
├── tests/
│   └── health.test.ts
├── examples/                  # copy-in snippets — NOT imported by src/
│   ├── rpc-route.ts.example
│   ├── sse-stream.ts.example
│   └── drizzle-db.ts.example
├── AGENTS.md
├── CONTRIBUTING.md
├── Dockerfile
├── README.md
├── docker-compose.yml         # postgres only, opt-in
├── eslint.config.mjs
├── package.json
├── tsconfig.json
└── .env.example
```

**Rule:** nothing in `examples/` is imported, linted, or tested. The `.example` extension keeps it out of the TS program.

---

## Steps

### Step 04.1 — Rename target folder
**Actions:**
1. `git mv template-backend-express template-service-express` (use `mv` if not yet tracked by git).
2. Update any references in umbrella `README.md` / `AGENTS.md`.

**Commit:** `chore: rename template-backend-express -> template-service-express`

---

### Step 04.2 — Copy notifications as seed, strip domain code
**Actions:**
1. `cp -R open-tomato/services/notifications/* template-service-express/` (excluding `node_modules`, `dist`, `.env`).
2. Rename `package.json#name` to `@open-tomato/template-service-express`.
3. Delete **all domain code**: anything in `src/` referring to notifications, anthropic, plugins, templates, etc. Keep only `src/index.ts`, `src/config.ts`, `src/routes/health.ts`, and one minimal `example` route.
4. Delete Drizzle schema files, migrations, and db client from `src/`. Keep `drizzle.config.ts` only if it is already minimal; otherwise move its content into `examples/drizzle-db.ts.example` and delete.
5. Delete notification-specific tests; add a single `tests/health.test.ts` that boots the service and hits `/health` via supertest.
6. Update `package.json#dependencies`: remove plugin deps and anything notifications-specific; keep `@open-tomato/express`, `@open-tomato/service-core`, `express`, `zod`.
7. Rewrite `src/index.ts` to the canonical `createService` call:
   ```ts
   import { createService } from '@open-tomato/express';
   import { config } from './config.js';
   import { exampleRouter } from './routes/example.js';

   await createService({
     name: '@open-tomato/template-service-express',
     port: config.PORT,
     routes: [{ path: '/example', router: exampleRouter }],
   });
   ```
8. Write `src/config.ts` as a tiny zod schema parsing `process.env` — `PORT`, `LOG_LEVEL`, nothing else.

**Commit:** `refactor(template-express): strip notifications domain code from seed`

**Docs:** update `template-service-express/README.md`:
- Quick-start: clone, `bun install`, `bun run dev`, hit `/health`.
- "Opt-in features" section listing rpc/sse/drizzle with pointers to `examples/*` and `docs/*.md`.

---

### Step 04.3 — Author opt-in example files
**Actions:**
1. `examples/rpc-route.ts.example` — minimal JSON-RPC handler using the existing protocol shape (no new deps).
2. `examples/sse-stream.ts.example` — minimal SSE route using Express res.write and the existing `@open-tomato/service-core` event primitives if available.
3. `examples/drizzle-db.ts.example` — Drizzle client setup, one schema file, one migration, one repository query. Reference the env var `DATABASE_URL`.
4. Each `docs/*.md` explains: what it is, how to enable it, which files to copy into `src/`, which deps to `bun add`.

**Commit:** `docs(template-express): add opt-in rpc/sse/drizzle examples`

---

### Step 04.4 — Package linking to shared packages
**Actions:**
1. Because `template-service-express` lives outside `open-tomato/` and `packages/`, use `file:` refs: `"@open-tomato/express": "file:../packages/service/express"`. This is a local-dev convenience — the template README must explain that on adoption the user should switch to a published semver (`"^1.0.0"`) or the GitHub syntax (`"user/repo#semver:^1.0.0"`) once `@open-tomato/*` is published.
2. Add a note in `template-service-express/README.md#adapting-the-template` with these three alternatives.

**Commit:** `chore(template-express): pin shared package refs via file: for local dev`

---

### Step 04.5 — Dockerfile + compose
**Actions:**
1. Multi-stage `Dockerfile` (bun base → install → build → runtime bun).
2. `docker-compose.yml` with one `postgres:16-alpine` service **commented out** plus the template service itself. Adopter uncomments postgres if they enable the Drizzle example.

**Commit:** `chore(template-express): add Dockerfile and compose skeleton`

---

### Step 04.6 — CI stub + meta files
**Actions:**
1. `.github/workflows/ci.yml` → bun install, lint, test, build.
2. `AGENTS.md` — short version pointing to the umbrella `AGENTS.md` and stating that this is a template (treat its `src/` as a baseline, replace freely).
3. `CONTRIBUTING.md` — one-pager: "To update the template, edit here; to adopt it, copy the folder contents to your new repo."
4. `.env.example` with `PORT`, `LOG_LEVEL`.

**Commit:** `docs(template-express): add AGENTS, CONTRIBUTING, env example, CI stub`

---

### Step 04.7 — Gate: full build/test
**Actions:**
1. `cd template-service-express && bun install && bun lint && bun run test && bun run build`.
2. `bun run dev` smoke test → `/health` returns 200.

**Commit:** none (verification).

---

## Completion Criteria
- [ ] Folder renamed to `template-service-express`.
- [ ] Zero notifications/anthropic/plugin code remains in `src/`.
- [ ] `src/` has only: index, config, health route, one example route, tests/health.
- [ ] `examples/` holds `.example` files not included in TS program.
- [ ] README documents opt-in feature adoption and three linking strategies.
- [ ] Template builds, lints, tests green standalone.

## Exit
Parallelizable with [05-template-service-mcp.md](./05-template-service-mcp.md). Plan 08 (additional services) **requires** this plan.
