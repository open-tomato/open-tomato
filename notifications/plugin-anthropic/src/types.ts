/**
 * Shared types for the Anthropic / Claude Code notification plugin.
 *
 * Re-exports schema-inferred event types and defines the configuration
 * and handler envelope types used by the client and inbound handler.
 */
import type { z } from 'zod';

// Re-export all event types from the schema module for consumer convenience.
export type {
  ClaudeCodeEvent,
  PreToolUseEvent,
  PostToolUseEvent,
  StopEvent,
  NotificationEvent,
  SessionStartEvent,
  SubagentStartEvent,
  UserPromptSubmitEvent,
} from './schema.js';

// ---------------------------------------------------------------------------
// Plugin configuration
// ---------------------------------------------------------------------------

/**
 * Configuration required to connect to the notification service as an
 * Anthropic event producer. Passed to the client at construction time.
 */
export interface AnthropicPluginConfig {
  /** Base URL of the notification service (e.g. `http://localhost:3100`). */
  baseUrl: string;
  /** Stable identifier for the event source (e.g. a machine name or session tag). */
  sourceId: string;
}

// ---------------------------------------------------------------------------
// Handler result
// ---------------------------------------------------------------------------

/**
 * Result type for the inbound webhook handler.
 *
 * On success, `ok` is `true` and `event` contains the normalized envelope.
 * On failure, `ok` is `false` and `error` describes what went wrong.
 */
export type HandleResult =
  | { ok: true; event: NormalizedEvent }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Plugin definition contract
// ---------------------------------------------------------------------------

/**
 * Contract each entity plugin must satisfy when registering with the
 * notification hub.
 *
 * This is a local mirror of the interface that will eventually live in
 * `@open-tomato/notifications-core`. It captures the subset of fields
 * exported by plugin packages — the integration layer in
 * `services/notifications` maps these to the richer
 * `EntityTypeDefinition` used by the registry at startup.
 */
export interface EntityTypeDefinition {
  /** Unique string identifier for this entity kind (e.g. `'anthropic'`). */
  type: string;
  /** Human-readable label shown in admin UI / status endpoints. */
  label: string;
  /** Zod schema that validates the inbound event payload. */
  schema: z.ZodTypeAny;
  /** Handler that parses raw request bodies into normalized events. */
  handleInbound: (body: unknown) => HandleResult;
}

// ---------------------------------------------------------------------------
// Inbound handler types
// ---------------------------------------------------------------------------

/**
 * The raw request body expected by the inbound webhook handler.
 * `sourceId` identifies the producer; the remaining fields come from
 * the Claude Code hook payload.
 */
export interface InboundWebhookBody {
  sourceId: string;
  [key: string]: unknown;
}

/**
 * Normalized event envelope returned by the inbound handler after
 * schema validation. This is the shape persisted by `services/notifications`.
 */
export interface NormalizedEvent {
  entityKind: 'anthropic';
  sourceId: string;
  eventType: string;
  payload: Record<string, unknown>;
}
