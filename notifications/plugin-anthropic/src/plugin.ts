/**
 * Anthropic / Claude Code entity plugin definition.
 *
 * Exports a single {@link anthropicPlugin} object that satisfies the
 * {@link EntityTypeDefinition} contract. The notification service imports
 * this definition and registers it with the entity registry at startup.
 */
import type { EntityTypeDefinition } from './types.js';

import { handleInboundWebhook } from './handler.js';
import { ClaudeCodeEventSchema } from './schema.js';

/**
 * Plugin definition for the Anthropic / Claude Code entity type.
 *
 * - **type** — unique entity kind used as the registry key and URL segment
 * - **label** — human-readable name for dashboards and status endpoints
 * - **schema** — Zod discriminated union validating all hook event variants
 * - **handleInbound** — parses raw webhook bodies into normalized events
 */
export const anthropicPlugin: EntityTypeDefinition = {
  type: 'anthropic',
  label: 'Anthropic / Claude Code',
  schema: ClaudeCodeEventSchema,
  handleInbound: handleInboundWebhook,
};
