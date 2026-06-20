# @open-tomato/mcp

Factory package for building Model Context Protocol (MCP) servers within the open-tomato monorepo. Wraps the MCP SDK with transport selection, health endpoint, graceful shutdown, and structured logging.

## Overview

`createMCP(config)` is the single entry point. It:

1. Validates and defaults configuration via Zod
2. Instantiates a `McpServer` from the MCP SDK
3. Invokes your `setup` callback to register tools, resources, and prompts
4. Wires the selected transport (HTTP or stdio)
5. Starts a standalone health server (HTTP mode only)
6. Registers a `SIGTERM` handler for graceful shutdown
7. Returns an `MCPHandle` with `stop()` and `healthUrl()` methods

The server auto-starts on call — no explicit `start()` is needed.

## Installation

This package is a workspace member. Add it as a dependency in your `package.json`:

```json
{
  "dependencies": {
    "@open-tomato/mcp": "workspace:*"
  }
}
```

## Usage

```ts
import { createMCP } from '@open-tomato/mcp';

const handle = createMCP({
  serviceId: 'my-mcp-service',
  setup: async (server, { logger, clients }) => {
    server.tool('greet', {}, async () => ({
      content: [{ type: 'text', text: 'Hello!' }],
    }));
    logger.info('Tools registered');
  },
});

// Health URL (HTTP mode only):
console.log(handle.healthUrl()); // http://localhost:3001/health

// Graceful shutdown:
await handle.stop();
```

## API

### `createMCP(config: MCPConfig): MCPHandle`

Creates and auto-starts an MCP server.

#### `MCPConfig`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `serviceId` | `string` | Yes | — | Unique service identifier. Used as logger scope and service label in health responses. |
| `setup` | `(server, ctx) => void \| Promise<void>` | Yes | — | Callback to register tools, resources, and prompts. Awaited before transport is opened. |
| `clients` | `TypedClient<unknown>[]` | No | `[]` | Managed HTTP clients made available via `ctx.clients` in `setup`. |
| `health.port` | `number` | No | `3001` | Port for the standalone health server (HTTP mode only). |
| `health.path` | `string` | No | `'/health'` | URL path for the health check route. |
| `logger` | `LoggerOptions` | No | — | Logger options forwarded to `@open-tomato/logger`. Defaults to `LOG_LEVEL` env var or `'info'`. |

#### `MCPContext`

The second argument passed to `setup`:

```ts
interface MCPContext {
  logger: Logger;      // structured logger scoped to serviceId
  clients: ClientsMap; // Record<string, TypedClient<unknown>> keyed by client name
}
```

#### `MCPHandle`

```ts
interface MCPHandle {
  stop(): Promise<void>;   // gracefully shuts down transport and health server
  healthUrl(): string;     // e.g. "http://localhost:3001/health" (empty string in stdio mode)
}
```

## Environment Variables

| Variable | Values | Default | Description |
|---|---|---|---|
| `MCP_TRANSPORT` | `'http'` \| `'stdio'` | `'http'` | Selects the transport. Set to `'stdio'` for Claude Desktop or local pipe-based clients. |
| `PORT` | number | `8080` | Port on which the MCP HTTP transport listens (not the health server). |

### Transport modes

**HTTP (default):** The MCP protocol is served over `WebStandardStreamableHTTPServerTransport` on `PORT` (default `8080`). A separate health server starts on `health.port` (default `3001`).

**stdio:** Set `MCP_TRANSPORT=stdio`. The MCP protocol is served over stdin/stdout via `StdioServerTransport`. No health server is started.

## Health Endpoint

When running in HTTP mode, a health server listens on `health.port` (default `3001`) at `health.path` (default `'/health'`).

Response shape:

```json
{
  "status": "ok",
  "serviceId": "my-mcp-service",
  "clients": {
    "my-api-client": { "status": "running" }
  }
}
```

Aggregate `status` values:

- `"ok"` — all clients are healthy
- `"degraded"` — at least one client has `status === 'starting'` (none are `'error'`)
- `"error"` — at least one client has `status === 'error'`

All other paths return `404 Not Found`.

## With HTTP clients

```ts
import { createMCP } from '@open-tomato/mcp';
import { createHttpClient } from '@open-tomato/service-core';

const apiClient = createHttpClient({
  name: 'downstream-api',
  baseUrl: 'https://api.example.com',
});

const handle = createMCP({
  serviceId: 'my-mcp-service',
  clients: [apiClient],
  setup: async (server, { logger, clients }) => {
    const api = clients['downstream-api'];
    server.tool('fetch-data', {}, async () => {
      const data = await api.get('/data');
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    });
  },
});
```
