/**
 * @packageDocumentation
 * Anthropic / Claude Code entity plugin registration.
 *
 * Bridges the external plugin package (`@open-tomato/notifications-plugin-anthropic`)
 * to the service's internal {@link EntityTypeDefinition} contract and registers
 * it with the global entity registry.
 */
import { anthropicPlugin } from '@open-tomato/notifications-plugin-anthropic';

import { entityRegistry } from '../registry.js';

/**
 * Registers the Anthropic / Claude Code entity plugin with the global registry.
 *
 * Maps the plugin package's interface (`type`, `label`, `schema`, `handleInbound`)
 * to the service's {@link EntityTypeDefinition} fields (`kind`, `providers`, etc.).
 *
 * Must be called before the HTTP server starts accepting requests.
 */
export function registerAnthropicEntityPlugin(): void {
  entityRegistry.register({
    kind: 'anthropic',
    providers: ['sse', 'inline-http'],
    direction: 'inbound',
    interactive: false,
    payloadSchema: anthropicPlugin.schema,
  });
}
