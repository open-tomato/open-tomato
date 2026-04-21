/**
 * @packageDocumentation
 * Hook engine — wires together HookExecutor, SuspendStateStore, and HookTelemetry.
 *
 * `HookEngine` is the primary orchestration entry point for the hook lifecycle
 * system. It maps lifecycle phases to hook specs, fires hooks at each phase,
 * logs results via telemetry, and manages suspend state persistence.
 */

import type { Logger } from './executor.js';
import type { HookPayload, HookPhase, HookResult, HookSpec, SuspendState } from './types.js';

import { HookExecutor } from './executor.js';
import { SuspendStateStore } from './suspend-state-store.js';
import { HookTelemetry } from './telemetry.js';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/**
 * Result returned by {@link HookEngine.fire} after all hooks for a phase
 * have been evaluated.
 */
export interface HookFireResult {
  /** Accumulated metadata produced by the hook chain for this phase. */
  metadata: Record<string, unknown>;
  /**
   * Final orchestration disposition for the phase:
   * - `continue`: All hooks passed; execution proceeds normally.
   * - `block`: A hook failed with `on_error: 'block'`; the loop should terminate.
   * - `suspend`: A hook failed with `on_error: 'suspend'`; the loop should pause.
   */
  disposition: 'continue' | 'block' | 'suspend';
}

// ---------------------------------------------------------------------------
// HookEngine
// ---------------------------------------------------------------------------

/**
 * Orchestration entry point for the hook lifecycle system.
 *
 * `HookEngine` manages the full lifecycle of hook firing at a given phase:
 * - Retrieves registered specs for the phase.
 * - Invokes each hook via `HookExecutor.runHook` in order.
 * - Logs each result via `HookTelemetry`.
 * - Halts the chain on `block` or `suspend` disposition.
 * - Persists suspend state via `SuspendStateStore` on suspension.
 *
 * @example
 * ```typescript
 * const engine = new HookEngine(executor, suspendStore, telemetry, console);
 * engine.registerHooks('pre.loop.start', specs);
 *
 * const result = await engine.fire('pre.loop.start', payload);
 * if (result.disposition === 'block') process.exit(1);
 * ```
 */
export class HookEngine {
  private readonly hookMap = new Map<HookPhase, HookSpec[]>();

  /**
   * @param executor - Hook executor used to invoke individual hook specs.
   * @param suspendStore - Store used to persist and recover suspend state.
   * @param telemetry - Telemetry sink used to log each hook result.
   * @param logger - Logger for warn/error output; defaults to `console`.
   */
  constructor(
    private readonly executor: HookExecutor,
    private readonly suspendStore: SuspendStateStore,
    private readonly telemetry: HookTelemetry,
    private readonly logger: Logger = console,
  ) {}

  /**
   * Constructs a {@link SuspendState} snapshot from the current phase context.
   *
   * Separates data construction from the orchestration loop in {@link fire}.
   *
   * @param phase - Lifecycle phase that triggered the suspension.
   * @param spec - Hook spec whose execution caused the suspension.
   * @param phasePayload - Payload that was delivered to the hook.
   * @returns A fully initialised `SuspendState` with `retryCount` set to 0.
   */
  private buildSuspendState(
    phase: HookPhase,
    spec: HookSpec,
    phasePayload: HookPayload,
  ): SuspendState {
    return {
      phase,
      hookName: spec.name,
      payload: phasePayload,
      suspendMode: spec.suspend_mode ?? 'WaitForResume',
      suspendedAt: new Date().toISOString(),
      retryCount: 0,
    };
  }

  /**
   * Associate hook specs with a lifecycle phase.
   *
   * Replaces any previously registered specs for the same phase.
   * Call before any `fire` invocations that reference the phase.
   *
   * @param phase - Lifecycle phase to register hooks for.
   * @param specs - Array of hook specifications to associate with the phase.
   */
  registerHooks(phase: HookPhase, specs: HookSpec[]): void {
    this.hookMap.set(phase, specs);
  }

  /**
   * Fire all hooks registered for `phase` in order.
   *
   * Metadata is accumulated across the hook chain; each hook receives the
   * merged metadata from all prior hooks in the phase. Telemetry is logged
   * for every hook result. The chain halts immediately on `block` or
   * `suspend` disposition without executing remaining hooks.
   *
   * On suspension, the current suspend state is persisted to
   * `SuspendStateStore` before returning.
   *
   * @param phase - Lifecycle phase to fire.
   * @param payload - Initial payload for the phase; `metadata` is used as the
   *   starting accumulated metadata for the hook chain.
   * @returns Final metadata and orchestration disposition for the phase.
   */
  async fire(phase: HookPhase, payload: HookPayload): Promise<HookFireResult> {
    const specs = this.hookMap.get(phase) ?? [];
    const accumulatedMetadata: Record<string, unknown> = { ...payload.metadata };

    for (const spec of specs) {
      const phasePayload: HookPayload = {
        ...payload,
        metadata: { ...accumulatedMetadata },
      };

      let result: HookResult;
      try {
        result = await this.executor.runHook(spec, phase, phasePayload, accumulatedMetadata);
      } catch (err: unknown) {
        const errMsg = err instanceof Error
          ? err.message
          : String(err);
        this.logger.error(
          `[engine] hook "${spec.name}" failed to execute at phase "${phase}": ${errMsg}`,
        );
        if (spec.on_error === 'warn') {
          continue;
        }
        return { metadata: accumulatedMetadata, disposition: 'block' };
      }

      try {
        await this.telemetry.logRun(result);
      } catch (err: unknown) {
        this.logger.warn(
          `[engine] telemetry logRun failed for hook "${spec.name}": ${err instanceof Error
            ? err.message
            : String(err)}`,
        );
      }

      if (result.disposition === 'block') {
        this.logger.error(
          `[engine] hook "${spec.name}" blocked phase "${phase}" — terminating loop`,
        );
        return { metadata: accumulatedMetadata, disposition: 'block' };
      }

      if (result.disposition === 'suspend') {
        const suspendState = this.buildSuspendState(phase, spec, phasePayload);
        try {
          await this.suspendStore.persist(suspendState);
          this.logger.warn(
            `[engine] hook "${spec.name}" suspended phase "${phase}" — state persisted`,
          );
        } catch (persistErr: unknown) {
          this.logger.warn(
            `[engine] hook "${spec.name}" suspended phase "${phase}" — failed to persist state: ${persistErr instanceof Error
              ? persistErr.message
              : String(persistErr)}`,
          );
        }

        return { metadata: accumulatedMetadata, disposition: 'suspend' };
      }
    }

    return { metadata: accumulatedMetadata, disposition: 'continue' };
  }

  /**
   * Attempt to recover a persisted suspend state from a previous run.
   *
   * Delegates to `SuspendStateStore.recover()`. Returns `null` when no
   * suspend state file is present, indicating the loop should start fresh.
   *
   * Call this at orchestration startup before entering the loop to support
   * resuming from a prior suspension.
   *
   * @returns The persisted `SuspendState`, or `null` if none exists.
   */
  async recoverFromSuspend(): Promise<SuspendState | null> {
    return this.suspendStore.recover();
  }
}
