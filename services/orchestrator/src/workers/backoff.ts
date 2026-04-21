/**
 * Exponential backoff utility for the fallback chain.
 *
 * Pure timing policy — not aware of BackendDescriptor, ErrorClass, or
 * WorkerClient. The fallback coordinator wraps its retry loop in
 * `withExponentialBackoff`; this module only controls inter-attempt delays.
 */

// ---------------------------------------------------------------------------
// BackoffOptions
// ---------------------------------------------------------------------------

/**
 * Configuration for a single withExponentialBackoff invocation.
 */
export interface BackoffOptions {
  /**
   * Maximum number of retries (not total attempts).
   *
   * Total attempts = maxRetries + 1.
   * When all retries are exhausted the error from the last attempt is
   * re-thrown regardless of shouldRetry.
   *
   * Typical value for a two-backend chain: 1 (one retry = two attempts total).
   * Typical value for a three-backend chain: 2.
   */
  maxRetries: number;

  /**
   * Delay before the first retry, in milliseconds.
   *
   * Subsequent delays are computed as baseDelayMs * factor^attempt.
   *
   * Suggested default: 500 ms (half a second before the first fallback
   * attempt; fast enough not to stall a task, long enough to avoid
   * hammering a rate-limited API immediately).
   */
  baseDelayMs: number;

  /**
   * Multiplicative factor applied to baseDelayMs on each successive attempt.
   *
   * Suggested default: 2 (delays double each attempt:
   * attempt 0 → baseDelayMs, attempt 1 → 2×baseDelayMs, attempt 2 → 4×baseDelayMs).
   */
  factor: number;

  /**
   * Jitter factor as a fraction of the computed delay (0–1).
   *
   * Applied as: `delay * (1 + jitter * (Math.random() * 2 - 1))`,
   * producing a uniform spread of ±jitter around the base delay.
   * This prevents thundering-herd if multiple executor nodes encounter
   * rate-limits simultaneously.
   *
   * Suggested default: 0.2 (±20% jitter).
   * Set to 0 to disable jitter (useful in tests for deterministic timing).
   */
  jitter: number;

  /**
   * Predicate that decides whether a thrown error should trigger a retry.
   *
   * The coordinator passes a function that returns true only for
   * 'rate_limit' and 'unknown' error classes. 'auth_failure' and 'task_error'
   * return false — those errors propagate immediately without waiting.
   *
   * If omitted, all errors trigger a retry (up to maxRetries).
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

// ---------------------------------------------------------------------------
// withExponentialBackoff
// ---------------------------------------------------------------------------

/**
 * Calls fn() up to options.maxRetries + 1 times, applying an exponentially
 * increasing delay between attempts.
 *
 * Returns the first successful result of fn(). Re-throws the error from the
 * last attempt if all retries are exhausted or if shouldRetry returns false.
 *
 * This is a pure async utility — it has no knowledge of WorkerClient,
 * BackendDescriptor, or any executor-specific type.
 *
 * Usage inside MultiBackendWorkerClient:
 *
 *   return withExponentialBackoff(
 *     () => selectAndCallBackend(backends, prompt, workDir),
 *     {
 *       maxRetries: backends.length - 1,
 *       baseDelayMs: 500,
 *       factor: 2,
 *       jitter: 0.2,
 *       shouldRetry: (err) => classifyError(err) === 'rate_limit'
 *                          || classifyError(err) === 'unknown',
 *     }
 *   );
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: BackoffOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs, factor, jitter, shouldRetry } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = shouldRetry
        ? shouldRetry(err, attempt)
        : true;

      if (!isRetryable || attempt >= maxRetries) {
        throw err;
      }

      const baseDelay = baseDelayMs * Math.pow(factor, attempt);
      const delay = jitter > 0
        ? baseDelay * (1 + jitter * (Math.random() * 2 - 1))
        : baseDelay;

      await sleep(delay);
      attempt++;
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
