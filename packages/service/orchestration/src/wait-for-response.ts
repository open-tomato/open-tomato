import { sleep } from './sleep.js';

/**
 * Module-level store for pending human responses.
 * Used by the convenience helpers {@link setPendingResponse} and
 * {@link clearPendingResponses}; callers that own their own map
 * (e.g. {@link BaseRobotService}) pass it directly to
 * {@link waitForResponse}.
 */
const defaultPendingResponses: Map<string, string> = new Map();

/**
 * Records a response in the module-level pending map so that a blocked
 * {@link waitForResponse} call (using the default map) can pick it up on
 * its next poll cycle.
 *
 * @param sessionId - The session the response belongs to.
 * @param text - The human-provided response text.
 */
export function setPendingResponse(sessionId: string, text: string): void {
  defaultPendingResponses.set(sessionId, text);
}

/**
 * Clears the module-level pending responses map.
 * Intended for test teardown only.
 */
export function clearPendingResponses(): void {
  defaultPendingResponses.clear();
}

/**
 * Polls a pending-responses map until a value appears for the given
 * session, the timeout expires, or the shutdown signal fires.
 *
 * The matched entry is deleted from the map before returning, so each
 * response is consumed exactly once.
 *
 * @param pendingResponses - The map to poll.  Defaults to the module-level
 *   map used by {@link setPendingResponse}.
 * @param sessionId - The session to wait for.
 * @param timeoutMs - Maximum time (in ms) to wait before returning `null`.
 * @param pollIntervalMs - How often (in ms) to check for a response.
 * @param shutdownSignal - An {@link AbortSignal} that, when aborted, causes
 *   the function to return `null` immediately.
 * @returns The response text, or `null` on timeout / shutdown.
 *
 * @example
 * ```typescript
 * const pending = new Map<string, string>();
 * const ac = new AbortController();
 *
 * // In a transport handler:
 * pending.set('session-1', 'Approved');
 *
 * // In the orchestration loop:
 * const reply = await waitForResponse(pending, 'session-1', 30_000, 250, ac.signal);
 * // => 'Approved'
 * ```
 *
 * @see {@link BaseRobotService} which owns the pending-responses map for its transport.
 */
export async function waitForResponse(
  pendingResponses: Map<string, string>,
  sessionId: string,
  timeoutMs: number,
  pollIntervalMs: number,
  shutdownSignal: AbortSignal,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (shutdownSignal.aborted) return null;

    const response = pendingResponses.get(sessionId);
    if (response !== undefined) {
      pendingResponses.delete(sessionId);
      return response;
    }

    await sleep(pollIntervalMs);
  }

  return null;
}
