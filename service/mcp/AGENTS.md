---
title: "MCP Agent Context"
description: "Package-specific gotchas and guidelines for mcp."
---

# MCP — Agent Context

## Gotchas

- **Package name is `@open-tomato/mcp`** — use `workspace:*` as the version specifier when referencing it from other workspace packages. The factory exports `createMCP`, `createHttpClient`, and `startHealthServer`.
- **`createHttpClient` signature** — actual call form is `createHttpClient<T>(client: T, opts?: HttpClientOpts)`. There is no `name` field on the config object and no `initialDelay` in `RetryConfig`. The client key in `MCPContext.clients` is hardcoded to `'http-client'` for every client created via `createHttpClient` — reference the outer-scope variable directly in the `setup` closure instead of going through `clients['http-client']`.
- **`wireHttpTransport` uses stateless mode** — `sessionIdGenerator: undefined` causes "cannot be reused across requests" on the second HTTP call. The MCP `initialize` handshake requires at least 2 requests, so the built-in transport cannot be used for real client connections in integration tests. Work around by creating `WebStandardStreamableHTTPServerTransport` directly with `sessionIdGenerator: () => randomUUID()` (stateful mode).
- **`McpServer` supports only one client session** — a second `initialize` request is rejected with "Server already initialized". Integration tests must share a single `Client` instance: connect once in `beforeAll`, close in `afterAll`.
- **Bun polyfill hangs on SSE responses** — `packages/mcp/tests/bun-polyfill.ts` uses `fetchRes.text()` which blocks indefinitely on streaming responses. For MCP tool-call integration tests, bypass the polyfill entirely and create a standalone Node.js HTTP server that pipes `ReadableStream` chunks from the Web `Response` to `ServerResponse`.
- **Health endpoint client key** — the `/health` response lists clients under the key `'http-client'` (hardcoded in `createHttpClient`), not the logical name you assign to the variable. Plan docs showing `'github-api'` as the key are inaccurate.
- **`tsc --noEmit` OOM on context-generator** — deep type instantiation in dependencies causes the TypeScript compiler to crash with OOM on `mcps/context-generator`. Use `bun build` to verify the code compiles to valid JS instead.
- **`bun build` defaults to browser target** — packages that use `node:http` (e.g. `packages/mcp`) must pass `--target bun` or `--target node` to avoid browser polyfill errors at runtime.
- **MCP client teardown** — use `client.close()` (not `transport.close()`) to gracefully disconnect in `afterAll`. `Client` from `@modelcontextprotocol/sdk/client/index.js` extends `Protocol` which exposes `close()` directly.
- **`StreamableHTTPClientTransport` import path** — import from `@modelcontextprotocol/sdk/client/streamableHttp.js` and construct with `new StreamableHTTPClientTransport(new URL('http://host/mcp'))`, then pass to `client.connect(transport)`.
