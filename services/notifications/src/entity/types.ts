/**
 * @packageDocumentation
 * Core types shared across entity plugins and the notification routing layer.
 */
import type { z } from 'zod';

/** Identifies the logical category of a notification entity. */
export type EntityKind = 'anthropic' | 'executor' | 'mail' | 'push' | 'reminder' | 'prompt' | 'webhook';

/** Transport / delivery mechanism used by an entity plugin. */
export type ProviderKind = 'sse' | 'inline-http' | 'resend' | 'sendgrid' | 'apns' | 'fcm' | 'queue';

/** Message flow direction for a given entity type. */
export type Direction = 'inbound' | 'outbound' | 'bidirectional';

/**
 * Contract each entity plugin must satisfy when registering with the hub.
 */
export interface EntityTypeDefinition {
  kind: EntityKind;
  providers: ProviderKind[];
  direction: Direction;
  /** Whether this entity type supports the request/response approval pattern. */
  interactive: boolean;
  /** Zod schema that validates the inbound event payload. */
  payloadSchema: z.ZodTypeAny;
  /**
   * Optional delivery hook — called after the event is persisted and
   * fanned out over SSE. Fire-and-forget; errors are logged but do not
   * affect the HTTP response to the caller.
   *
   * Stub plugins omit this field (no-op). Full implementations (e.g.
   * webhook, mail) implement side-effect delivery here.
   */
  deliver?(payload: Record<string, unknown>): Promise<void>;
}
