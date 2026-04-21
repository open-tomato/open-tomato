/**
 * @packageDocumentation
 * Webhook entity plugin — full implementation.
 *
 * When an event of kind `webhook` is received, the hub makes an outbound
 * HTTP request to the configured URL. No external credentials required.
 *
 * Payload fields:
 *   url     — destination URL (required)
 *   method  — HTTP verb (default: POST)
 *   headers — optional key/value request headers
 *   body    — optional request body (JSON-serialised)
 *
 * Delivery is fire-and-forget from the caller's perspective. Non-2xx
 * responses and network errors are surfaced in the hub's error log
 * (see routes/events.ts deliver error handler) but do not cause a
 * retry in Phase 7 — retry / dead-letter queue is deferred to Phase 8+.
 */
import { z } from 'zod';

import { entityRegistry } from '../registry.js';

const WebhookPayloadSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
});

type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

/**
 * Registers the webhook entity plugin with the global registry.
 *
 * Must be called before the HTTP server starts accepting requests.
 */
export function registerWebhookEntityPlugin(): void {
  entityRegistry.register({
    kind: 'webhook',
    providers: ['inline-http'],
    direction: 'outbound',
    interactive: false,
    payloadSchema: WebhookPayloadSchema,

    async deliver(payload: Record<string, unknown>): Promise<void> {
      const parsed = WebhookPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(`[webhook] invalid payload: ${JSON.stringify(parsed.error.issues)}`);
      }

      const { url, method, headers, body }: WebhookPayload = parsed.data;

      const hasBody = body !== undefined && method !== 'GET';
      const res = await fetch(url, {
        method,
        headers: {
          ...(hasBody
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...(headers ?? {}),
        },
        body: hasBody
          ? JSON.stringify(body)
          : undefined,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `[webhook] delivery failed: ${method} ${url} → HTTP ${res.status} ${text.slice(0, 200)}`,
        );
      }
    },
  });
}
