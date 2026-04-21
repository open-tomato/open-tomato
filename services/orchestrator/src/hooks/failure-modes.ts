/**
 * @packageDocumentation
 * Failure mode handlers for the hook lifecycle system.
 *
 * Each handler accepts a {@link HookResult} and returns a typed response
 * describing the orchestration action to take. Handlers are pure functions
 * with no dependency on executor internals — they may be tested independently
 * and composed freely by the engine layer.
 */

import type { Logger } from './executor.js';
import type { HookResult, HookSuspendMode, SuspendState } from './types.js';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

/** Returned when a hook failure is non-blocking and execution should continue. */
export interface FailureContinueResponse {
  readonly action: 'continue';
}

/** Returned when a hook failure should halt the current orchestration loop. */
export interface FailureBlockResponse {
  readonly action: 'block';
}

/** Returned when a hook failure has triggered a loop suspension. */
export interface FailureSuspendResponse {
  readonly action: 'suspend';
}

/** Union of all typed failure responses. */
export type FailureResponse =
  | FailureContinueResponse
  | FailureBlockResponse
  | FailureSuspendResponse;

// ---------------------------------------------------------------------------
// Minimal store interface (satisfied by SuspendStateStore)
// ---------------------------------------------------------------------------

/**
 * Minimal interface required by {@link handleSuspend}.
 * The concrete `SuspendStateStore` class satisfies this contract.
 */
export interface SuspendStatePersister {
  /** Persists the given suspend state to durable storage. */
  persist(state: SuspendState): Promise<void>;
}

// ---------------------------------------------------------------------------
// Suspend strategy types
// ---------------------------------------------------------------------------

/**
 * A function that executes a suspend recovery strategy for a given suspend state.
 * Accepts an optional `AbortSignal` to support cancellation.
 */
export type SuspendStrategyFn = (state: SuspendState, signal?: AbortSignal) => Promise<void>;

/**
 * Maps each {@link HookSuspendMode} to its corresponding strategy function.
 * Passed to {@link handleSuspend} to decouple dispatch from concrete implementations.
 */
export type SuspendStrategyMap = {
  readonly [K in HookSuspendMode]: SuspendStrategyFn;
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** Maximum characters of stderr included in a warn log excerpt. */
const STDERR_EXCERPT_LENGTH = 200;

/**
 * Handles a `warn` failure mode: logs a warning and allows execution to continue.
 *
 * @param result - The hook result that triggered this handler.
 * @param logger - Logger used to emit the warning.
 * @returns `{ action: 'continue' }` — the orchestration loop is unaffected.
 */
export function handleWarn(result: HookResult, logger: Logger): FailureContinueResponse {
  const stderrExcerpt = result.stderr.slice(0, STDERR_EXCERPT_LENGTH);
  logger.warn(
    `[hook:warn] hook="${result.hookName}" phase="${result.phase}" exitCode=${String(result.exitCode)} stderr="${stderrExcerpt}"`,
  );
  return { action: 'continue' };
}

/**
 * Handles a `block` failure mode: logs a full-context error and signals loop termination.
 *
 * @param result - The hook result that triggered this handler.
 * @param logger - Logger used to emit the error.
 * @returns `{ action: 'block' }` — the caller should terminate the loop with a non-zero exit.
 */
export function handleBlock(result: HookResult, logger: Logger): FailureBlockResponse {
  logger.error(
    `[hook:block] hook="${result.hookName}" phase="${result.phase}" exitCode=${String(result.exitCode)} durationMs=${String(result.durationMs)} stderr="${result.stderr}" stdout="${result.stdout}"`,
  );
  return { action: 'block' };
}

/**
 * Handles a `suspend` failure mode: persists suspend state, dispatches the
 * appropriate suspend strategy, and signals loop suspension.
 *
 * Calls {@link SuspendStatePersister.persist} to write the suspend state to disk,
 * then looks up the correct strategy in `strategies` based on `state.suspendMode`
 * and fires it asynchronously (fire-and-forget). The orchestration loop is
 * signalled to pause via the `{ action: 'suspend' }` return value; the strategy
 * runs in the background and resolves when the resume condition is met.
 *
 * @param result - The hook result that triggered this handler.
 * @param store - Persister used to save the suspend state.
 * @param state - Suspend state snapshot to persist.
 * @param strategies - Map from each suspend mode to its strategy function.
 * @param logger - Logger used to emit the suspension notice and strategy errors.
 * @returns `{ action: 'suspend' }` — the caller should pause the orchestration loop.
 */
export async function handleSuspend(
  result: HookResult,
  store: SuspendStatePersister,
  state: SuspendState,
  strategies: SuspendStrategyMap,
  logger: Logger,
): Promise<FailureSuspendResponse> {
  logger.warn(
    `[hook:suspend] hook="${result.hookName}" phase="${result.phase}" exitCode=${String(result.exitCode)} suspendMode="${state.suspendMode}" retryCount=${String(state.retryCount)}`,
  );
  await store.persist(state);

  const strategyFn = strategies[state.suspendMode];
  void strategyFn(state).catch((err: unknown) => {
    logger.error(
      `[hook:suspend] strategy "${state.suspendMode}" failed: ${err instanceof Error
        ? err.message
        : String(err)}`,
    );
  });

  return { action: 'suspend' };
}
