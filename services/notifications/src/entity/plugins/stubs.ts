/**
 * @packageDocumentation
 * Stub entity plugins.
 *
 * Registered with typed schemas and no-op delivery logic.
 * Each will be promoted to a full implementation as the corresponding
 * package is built (notifications-mail-provider-*, notifications-push-provider-*, etc.).
 */
import { z } from 'zod';

import { entityRegistry } from '../registry.js';

/**
 * Registers all stub entity plugins (mail, push, reminder, prompt) with the global registry.
 *
 * Must be called before the HTTP server starts accepting requests.
 */
export function registerStubEntityPlugins(): void {
  entityRegistry.register({
    kind: 'mail',
    providers: ['resend', 'sendgrid'],
    direction: 'outbound',
    interactive: false,
    payloadSchema: z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string(),
      provider: z.enum(['resend', 'sendgrid']).default('resend'),
    }),
  });

  entityRegistry.register({
    kind: 'push',
    providers: ['fcm', 'apns'],
    direction: 'outbound',
    interactive: false,
    payloadSchema: z.object({
      deviceToken: z.string(),
      title: z.string(),
      body: z.string(),
      provider: z.enum(['fcm', 'apns']),
    }),
  });

  entityRegistry.register({
    kind: 'reminder',
    providers: ['inline-http'],
    direction: 'outbound',
    interactive: false,
    payloadSchema: z.object({
      message: z.string(),
      scheduledAt: z.string().datetime(),
    }),
  });

  entityRegistry.register({
    kind: 'prompt',
    providers: ['sse'],
    direction: 'bidirectional',
    interactive: true,
    payloadSchema: z.object({
      message: z.string(),
      options: z.array(z.string()).optional(),
    }),
  });
}
