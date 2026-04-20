/**
 * Lightweight HTTP client for emitting Claude Code hook events to the
 * notification service.
 *
 * Intended for use by `hook.sh` wrappers, typed SDKs, and any external
 * caller that needs to forward hook payloads without importing the full
 * plugin internals.
 */
import type { ClaudeCodeEvent } from './schema.js';

/**
 * Posts a Claude Code hook event to the notification service.
 *
 * @param baseUrl  - Root URL of the notification service (e.g. `http://localhost:3100`).
 * @param sourceId - Stable identifier for the event producer (machine name, session tag, etc.).
 * @param payload  - A validated Claude Code hook event matching {@link ClaudeCodeEvent}.
 * @throws {Error} When the HTTP response status is not in the 2xx range.
 */
export async function emitEvent(
  baseUrl: string,
  sourceId: string,
  payload: ClaudeCodeEvent,
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/events/anthropic`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, ...payload }),
  });

  if (!response.ok) {
    throw new Error(`emitEvent failed: ${response.status} ${response.statusText}`);
  }
}
