import { BackpressureValidator } from './backpressure-validator';
import { BudgetTracker } from './budget-tracker';
import { FailureTracker } from './failure-tracker';
import { StaleDetector } from './stale-detector';
import { ThrottleTracker } from './throttle-tracker';
import { TERMINATION_EXIT_CODES, TerminationReason, TerminationResult } from './types';

/**
 * Configuration options for {@link TerminationChecker}.
 */
export interface TerminationCheckerConfig {
  /** Maximum number of loop iterations before the loop is forced to stop. */
  maxIterations: number;
  /** Maximum elapsed runtime in milliseconds before the loop is forced to stop. */
  maxRuntimeMs: number;
  /** Maximum cumulative cost in USD before the loop is forced to stop. */
  maxCostUsd: number;
  /** Maximum number of consecutive process failures before the loop is forced to stop. */
  maxConsecutiveFailures: number;
  /** Timestamp (from `Date.now()`) recorded at loop start, used to compute elapsed time. */
  startTime: number;
}

/**
 * Composes all loop-safety detectors and evaluates the termination decision
 * tree on every iteration.
 *
 * Decision tree order (first match wins):
 * 1. MaxCost
 * 2. MaxIterations
 * 3. MaxRuntime
 * 4. ConsecutiveFailures
 * 5. LoopStale
 * 6. LoopThrashing
 * 7. ValidationFailure
 * 8. WorkspaceGone
 * 9. Continue (no termination)
 *
 * @remarks
 * `StaleDetector` and `BackpressureValidator` do not expose a polling-style
 * `isExceeded()` method — they signal state changes via return values on each
 * event call. Use {@link recordEvent} and {@link validateJsonl} to route events
 * through this checker so it can cache those signals for the next {@link check}.
 */
export class TerminationChecker {
  private staleTriggered = false;
  private validationFailureTriggered = false;

  constructor(
    private readonly config: TerminationCheckerConfig,
    private readonly budgetTracker: BudgetTracker,
    private readonly failureTracker: FailureTracker,
    private readonly staleDetector: StaleDetector,
    private readonly throttleTracker: ThrottleTracker,
    private readonly backpressureValidator: BackpressureValidator,
    private readonly workspaceExists: () => boolean | Promise<boolean>,
  ) {}

  /**
   * Evaluate all termination conditions for the current loop iteration.
   *
   * @param iteration - The current (1-based) iteration number.
   * @returns A {@link TerminationResult} with `shouldTerminate: false` when the
   *   loop should continue, or with `reason`, `exitCode`, and `detail` populated
   *   for the first matched termination condition.
   */
  async check(iteration: number): Promise<TerminationResult> {
    if (this.budgetTracker.isExceeded()) {
      return this.terminate(
        TerminationReason.MaxCost,
        `Accumulated cost $${this.budgetTracker.totalCost.toFixed(4)} exceeded limit $${this.config.maxCostUsd}`,
      );
    }

    if (iteration >= this.config.maxIterations) {
      return this.terminate(
        TerminationReason.MaxIterations,
        `Iteration ${iteration} reached the maximum of ${this.config.maxIterations}`,
      );
    }

    const elapsedMs = Date.now() - this.config.startTime;
    if (elapsedMs > this.config.maxRuntimeMs) {
      return this.terminate(
        TerminationReason.MaxRuntime,
        `Elapsed time ${elapsedMs}ms exceeded limit ${this.config.maxRuntimeMs}ms`,
      );
    }

    if (this.failureTracker.isExceeded()) {
      return this.terminate(
        TerminationReason.ConsecutiveFailures,
        `Consecutive failure threshold of ${this.config.maxConsecutiveFailures} exceeded`,
      );
    }

    if (this.staleTriggered) {
      return this.terminate(
        TerminationReason.LoopStale,
        'Loop stale: consecutive identical event signatures detected',
      );
    }

    if (this.throttleTracker.isThrashing()) {
      return this.terminate(
        TerminationReason.LoopThrashing,
        'Loop thrashing: abandoned tasks redispatched too many times',
      );
    }

    if (this.validationFailureTriggered) {
      return this.terminate(
        TerminationReason.ValidationFailure,
        'Validation failure: consecutive malformed JSONL threshold exceeded',
      );
    }

    const exists = await this.workspaceExists();
    if (!exists) {
      return this.terminate(
        TerminationReason.WorkspaceGone,
        'Workspace directory no longer exists',
      );
    }

    return { shouldTerminate: false };
  }

  /**
   * Delegate a stale-detection record call to the underlying {@link StaleDetector}.
   *
   * Call this on every loop event. When the stale threshold is reached, the
   * next call to {@link check} will return a `LoopStale` termination result.
   *
   * @param topic - The event topic.
   * @param source - The originating agent or component identifier.
   * @param payloadFingerprint - A stable fingerprint of the event payload.
   */
  recordEvent(topic: string, source: string, payloadFingerprint: string): void {
    const triggered = this.staleDetector.record(topic, source, payloadFingerprint);
    if (triggered) {
      this.staleTriggered = true;
    }
  }

  /**
   * Delegate a JSONL validation call to the underlying {@link BackpressureValidator}.
   *
   * When three consecutive malformed lines have been recorded, the next call
   * to {@link check} will return a `ValidationFailure` termination result.
   *
   * @param raw - The raw JSONL line to validate.
   * @returns `null` when valid, or an error string when malformed.
   */
  validateJsonl(raw: string): string | null {
    const error = this.backpressureValidator.validateJsonl(raw);
    if (error !== null) {
      const exceeded = this.backpressureValidator.recordMalformed();
      if (exceeded) {
        this.validationFailureTriggered = true;
      }
    } else {
      this.backpressureValidator.recordValid();
    }
    return error;
  }

  private terminate(reason: TerminationReason, detail: string): TerminationResult {
    return {
      shouldTerminate: true,
      reason,
      exitCode: TERMINATION_EXIT_CODES[reason],
      detail,
    };
  }
}
