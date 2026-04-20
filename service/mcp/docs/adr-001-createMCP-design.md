# ADR-001: createMCP — Lean MCP-Only Surface

**Status:** Accepted
**Date:** 2026-03-24
**Deciders:** bifemecanico platform team

---

## Context

`@open-tomato/mcp` provides a `createMCP` factory that is the standard entry point for all MCP servers in `mcps/*`. The initial design decision was whether to reuse or extend the `createService` factory from `@open-tomato/express`, which already handles lifecycle, dependency management, health endpoints, and control routes.

MCP servers differ fundamentally from Express services: they expose tools, resources, and prompts to AI clients over the Model Context Protocol rather than serving HTTP application traffic. They call external APIs via HTTP clients but do not own process-local resources such as database connections, queues, or caches.

---

## Decision

`createMCP` deliberately omits three capabilities present in `createService`:

1. **`dependencies` array** — not present in `MCPConfig`
2. **`/_control` routes** — not present in the MCP HTTP surface
3. **Express middleware** — `packages/mcp` does not depend on Express at all

---

## Rationale

### 1. No `dependencies` Array

`createService` accepts a `dependencies` array to coordinate startup and shutdown of process-local resources (databases, queues, Redis). `createMCP` omits this because:

- MCP servers are thin tool servers. Their job is to wrap external API calls, not to own storage infrastructure.
- Any data access an MCP needs should be done via a service API endpoint, reached through an HTTP client declared in `MCPConfig.clients`.
- The `Dependency` state machine in `@open-tomato/service-core` exists for objects with connection lifecycles (connect, disconnect, health checks). HTTP clients managed by `createHttpClient` are passive — they do not hold open connections and do not require coordinated startup.
- Adding `dependencies` support to `MCPConfig` would broaden the surface, invite patterns where MCPs directly own databases, and add complexity with no benefit for the intended use case.

**Correct pattern:** an MCP that needs database access calls a REST or GraphQL service that owns the database. It does not connect to the database itself.

### 2. No `/_control` Route

`@open-tomato/express` exposes `/_control` to support control-plane tooling: health aggregation across a dependency graph, graceful drain coordination, and operational introspection. `createMCP` omits this because:

- There is no dependency graph to introspect. HTTP clients declared via `clients` are stateless from a lifecycle perspective.
- There is no graceful drain sequence to coordinate. MCP servers can be stopped and restarted cheaply.
- Operational visibility for MCP servers is provided by:
  - The `/health` endpoint on a dedicated port (default `3001`), which aggregates circuit-breaker state for declared clients.
  - Structured logs emitted through the shared logger from `@open-tomato/service-core`.
- Adding a control route would require an Express server, which contradicts the no-Express constraint (see below).

### 3. No Express Middleware

`packages/mcp` does not list `express` or `@open-tomato/express` as a dependency. This is a hard constraint enforced by the package dependency graph:

```
@open-tomato/service-core
    ├──▶ @open-tomato/mcp       (this package)
    │         deps: service-core, @modelcontextprotocol/sdk, zod
    │         NOT: express, @open-tomato/express
    │
    └──▶ @open-tomato/express
              deps: service-core, express
              NOT: @modelcontextprotocol/sdk
```

Reasons:
- Bundlers and tree-shakers work best when the dependency graph is explicit. A shared entry point would make it easy to accidentally pull Express into an MCP deployment.
- Express middleware is a runtime concept that does not map to MCP's tool/resource/prompt model. Adding it would expose an API surface that has no meaningful implementation.
- `createService` and `createMCP` evolve on independent semver tracks. Express-breaking changes must not require MCP consumers to update, and vice versa.

---

## Consequences

- `MCPConfig` is a focused, minimal interface: `serviceId`, optional `clients`, `setup` callback, optional `health` config, optional `logger` config.
- All cross-cutting concerns (logging, HTTP client circuit breakers, retry) are inherited from `@open-tomato/service-core` without pulling in Express.
- The health endpoint is the only HTTP surface the MCP process exposes outside of the MCP transport itself, and it is read-only.
- Teams that need a full service with database access, dependency coordination, and control routes should use `@open-tomato/express`, not `@open-tomato/mcp`. MCP servers should delegate data access to those services via HTTP clients.
