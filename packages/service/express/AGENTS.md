---
name: express-package
description: Agent context and gotchas for the @open-tomato/express shared package, including control-plane routes and operator interface patterns.
---

# AGENTS — packages/express

Package-level context for `@open-tomato/express`. Read the root `AGENTS.md` first, then this file.

---

## Control plane module locations

| Path | Purpose |
| ---- | ------- |
| `src/control/types.ts` | All control-plane types and type guards (`isPausableDependency`, `isRestartableDependency`, `isHealthDetailProvider`) |
| `src/control/utils.ts` | Shared utilities: `circuitBreakerState`, `aggregateStatus`, `errorMessage` |
| `src/control/middleware.ts` | `controlAuth` and `controlEnabled` middleware |
| `src/control/routes.ts` | `createControlRouter` factory — all `/_control` route handlers |
| `src/control/version.ts` | `readServiceVersion` — reads and caches `version` from `package.json` |
| `src/shutdown.ts` | `registerShutdown` — SIGTERM/SIGINT graceful shutdown handler |
| `src/builtin-routes.ts` | Mount point for built-in routes including `/_control` |

---

## Control plane patterns

- **`circuitBreaker` state** for `ClientControlStatus` is derived from `Dependency.status`: `running` → `closed`, `degraded` → `half-open`, `error` → `open`.
- **`TypedClient<T>`** (`= T & Dependency` from service-core) does not expose `resetCircuitBreaker()`. The client reset route uses `stop()` + `start()` as the equivalent.
- **`isRestartableDependency`** always returns `true` for any valid `Dependency` instance because `stop()` and `start()` are required on the interface. The guard is still used for type narrowing.
- **`POST /_control/stop`** calls `process.kill(process.pid, 'SIGTERM')` inside `setImmediate` so the HTTP 200 response is flushed before the signal fires.
- **`registerShutdown`** in `shutdown.ts` listens for SIGTERM/SIGINT via `process.once`, so emitting SIGTERM from the stop route follows the same graceful shutdown path.
- **User-auth isolation**: `requireAuth`/`optionalAuth` middleware is passed via `ctx` to `config.register(app, ctx)` and is never applied globally via `app.use()`. Built-in routes (including `/_control`) are fully isolated from it by design.

---

## Gotchas

- **`vi.mock('node:fs')` without a factory function** fails in Bun's Vitest runner — the auto-mock is not generated and the module is imported unmocked. Always pass an explicit factory: `vi.mock('node:fs', () => ({ readFileSync: vi.fn() }))`.
- **Express 4 async route handlers** do not auto-forward thrown errors to the error middleware (that is an Express 5 feature). Always wrap async handlers in `try/catch` and call `res.status(500).json(...)` explicitly — do not rely on unhandled rejection propagation.
