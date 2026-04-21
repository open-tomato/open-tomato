/**
 * @packageDocumentation
 * Core types for the hook lifecycle system.
 *
 * Hooks are external commands that receive a JSON payload via stdin and
 * communicate intent through exit code and stdout. The system supports
 * 12 lifecycle points (pre/post for each of the 6 orchestration events)
 * and three failure modes: warn, block, and suspend.
 */

/**
 * All 12 lifecycle points at which hooks may be registered.
 * Each event has a `pre` gate (before execution) and a `post` gate (after execution).
 */
export type HookPhase =
  | 'pre.loop.start'
  | 'post.loop.start'
  | 'pre.iteration.start'
  | 'post.iteration.start'
  | 'pre.plan.created'
  | 'post.plan.created'
  | 'pre.human.interact'
  | 'post.human.interact'
  | 'pre.loop.complete'
  | 'post.loop.complete'
  | 'pre.loop.error'
  | 'post.loop.error';

/**
 * Determines how the orchestration engine responds when a hook exits with a non-zero code.
 *
 * - `warn`: Log a warning and continue execution.
 * - `block`: Halt the current loop iteration and terminate with a non-zero exit.
 * - `suspend`: Pause the orchestration loop and persist state for later recovery.
 */
export type HookOnError = 'warn' | 'block' | 'suspend';

/**
 * Strategy used to resume a suspended orchestration loop.
 *
 * - `WaitForResume`: Poll for a `.ralph/resume-requested` signal file; resume when it appears.
 * - `RetryBackoff`: Retry the hook with exponential backoff until it succeeds or retries are exhausted.
 * - `WaitThenRetry`: Wait for the resume signal file, then retry the hook exactly once.
 */
export type HookSuspendMode = 'WaitForResume' | 'RetryBackoff' | 'WaitThenRetry';

/**
 * Configuration for a single hook registered at one or more lifecycle phases.
 */
export interface HookSpec {
  /** Human-readable identifier for this hook, used in logs and telemetry. */
  name: string;
  /** Executable command to spawn. Must be accessible from `cwd` or system PATH. */
  command: string;
  /** Optional arguments passed to the command. */
  args?: string[];
  /** Working directory for the spawned process. Defaults to the orchestrator's cwd. */
  cwd?: string;
  /** Additional environment variables merged into the spawned process environment. */
  env?: Record<string, string>;
  /** Maximum milliseconds to wait before sending SIGKILL to the hook process. */
  timeoutMs: number;
  /** Failure mode applied when the hook exits with a non-zero code. */
  on_error: HookOnError;
  /** Recovery strategy used when `on_error` is `'suspend'`. */
  suspend_mode?: HookSuspendMode;
  /** When set with `enabled: true`, the hook's JSON stdout is merged into loop metadata. */
  mutate?: {
    /** Whether to apply the hook's stdout JSON as a metadata mutation. */
    enabled: boolean;
  };
  /** Maximum bytes to capture from stdout and stderr. Defaults to 65,536. */
  max_output_bytes?: number;
}

/**
 * JSON payload delivered to a hook via stdin for each invocation.
 */
export interface HookPayload {
  /** Current loop iteration index (1-based). */
  iteration: number;
  /** Identifier of the active hat (agent role or context). */
  hat: string;
  /** Sequence of events that have occurred in the current iteration. */
  events: unknown[];
  /** Accumulated metadata from prior hooks in the current phase chain. */
  metadata: Record<string, unknown>;
}

/**
 * Result produced after a single hook invocation completes.
 */
export interface HookResult {
  /** Name of the hook that produced this result. */
  hookName: string;
  /** Lifecycle phase at which the hook was invoked. */
  phase: HookPhase;
  /** Process exit code, or null if the process was killed (e.g. timeout). */
  exitCode: number | null;
  /** Captured stdout, truncated at `max_output_bytes`. */
  stdout: string;
  /** Captured stderr, truncated at `max_output_bytes`. */
  stderr: string;
  /** Wall-clock duration of the hook invocation in milliseconds. */
  durationMs: number;
  /**
   * Orchestration action determined from the exit code and `on_error` mode:
   * - `continue`: Hook succeeded or failure was non-blocking.
   * - `warn`: Hook failed with `on_error: 'warn'`.
   * - `block`: Hook failed with `on_error: 'block'`.
   * - `suspend`: Hook failed with `on_error: 'suspend'`.
   * - `timeout`: Hook was killed after exceeding `timeoutMs`.
   */
  disposition: 'continue' | 'warn' | 'block' | 'suspend' | 'timeout';
  /** Metadata patch parsed from stdout JSON when `mutate.enabled` is true. */
  mutationApplied?: Record<string, unknown>;
}

/**
 * Persisted state written to disk when the orchestration loop is suspended.
 * Recovered at startup to resume execution from the point of suspension.
 */
export interface SuspendState {
  /** Lifecycle phase at which suspension occurred. */
  phase: HookPhase;
  /** Name of the hook that triggered suspension. */
  hookName: string;
  /** Payload that was active at the time of suspension. */
  payload: HookPayload;
  /** Recovery strategy to apply upon resume. */
  suspendMode: HookSuspendMode;
  /** ISO 8601 timestamp of when the suspension was recorded. */
  suspendedAt: string;
  /** Number of retry attempts made before this suspension was persisted. */
  retryCount: number;
}
