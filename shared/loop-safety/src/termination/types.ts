/**
 * Reasons that can cause the orchestration event loop to terminate.
 */
export enum TerminationReason {
  /** Loop completed normally — all tasks are done. Exit code 0. */
  Completed = 'Completed',
  /** Iteration count reached or exceeded the configured maximum. Exit code 2. */
  MaxIterations = 'MaxIterations',
  /** Elapsed runtime exceeded the configured maximum. Exit code 2. */
  MaxRuntime = 'MaxRuntime',
  /** Cumulative API cost exceeded the configured budget limit. Exit code 2. */
  MaxCost = 'MaxCost',
  /** Too many consecutive process failures without a successful outcome. Exit code 1. */
  ConsecutiveFailures = 'ConsecutiveFailures',
  /** Abandoned tasks were redispatched too many times, indicating a thrashing loop. Exit code 1. */
  LoopThrashing = 'LoopThrashing',
  /** Consecutive identical event signatures detected, indicating a stalled loop. Exit code 1. */
  LoopStale = 'LoopStale',
  /** Too many consecutive malformed JSONL lines in the event stream. Exit code 1. */
  ValidationFailure = 'ValidationFailure',
  /** The git worktree / workspace directory no longer exists on disk. Exit code 1. */
  WorkspaceGone = 'WorkspaceGone',
  /** Loop was interrupted by SIGINT or SIGTERM. Exit code 130. */
  Interrupted = 'Interrupted',
}

/**
 * Process exit codes associated with each termination reason.
 *
 * - `0` — clean completion
 * - `1` — loop safety violation (thrashing, stale, failures, workspace gone)
 * - `2` — budget/limit exceeded (iterations, runtime, cost)
 * - `130` — interrupted by signal (SIGINT/SIGTERM)
 */
export const TERMINATION_EXIT_CODES: Record<TerminationReason, number> = {
  [TerminationReason.Completed]: 0,
  [TerminationReason.MaxIterations]: 2,
  [TerminationReason.MaxRuntime]: 2,
  [TerminationReason.MaxCost]: 2,
  [TerminationReason.ConsecutiveFailures]: 1,
  [TerminationReason.LoopThrashing]: 1,
  [TerminationReason.LoopStale]: 1,
  [TerminationReason.ValidationFailure]: 1,
  [TerminationReason.WorkspaceGone]: 1,
  [TerminationReason.Interrupted]: 130,
};

/**
 * The result returned by `TerminationChecker.check` on every loop iteration.
 *
 * When `shouldTerminate` is `false` all other fields are absent.
 * When `shouldTerminate` is `true`, `reason`, `exitCode`, and `detail` are set.
 */
export interface TerminationResult {
  /** Whether the loop should stop after this iteration. */
  shouldTerminate: boolean;
  /** The reason the loop is being terminated (present only when `shouldTerminate` is `true`). */
  reason?: TerminationReason;
  /** The recommended process exit code (present only when `shouldTerminate` is `true`). */
  exitCode?: number;
  /** Human-readable detail explaining the termination trigger. */
  detail?: string;
}
