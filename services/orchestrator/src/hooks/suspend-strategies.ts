/**
 * @packageDocumentation
 * Suspend recovery strategy functions for the hook lifecycle system.
 *
 * Each strategy encapsulates a different approach to resuming a suspended
 * orchestration loop. Strategies are standalone async functions and may be
 * wired into a {@link SuspendStrategyMap} by the engine layer.
 *
 * All strategies accept an optional {@link AbortSignal} to support cancellation.
 */

import { unlink } from 'node:fs/promises';
import path from 'node:path';

/** Relative path to the resume signal file within `stateDir`. */
const RESUME_SIGNAL = '.ralph/resume-requested';

/**
 * Polls for the existence of `.ralph/resume-requested` in `stateDir` at the
 * given interval. Resolves when the signal file appears, then deletes it.
 *
 * @param stateDir - Directory to watch for the signal file.
 * @param pollIntervalMs - Polling interval in milliseconds.
 * @param signal - Optional AbortSignal to cancel the poll.
 * @throws {DOMException} With name `"AbortError"` if `signal` is aborted.
 */
export async function waitForResume(
  stateDir: string,
  pollIntervalMs: number,
  signal?: AbortSignal,
): Promise<void> {
  const signalPath = path.join(stateDir, RESUME_SIGNAL);

  while (true) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const exists = await Bun.file(signalPath).exists();
    if (exists) {
      break;
    }

    await delay(pollIntervalMs, signal);
  }

  try {
    await unlink(signalPath);
  } catch (err: unknown) {
    // File may have been deleted between exists() check and unlink — ignore ENOENT
    const isEnoent =
      typeof err === 'object' && err !== null && 'code' in err &&
      (err as { code: string }).code === 'ENOENT';
    if (!isEnoent) throw err;
  }
}

/**
 * Retries `retryFn` with exponential backoff.
 *
 * The delay before attempt `n` (0-based) is `baseDelayMs * 2^n`.
 * Resolves on the first successful call; throws after all retries are
 * exhausted with the error from the last attempt.
 *
 * @param retryFn - Async function to retry.
 * @param maxRetries - Maximum number of additional retry attempts after the
 *   initial call. A value of `2` means up to 3 total invocations.
 * @param baseDelayMs - Base delay in milliseconds applied before the first retry.
 * @param signal - Optional AbortSignal to cancel the retry loop.
 * @throws {DOMException} With name `"AbortError"` if `signal` is aborted.
 * @throws The error from the last failed attempt when retries are exhausted.
 */
export async function retryBackoff(
  retryFn: () => Promise<void>,
  maxRetries: number,
  baseDelayMs: number,
  signal?: AbortSignal,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      await retryFn();
      return;
    } catch (err: unknown) {
      lastError = err;

      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * 2 ** attempt;
        await delay(delayMs, signal);
      }
    }
  }

  throw lastError;
}

/**
 * Waits for the `.ralph/resume-requested` signal file using the same polling
 * logic as {@link waitForResume}, then invokes `retryFn` exactly once.
 *
 * @param stateDir - Directory to watch for the signal file.
 * @param retryFn - Async function to invoke after the signal is received.
 * @param pollIntervalMs - Polling interval in milliseconds.
 * @param signal - Optional AbortSignal to cancel the wait.
 * @throws {DOMException} With name `"AbortError"` if `signal` is aborted.
 */
export async function waitThenRetry(
  stateDir: string,
  retryFn: () => Promise<void>,
  pollIntervalMs: number,
  signal?: AbortSignal,
): Promise<void> {
  await waitForResume(stateDir, pollIntervalMs, signal);
  await retryFn();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns a promise that resolves after `ms` milliseconds.
 * Rejects immediately if `signal` is already aborted or fires during the wait.
 */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = (): void => {
      clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
