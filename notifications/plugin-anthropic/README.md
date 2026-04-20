# @open-tomato/notifications-plugin-anthropic

Typed HTTP client and Zod schemas for emitting Claude Code hook events to `services/notifications`. This is the **producer-side** plugin — it lives on any machine running Claude Code and points inward at the notification hub.

## Concepts

`notifications-plugin-*` packages own the typed surface on the consumer/producer side. The notification service itself owns the wire protocol. Keeping the typed client in a package means shell scripts and SDKs never hard-code fetch paths, and the Zod schemas are importable by any tooling that needs to validate or understand Claude Code webhook payloads.

Migrated from `services/token-monitor`, which was a standalone Express + Redis service with its own SSE bus. This package replaces it with a thin typed layer — Zod schemas, a typed HTTP client, and a plugin definition object — while `services/notifications` takes over event storage and SSE fan-out.

---

## Installation

Add as a workspace dependency:

```json
"@open-tomato/notifications-plugin-anthropic": "workspace:*"
```

---

## Exports

```ts
import {
  anthropicPlugin,       // EntityTypeDefinition for services/notifications registry
  emitEvent,             // typed HTTP client for producing events
  type ClaudeCodeEvent,  // inferred Zod type — discriminated union on hook_event_name
  type AnthropicPluginConfig,
} from '@open-tomato/notifications-plugin-anthropic'
```

---

## Quick start

### Emitting events from a script or SDK

```ts
import { emitEvent } from '@open-tomato/notifications-plugin-anthropic'

await emitEvent(
  'http://notifications:4400', // base URL of the notification service
  'macbook-marcos',            // sourceId — machine or session identifier
  {
    hook_event_name: 'PostToolUse',
    tool_name: 'Edit',
    tool_input: { file_path: '/src/index.ts' },
    tool_response: { success: true },
  },
)
```

Maps to `POST /events/anthropic` on the notification service.

### Registering the plugin in services/notifications

```ts
import { anthropicPlugin } from '@open-tomato/notifications-plugin-anthropic'

entityRegistry.register(anthropicPlugin)
```

---

## Event types (`ClaudeCodeEvent`)

The event schema is a discriminated union on `hook_event_name`:

```ts
type ClaudeCodeEvent =
  | { hook_event_name: 'PreToolUse';    tool_name: string; tool_input: Record<string, unknown> }
  | { hook_event_name: 'PostToolUse';   tool_name: string; tool_input: Record<string, unknown>; tool_response: Record<string, unknown> }
  | { hook_event_name: 'Stop';          stop_hook_active: boolean }
  | { hook_event_name: 'Notification';  message: string }
```

The discriminant field is `hook_event_name`, **not** `type` — this differs from other notification plugins (e.g. executor) which use `type`.

---

## Plugin definition (`anthropicPlugin`)

| Field | Value |
| --- | --- |
| `kind` | `'anthropic'` |
| `providers` | `['sse']` |
| `direction` | `'inbound'` |
| `interactive` | `false` |
| `payloadSchema` | `ClaudeCodeEventSchema` |
| `deliver` | _omitted_ — SSE fan-out is handled by the notification service core |

---

## `emitEvent(baseUrl, sourceId, payload)`

Fire-and-forget HTTP client for producing events. Throws on non-2xx responses.

```ts
async function emitEvent(
  baseUrl: string,
  sourceId: string,
  payload: ClaudeCodeEvent,
): Promise<void>
```

| Parameter | Description |
| --- | --- |
| `baseUrl` | Notification service URL (e.g. `http://notifications:4400`) |
| `sourceId` | Caller-provided identifier (machine name, session ID) |
| `payload` | A valid `ClaudeCodeEvent` object |
