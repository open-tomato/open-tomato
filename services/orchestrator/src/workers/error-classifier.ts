/**
 * Classifies subprocess exit errors into actionable categories for the fallback chain.
 *
 * The classification drives retry vs propagate decisions:
 * - `auth_failure` and `task_error` propagate immediately (retrying won't help)
 * - `rate_limit` and `unknown` trigger circuit-breaker increment and fallback to next backend
 */

/** Outcome of `classifyExitError` — determines fallback chain behavior. */
export type ErrorClass = 'auth_failure' | 'rate_limit' | 'task_error' | 'unknown';

const AUTH_FAILURE_EXIT_CODE = 41;
const AUTH_PATTERN = /auth|401/i;
const RATE_LIMIT_PATTERN = /\b429\b|rate.limit|usage.limit|quota exceeded|resource.exhausted|overloaded/i;
const TASK_ERROR_PATTERN = /\b400\b|invalid request|context.(?:length|window)/i;

/**
 * Classify a subprocess failure into one of four error categories.
 *
 * Priority order (highest to lowest):
 * 1. `auth_failure` — exit code 41 or stderr matches auth/401 pattern
 * 2. `rate_limit` — stderr matches 429/rate limit/quota pattern
 * 3. `task_error` — stderr matches 400/invalid request/context length pattern
 * 4. `unknown` — default retryable fallthrough
 *
 * @param exitCode - Process exit code, or `null` if the process was killed.
 * @param stderrText - Accumulated stderr output from the subprocess.
 * @returns The error class for this failure.
 */
export function classifyExitError(exitCode: number | null, stderrText: string): ErrorClass {
  if (exitCode === AUTH_FAILURE_EXIT_CODE || AUTH_PATTERN.test(stderrText)) {
    return 'auth_failure';
  }

  if (RATE_LIMIT_PATTERN.test(stderrText)) {
    return 'rate_limit';
  }

  if (TASK_ERROR_PATTERN.test(stderrText)) {
    return 'task_error';
  }

  return 'unknown';
}
