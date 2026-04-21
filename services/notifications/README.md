# services/notifications — Notification Hub

Pure event fan-out and human-gate approval service for the bifemecanico cluster. Receives activity events from the executor, persists them to Postgres, fans them out over SSE, and manages human-in-the-loop approval gates.

Job/task/worker state is owned by the executor service. Notifications does **not** orchestrate jobs.

## Architecture

```text
executor service (services/executor)
  → POST /events/executor          emit loop/task/log events
  → POST /approvals                register an approval request
  → GET  /approvals/:id/wait (SSE) block until a human decides

tech-tree app (apps/tech-tree)
  → GET  /events/executor/:jobId (SSE)  live activity stream
  → GET  /events/executor/:jobId/history  stored event history (REST)
  → GET  /approvals?pending=true        approval inbox
  → POST /approvals/:id/decide          grant or deny
```

---

## Directory structure

```text
services/notifications/
├── index.ts                         # createService entry point
├── docker-compose.yml               # Postgres 16 on port 5433
├── drizzle.config.ts                # Drizzle ORM config
├── drizzle/                         # Generated SQL migrations + journal
├── .env.example                     # Environment variable template
└── src/
    ├── db/
    │   ├── schema.ts                # Table definitions: events, approvals
    │   └── index.ts                 # pg.Pool + Drizzle dependency wrapper
    ├── entity/
    │   ├── types.ts                 # EntityTypeDefinition, EntityKind
    │   ├── registry.ts              # EntityRegistry singleton
    │   └── plugins/
    │       ├── executor.ts          # Executor entity: Zod schema + metadata
    │       ├── webhook.ts           # Webhook entity plugin
    │       └── stubs.ts             # Mail/push/reminder/prompt stubs
    ├── sse/
    │   └── bus.ts                   # SseBus (EventEmitter) — publish/subscribe
    ├── store/
    │   ├── events.ts                # Event append + history query
    │   └── approvals.ts             # Approval CRUD + decision flow
    ├── openapi.ts                   # OpenAPI 3.0 spec (Swagger UI at /docs)
    └── routes/
        ├── events.ts                # POST /events/:kind, GET /events/:kind/:jobId (SSE)
        └── approvals.ts             # POST /approvals, GET /approvals, GET …/wait (SSE), POST …/decide
```

---

## Environment variables

See `.env.example`. Copy to `.env` before running locally.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4400` | HTTP listen port |
| `DATABASE_URL` | `postgresql://notifications:notifications@localhost:5433/notifications` | Postgres connection string |

---

## Dev setup

### 1. Start Postgres

```sh
bun run db:start    # docker compose up -d
bun run db:stop     # docker compose down (data preserved)
bun run db:reset    # wipe volume and restart
```

Container: `notifications-postgres` on port **5433** (offset to avoid clashing with other local Postgres instances). Data persisted in `notifications_pg_data` Docker volume.

### 2. Configure environment

```sh
cp .env.example .env
# edit .env if needed
```

### 3. Run migrations

```sh
bun run db:migrate    # apply all pending migrations (drizzle-kit migrate)
bun run db:generate   # regenerate after schema changes (drizzle-kit generate)
```

### 4. Start the service

```sh
bun run dev     # hot-reload dev server
bun run start   # production
```

---

## API reference

### Events

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/events/:entityKind` | Emit an event (used by executor nodes) |
| `GET` | `/events/:entityKind/:jobId` | SSE stream — replays history then streams live events |
| `GET` | `/events/:entityKind/:jobId/history` | Stored event history (REST, JSON array) |

### Approvals

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/approvals` | Create a pending approval request |
| `GET` | `/approvals` | List approvals (`?pending=true`, `?jobId=`) |
| `GET` | `/approvals/:requestId/wait` | SSE — block until a decision arrives (or return immediately if already decided) |
| `POST` | `/approvals/:requestId/decide` | Submit a decision `{ decision: "granted" | "denied", note? }` |

### Status

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/status` | List registered entity kinds |
| `GET` | `/docs` | Swagger UI |

---

## Database schema

Defined in `src/db/schema.ts`.

| Table | Purpose |
|-------|---------|
| `events` | Append-only activity stream. `job_id` is a soft UUID reference (no FK). `event_type` is `text` so plugins own their vocabulary |
| `approvals` | Human gate requests. `job_id` is a soft UUID reference (no FK). `status`: `pending | granted | denied | expired` |

### Key design decisions

- **No job/task/node tables** — job orchestration has moved to the executor service. Notifications only stores events and manages approvals.
- **`job_id` as soft reference** — events and approvals reference jobs by UUID without a FK constraint. The executor service owns the canonical job rows.
- **`event_type` as `text`** — avoids `ALTER TYPE` migrations when a new entity plugin adds event subtypes.
- **`entity_kind` as enum** — the set of entity categories is stable and small; enum gives query efficiency.

---

## Entity plugins

Entity plugins register a Zod schema and metadata with `entityRegistry`. The notification service validates incoming events against the registered schema.

```ts
// src/entity/plugins/executor.ts
registerExecutorEntityPlugin()

// src/entity/plugins/webhook.ts
registerWebhookEntityPlugin()

// src/entity/plugins/stubs.ts  (mail, push, reminder, prompt)
registerStubEntityPlugins()
```

To add a new entity kind:
1. Add the value to `entityKindEnum` in `schema.ts`
2. Run `bun run db:generate` + `bun run db:migrate`
3. Create `src/entity/plugins/<kind>.ts` and call `register()` in `index.ts`

---

## SSE bus

`src/sse/bus.ts` is a module-level `EventEmitter` singleton with two channels:

- `events:<jobId>` — activity stream events, replayed from DB history on new connections
- `approval:<requestId>` — one-shot approval decisions

Max 500 listeners per channel. 15-second heartbeats keep connections alive through proxies.

---

## Key gotchas

- **Port 5433** — Postgres runs on 5433, not 5432, to avoid clashing with other local databases.
- **SSE and Express** — set `res.setHeader('Cache-Control', 'no-cache')` and `res.flushHeaders()` before streaming; Express buffers otherwise.
- **Import extensions** — all internal imports use `.js` extensions (`import { foo } from './bar.js'`) even in TypeScript files.
- **No dispatch endpoint** — job dispatch now goes directly to the executor service (`POST /jobs` on the executor). The old `/dispatch` and `/nodes` endpoints have been removed.
