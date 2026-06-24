---
name: notifications-plugin-anthropic
description: Agent context and gotchas for @open-tomato/notifications-plugin-anthropic — consumer-side plugin for Claude Code webhook events.
---

# AGENTS — packages/notifications-plugin-anthropic

Package-level context for `@open-tomato/notifications-plugin-anthropic`. Read the root `AGENTS.md` first, then this file.

---

## Purpose

Consumer-side typed client that other services and shell scripts use to emit Claude Code hook events to `services/notifications`. This package does **not** contain provider/delivery logic — that lives inside `services/notifications/src/entity/plugins/` per ADR 0007.

Migrated from `services/token-monitor` which was a standalone Express + Redis service. The new package is a thin typed layer: Zod schemas, a typed HTTP client, and a plugin definition object.

---

## Plugin contract

The plugin exports an `EntityTypeDefinition` consumed by the entity registry in `services/notifications`:

| Field | Type | Value |
| --- | --- | --- |
| `kind` | `EntityKind` | `'anthropic'` — must be added to the `EntityKind` union in `services/notifications/src/entity/types.ts` |
| `providers` | `ProviderKind[]` | `['sse']` — events are delivered via SSE fan-out, no external provider |
| `direction` | `Direction` | `'inbound'` — hook events flow in from Claude Code |
| `interactive` | `boolean` | `false` — no approval/response loop |
| `payloadSchema` | `z.ZodTypeAny` | `ClaudeCodeEventSchema` — discriminated union on `hook_event_name` |
| `deliver` | `undefined` | Omitted — SSE fan-out is handled by the notification service core |

---

## Module locations

| Path | Purpose |
| --- | --- |
| `src/schema.ts` | Zod schemas for each Claude Code hook event variant (`PreToolUse`, `PostToolUse`, `Stop`, `Notification`) |
| `src/types.ts` | `AnthropicPluginConfig` and supplementary types |
| `src/handler.ts` | `handleInboundWebhook` — parses raw request body with `ClaudeCodeEventSchema` |
| `src/plugin.ts` | `anthropicPlugin` — the `EntityTypeDefinition` object |
| `src/client.ts` | `emitEvent(baseUrl, sourceId, payload)` — typed HTTP client for producers |
| `src/index.ts` | Barrel export |
| `tests/` | Unit tests (Vitest) |

---

## Gotchas

- **`EntityKind` is a string literal union, not extensible at runtime.** Adding a new kind (e.g. `'anthropic'`) requires updates in **five** places: (1) `EntityKind` union in `services/notifications/src/entity/types.ts`, (2) Drizzle `pgEnum` in `services/notifications/src/db/schema.ts`, (3) a new plugin file in `services/notifications/src/entity/plugins/`, (4) `VALID_KINDS` in `services/notifications/src/routes/events.ts`, and (5) `EntityKindSchema` in `services/notifications/src/openapi.ts`. Missing any of these causes silent failures or runtime errors.
- **`hook_event_name` is the discriminant, not `type`.** Existing notification plugins (executor, tech-tree) use `type` as their discriminant field. Claude Code hooks use `hook_event_name` — do not rename it to `type` or the schema will not match real webhook payloads from Claude Code.
- **`sourceId` is caller-provided, not generated.** The `emitEvent` client requires a `sourceId` from the caller (typically a machine or session identifier). The notification service does not generate one.
- **No Redis, no SSE bus in this package.** The old `services/token-monitor` owned its own Redis store and SSE bus. Those responsibilities now live in `services/notifications`. This package is a pure typed client + schema library with zero runtime dependencies beyond `zod`.
- **`deliver` is optional on `EntityTypeDefinition`.** Stub and SSE-only plugins omit `deliver()`. Do not add a no-op implementation — the service core checks for the field's existence.
- **Payload shapes come from `services/token-monitor/server.js`.** When porting schemas, inspect the actual `POST /api/event` handler in `server.js` for field names and types — the plan's schema snippets are a starting point but the source of truth is the running service.

---

## Skill references

| Skill | When to use |
| --- | --- |
| [api](../../skills/api/) | Zod validation patterns, request/response schemas |
| [drizzle-orm](../../skills/drizzle-orm/) | If extending the notification service's persistence layer |
| [n8n-nodes](../../skills/n8n-nodes/) | If wiring Claude Code events into n8n workflows |

---

## Related files outside this package

| Path | Relevance |
| --- | --- |
| `services/notifications/src/entity/types.ts` | `EntityTypeDefinition`, `EntityKind` — the interface this plugin implements |
| `services/notifications/src/entity/registry.ts` | `entityRegistry.register()` — where the plugin is registered at startup |
| `services/notifications/src/entity/plugins/executor.ts` | Reference implementation of an existing entity plugin |
| `services/token-monitor/server.js` | Legacy source — hook event shapes and `MODEL_PRICING` to port |
| `docs/adr/0007-notification-channel-plugin-architecture.md` | Architectural decisions governing all notification plugins |
