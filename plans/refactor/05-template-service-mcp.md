# Plan 05 — `template-service-mcp/`

## Scope
Carve a minimal MCP (Model Context Protocol) service boilerplate out of `legacy-monorepo/mcps/context-generator`. Strip domain logic (knowledge server queries, db schema mirror), keep only the `@open-tomato/mcp` wire-up, one sample tool, and structured logging. Ship drizzle/postgres as an **opt-in** example.

## Prerequisites
- [x] Plan 01 complete (`@open-tomato/mcp`, `service-core`, `logger` live under `./packages/`).

## Out of Scope
- Migrating `mcps/open-for-work` — clarified as empty, ignored.
- Publishing the template.

---

## Target Layout

```
./template-service-mcp/
├── .github/workflows/ci.yml
├── docs/
│   ├── tools.md               # how to add/organize tool handlers
│   └── database.md            # opt-in drizzle/pg
├── src/
│   ├── server.ts              # McpServer construction + stdio transport
│   ├── tools/
│   │   └── echo.ts            # sample tool: echo back the input
│   ├── config.ts              # zod env schema
│   └── index.ts               # entrypoint: validate env, start server
├── tests/
│   └── echo.test.ts
├── examples/
│   └── drizzle-db.ts.example
├── AGENTS.md
├── README.md
├── Dockerfile
├── eslint.config.mjs
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Steps

### Step 05.1 — Copy context-generator as seed
**Actions:**
1. `cp -R legacy-monorepo/mcps/context-generator/* template-service-mcp/` (exclude `node_modules`).
2. Remove existing `template-service-mcp/node_modules` first (Plan 00 cleanup).
3. Rename `package.json#name` to `@open-tomato/template-service-mcp`.

**Commit:** `chore: seed template-service-mcp from context-generator`

---

### Step 05.2 — Strip domain code
**Actions:**
1. Delete:
   - `src/tools/get_*.ts` (knowledge-server tools)
   - `src/queries/*` (tag-intersection helpers)
   - `src/db/*` (schema mirror, client) — move `src/db/client.ts` shape into `examples/drizzle-db.ts.example` for reference.
2. Delete Anthropic SDK dep (`@anthropic-ai/sdk`) from `package.json` — template shouldn't require it.
3. Add a single sample tool `src/tools/echo.ts` that accepts `{ text: string }` and returns the same string — zod-validated.
4. Rewrite `src/server.ts` to register only the echo tool. Keep stdio transport wiring.
5. Rewrite `src/index.ts` to load `./config.js`, then `startServer()`.

**Commit:** `refactor(template-mcp): strip knowledge-base domain code; add echo sample tool`

---

### Step 05.3 — Author `src/config.ts`
**Actions:**
1. Zod schema parses: `LOG_LEVEL` (optional), and a commented-out `DATABASE_URL` (enabled by adopter if they turn on the drizzle example).
2. Explicitly do NOT require any env var by default so the template runs out of the box.

**Commit:** `feat(template-mcp): add zod-validated config with no required env`

---

### Step 05.4 — Tests
**Actions:**
1. `tests/echo.test.ts` — programmatic MCP client test that calls `echo`, asserts response.
2. No db tests.

**Commit:** `test(template-mcp): cover echo sample tool`

---

### Step 05.5 — Docs
**Actions:**
1. `README.md` — what MCP is, how stdio transport works, how to run (`bun src/index.ts`), how to add tools.
2. `docs/tools.md` — conventions for tool handlers, zod input/output, error shape.
3. `docs/database.md` — instructions to enable the drizzle example: `bun add drizzle-orm pg`, copy `examples/drizzle-db.ts.example` → `src/db/client.ts`, set `DATABASE_URL`.
4. `AGENTS.md` — mirror express template AGENTS but MCP-specific.

**Commit:** `docs(template-mcp): write README, tools.md, database.md, AGENTS.md`

---

### Step 05.6 — Dockerfile + CI
**Actions:**
1. `Dockerfile` — bun base, copy, install, `CMD ["bun","src/index.ts"]`. Note that most MCP clients launch the server as a subprocess; the Dockerfile is useful mainly for remote / HTTP adaptations.
2. `.github/workflows/ci.yml` — install, lint, test, build.
3. `.env.example` — empty-ish, document `DATABASE_URL` as opt-in.

**Commit:** `ci(template-mcp): add Dockerfile, CI workflow, env example`

---

### Step 05.7 — Package linking
**Actions:**
1. `@open-tomato/mcp`, `service-core`, `logger` → reference via `file:../packages/service/mcp` etc. Document the three-step adoption path (file → GitHub → published) in README.

**Commit:** `chore(template-mcp): pin shared package refs via file: for local dev`

---

### Step 05.8 — Gate
**Actions:**
1. `cd template-service-mcp && bun install && bun lint && bun run test && bun run build`.
2. Smoke test: `bun src/index.ts` launches, echo tool responds to a manually-sent MCP request (document in README how to do this with `@modelcontextprotocol/inspector`).

---

## Completion Criteria
- [ ] `src/` contains only: `server.ts`, `index.ts`, `config.ts`, `tools/echo.ts`.
- [ ] No knowledge-base-specific code remains.
- [ ] `bun run test` green.
- [ ] README documents adopter workflow and opt-in db example.

## Exit
Parallelizable with [04-template-service-express.md](./04-template-service-express.md). Proceed to [06-tomato-cli.md](./06-tomato-cli.md).
