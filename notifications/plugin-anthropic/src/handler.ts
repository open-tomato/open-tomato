/**
 * Inbound webhook handler for Claude Code hook events.
 *
 * Parses the raw request body with {@link ClaudeCodeEventSchema}, extracts
 * the `sourceId` from the envelope, and returns a {@link NormalizedEvent}
 * ready for persistence by `services/notifications`.
 */
import type { HandleResult, NormalizedEvent } from './types.js';

import { ClaudeCodeEventSchema } from './schema.js';

export type { HandleResult } from './types.js';

/**
 * Parses a raw webhook body and normalizes it into the event envelope
 * expected by the notification service persistence layer.
 *
 * @param body - The raw JSON body received from a Claude Code hook caller.
 *               Must include a `sourceId` string plus fields matching one of
 *               the {@link ClaudeCodeEventSchema} variants.
 * @returns A discriminated result — either a normalized event or an error string.
 */
export function handleInboundWebhook(body: unknown): HandleResult {
  if (body === null || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const record = body as Record<string, unknown>;

  if (typeof record['sourceId'] !== 'string' || record['sourceId'].length === 0) {
    return { ok: false, error: 'Missing or empty "sourceId" field' };
  }

  const sourceId = record['sourceId'] as string;

  // Strip sourceId from the payload before schema validation —
  // it belongs to the envelope, not the hook event.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure to omit from eventFields
  const { sourceId: _envelope, ...eventFields } = record;

  const parsed = ClaudeCodeEventSchema.safeParse(eventFields);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid Claude Code event payload: ${JSON.stringify(parsed.error.issues)}`,
    };
  }

  const event: NormalizedEvent = {
    entityKind: 'anthropic',
    sourceId,
    eventType: parsed.data.hook_event_name,
    payload: parsed.data as unknown as Record<string, unknown>,
  };

  return { ok: true, event };
}
