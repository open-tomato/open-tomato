import { sleep } from './sleep.js';

/**
 * Retries an async function with exponential backoff.
 *
 * Each retry waits `baseDelayMs * 2^(attempt - 1)` milliseconds before the
 * next attempt. If all attempts fail, the error from the last attempt is thrown.
 *
 * @param fn - The async function to execute.
 * @param maxAttempts - Maximum number of attempts (must be at least 1).
 * @param baseDelayMs - Base delay in milliseconds before the first retry.
 * @returns The resolved value of `fn`.
 * @throws The error from the final failed attempt when all retries are exhausted.
 *
 * @example
 * ```typescript
 * const result = await withExponentialBackoff(
 *   () => fetch(webhookUrl, { method: 'POST', body }),
 *   3,   // up to 3 attempts
 *   1000 // 1s, 2s, 4s between retries
 * );
 * ```
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs: number,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
