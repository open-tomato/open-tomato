# ADR: packages/mcp — Architecture Decision Record

## 1. Decision: Separate Package, Not a `createService` Extension

`@open-tomato/mcp` is a standalone workspace package, not an extension or variant of `@open-tomato/express`.

**Rationale:**

- `createService` builds an Express `Application`; `createMCP` builds an `McpServer` instance from `@modelcontextprotocol/sdk`. These are fundamentally different runtime objects with different lifecycles, transports, and tool-registration APIs.
- Keeping them separate allows each package to evolve on its own semver track. Breaking changes to Express middleware patterns do not ripple into MCP consumers, and vice versa.
- MCP bundles must not acquire an accidental Express dependency. Bundlers and tree-shakers work best when the dependency graph is explicit; a shared entry point would make it trivially easy to import Express into an MCP deployment without realising it.
- The `MCPConfig` shape (a `setup` callback + optional health config) has no overlap with `ServiceConfig` (an `app` factory + `dependencies` array + `/_control` routes). Merging them would produce a bloated, poorly-typed union.

## 2. No `dependencies` Array

`MCPConfig` does not include a `dependencies` array.

**Rationale:**

MCPs are thin tool servers. Their role is to expose well-defined tools that call external APIs over HTTP — not to own or manage process-local resources such as database connection pools, queue consumers, or other long-lived stateful objects.

The `dependencies` lifecycle pattern in `@open-tomato/express` exists to coordinate startup/shutdown order for services that own such resources. Because MCPs do not own resources directly, this concept does not apply.

The correct pattern for an MCP that needs database access is:

1. Call a service API (e.g., a REST or GraphQL endpoint backed by `@open-tomato/express`) via an HTTP client.
2. Obtain that client through the `clients` field of `MCPContext`, constructed from `TypedClient` entries declared in `MCPConfig.clients`.

This keeps MCPs stateless and decoupled from storage infrastructure.

## 3. No `/_control` Route

`packages/mcp` does not expose a `/_control` route.

**Rationale:**

The `/_control` endpoint is a service-level concern introduced in `@open-tomato/express` to support control-plane tooling (health aggregation, dependency introspection, graceful shutdown orchestration). It assumes a persistent Express server with a known dependency graph.

MCPs are stateless and designed to be cheap to restart. There is no dependency graph to introspect, no drain-and-shutdown sequence to coordinate, and no control plane that needs to reach into an MCP process directly. Operational visibility is provided instead by the health endpoint (see Section 5) and by structured logs emitted through the shared logger.

## 4. Transport Strategy

`http` is the default transport. `stdio` is available for local development and Claude Desktop integration.

**Resolution at runtime, not at config time:**

Transport is an operational concern, not a product concern. `MCPConfig` does not include a `transport` field. Instead, `resolveTransport()` reads `process.env['MCP_TRANSPORT']` at startup:

```ts
function resolveTransport(): MCPTransport {
  return process.env['MCP_TRANSPORT'] === 'stdio' ? 'stdio' : 'http'
}
```

**HTTP transport (default):**

Used for deployed servers. Backed by `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`. Suitable for containerised workloads, load balancers, and production API gateways.

**stdio transport:**

Enabled by setting `MCP_TRANSPORT=stdio`. Backed by `StdioServerTransport`. Used when running the MCP locally via `claude mcp add` or inside Claude Desktop configuration. In stdio mode the health endpoint is not started (see Section 5).

## 5. Health Endpoint Design

A lightweight HTTP health server runs on a separate port (default `3001`) when the transport is `http`.

**Design decisions:**

- **Separate port:** The health endpoint is intentionally not co-located with the MCP transport port. This allows infrastructure (load balancers, Kubernetes liveness probes) to check health without interfering with the MCP protocol stream.
- **Read-only:** The health endpoint exposes no mutation surface. It returns a JSON payload summarising circuit-breaker states for declared HTTP clients and basic process metadata.
- **Not present in stdio mode:** When `MCP_TRANSPORT=stdio`, the process is driven by a parent process (Claude Desktop or a CLI wrapper). There is no network server to probe, and the parent is responsible for process health.

Configuration (from `MCPConfig.health`):

| Field  | Default     | Description                        |
|--------|-------------|------------------------------------|
| `port` | `3001`      | Port for the health HTTP server    |
| `path` | `'/health'` | Path that returns the health JSON  |

## 6. Authentication

`packages/mcp` itself is unauthenticated. Authentication is handled at the transport or gateway layer.

**Rationale:**

Embedding authentication logic inside the MCP package would:

- Couple the package to a specific auth scheme (API keys, JWTs, OAuth), making it harder to adopt as auth requirements evolve.
- Duplicate logic already present at the infrastructure layer.
- Add surface area and dependencies (JWT libraries, key-management clients) that most consumers do not need.

**Recommended patterns by deployment context:**

| Context           | Authentication mechanism                                      |
|-------------------|---------------------------------------------------------------|
| Nginx reverse proxy | `auth_request` directive delegating to an auth service      |
| API Gateway       | Token validation at the gateway (e.g., AWS API Gateway authorizers, Kong) |
| Claude Desktop / local `stdio` | Process-level trust — no network authentication needed |

Services that require per-request identity propagation (e.g., for audit logging) should receive it via a header forwarded by the gateway, not by implementing auth inside `packages/mcp`.

## 7. Package Dependency Graph

```
@open-tomato/service-core
    │
    ├──▶ @open-tomato/mcp        (this package)
    │         depends on: service-core, @modelcontextprotocol/sdk, zod
    │         does NOT depend on: express, @open-tomato/express
    │
    └──▶ @open-tomato/express
              depends on: service-core, express
              does NOT depend on: @modelcontextprotocol/sdk
```

**Key constraints:**

- `service-core` is a dependency of `mcp`. It provides `Logger`, `createHttpClient`, `TypedClient`, and `ClientsMap`.
- Express is not in the `mcp` dependency graph. Importing `@open-tomato/mcp` must never pull in Express.
- `@modelcontextprotocol/sdk` is a direct dependency of `mcp` only. `service-core` and `express` do not depend on it.
- `zod` is used in `mcp` for config validation (`MCPConfigSchema`). It is also used independently in `service-core`; the versions must be compatible within the monorepo.
