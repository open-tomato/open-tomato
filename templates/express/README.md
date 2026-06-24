# template-service-express

A minimal, reusable Express-service boilerplate built on top of
[`@open-tomato/express`](../packages/service/express). Copy this folder as the
starting point for a new Express service in the open-tomato ecosystem.

## Quick start

```sh
bun install
cp .env.example .env
bun run dev
```

The service boots on `PORT` (default `3000`). Verify it is up:

```sh
curl http://localhost:3000/health
# -> {"status":"ok"}

curl http://localhost:3000/example
# -> {"message":"hello from template-service-express"}
```

`GET /health` is provided automatically by `@open-tomato/express`.

## What is in the template

```text
src/
├── index.ts         # createService entrypoint
├── config.ts        # zod env schema (PORT, LOG_LEVEL)
└── routes/
    └── example.ts   # minimal router you can replace
tests/
└── health.test.ts   # boots the service and asserts GET /health === 200
```

Nothing else. No database, no RPC layer, no SSE — those are opt-in (see below).

## Opt-in features

Examples ship as `.example` files outside the TypeScript program — copy them
into `src/` to enable. Each has a short guide in `docs/`:

| Feature | Example | Docs |
|---------|---------|------|
| JSON-RPC routes | [`examples/rpc-route.ts.example`](./examples/rpc-route.ts.example) | [`docs/rpc.md`](./docs/rpc.md) |
| Server-Sent Events | [`examples/sse-stream.ts.example`](./examples/sse-stream.ts.example) | [`docs/sse.md`](./docs/sse.md) |
| Drizzle + Postgres | [`examples/drizzle-db.ts.example`](./examples/drizzle-db.ts.example) | [`docs/drizzle.md`](./docs/drizzle.md) |

## Adapting the template

When you adopt this template in a new repo, the `file:` references to
`@open-tomato/*` packages will not resolve. Replace them with one of:

1. **Published semver** (preferred once the packages are on the npm org
   registry): `"@open-tomato/express": "^1.0.0"`
2. **GitHub ref** (pre-publish): `"@open-tomato/express": "user/open-tomato-express#semver:^1.0.0"`
3. **Relative `file:` path** (monorepo-adjacent development): keep the
   `file:` ref and point it to the right location.

## Scripts

| Command | Purpose |
|---------|---------|
| `bun run dev` | Watch-mode dev server |
| `bun run start` | One-shot run |
| `bun run build` | Type-check (`tsc --noEmit`) |
| `bun run check-types` | Alias for `build` |
| `bun run lint` | ESLint |
| `bun run test` | Vitest |
