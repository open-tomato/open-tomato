import type { IncomingMessage } from '@open-tomato/types';

/**
 * Determines which orchestration session an incoming message belongs to.
 *
 * Resolution order (first match wins):
 * 1. `@loop-id` prefix in the message text (e.g. `@deploy check status`).
 * 2. `replyToSessionId` field set by the transport when the message is a
 *    reply to a bot-sent message.
 * 3. The provided {@link defaultId} (falls back to `'main'`).
 *
 * @param message - The incoming message to route.
 * @param defaultId - Fallback session ID when no other signal is present.
 * @returns The resolved session ID.
 *
 * @example
 * ```typescript
 * resolveSessionId({ text: '@deploy check status' });
 * // => 'deploy'
 *
 * resolveSessionId({ text: 'looks good', replyToSessionId: 'build-42' });
 * // => 'build-42'
 *
 * resolveSessionId({ text: 'hello' });
 * // => 'main'
 * ```
 *
 * @see {@link SessionRegistry} for routing resolved IDs to their service instances.
 */
export function resolveSessionId(
  message: IncomingMessage,
  defaultId: string = 'main',
): string {
  const prefixMatch = message.text.match(/^@([\w-]+)\s/);
  if (prefixMatch?.[1]) return prefixMatch[1];

  if (message.replyToSessionId) return message.replyToSessionId;

  return defaultId;
}
