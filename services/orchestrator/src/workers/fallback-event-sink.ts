/**
 * Observability interface for the fallback chain.
 *
 * `FallbackEventSink` receives structured events at each decision point
 * in the `FallbackChainWorkerClient` loop — backend selection, failure,
 * fallback, exhaustion, and success. Implementations can log, emit
 * metrics, or forward to an external telemetry system.
 *
 * `ConsoleFallbackEventSink` is the default sink that logs events via
 * `console.info` / `console.warn` / `console.error`.
 */

import type { ErrorClass } from './error-classifier.js';

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

/** Emitted when a backend is selected for execution. */
export interface BackendSelectedEvent {
  readonly type: 'backend_selected';
  readonly backendName: string;
  readonly attempt: number;
  readonly timestamp: number;
}

/** Emitted when a backend fails (before fallback decision). */
export interface BackendFailedEvent {
  readonly type: 'backend_failed';
  readonly backendName: string;
  readonly errorClass: ErrorClass;
  readonly exitCode: number | null;
  readonly attempt: number;
  readonly timestamp: number;
}

/** Emitted when the chain falls back to the next backend. */
export interface BackendFallbackEvent {
  readonly type: 'backend_fallback';
  readonly failedBackend: string;
  readonly nextBackend: string;
  readonly errorClass: ErrorClass;
  readonly attempt: number;
  readonly timestamp: number;
}

/** Emitted when all backends are exhausted. */
export interface ChainExhaustedEvent {
  readonly type: 'chain_exhausted';
  readonly lastBackend: string;
  readonly lastErrorClass: ErrorClass;
  readonly totalAttempts: number;
  readonly timestamp: number;
}

/** Emitted when a backend succeeds. */
export interface ChainSuccessEvent {
  readonly type: 'chain_success';
  readonly backendName: string;
  readonly attempt: number;
  readonly durationMs: number;
  readonly timestamp: number;
}

/** Discriminated union of all fallback chain events. */
export type FallbackEvent =
  | BackendSelectedEvent
  | BackendFailedEvent
  | BackendFallbackEvent
  | ChainExhaustedEvent
  | ChainSuccessEvent;

// ---------------------------------------------------------------------------
// Sink interface
// ---------------------------------------------------------------------------

/** Receives structured fallback chain events for observability. */
export interface FallbackEventSink {
  emit(event: FallbackEvent): void;
}

// ---------------------------------------------------------------------------
// Console sink (default implementation)
// ---------------------------------------------------------------------------

/** Default sink that logs fallback events to the console. */
export class ConsoleFallbackEventSink implements FallbackEventSink {
  emit(event: FallbackEvent): void {
    switch (event.type) {
      case 'backend_selected':
        console.info(
          `[fallback] Selected backend '${event.backendName}' (attempt ${event.attempt})`,
        );
        break;
      case 'backend_failed':
        console.warn(
          `[fallback] Backend '${event.backendName}' failed [${event.errorClass}] (exit ${event.exitCode}, attempt ${event.attempt})`,
        );
        break;
      case 'backend_fallback':
        console.warn(
          `[fallback] Falling back from '${event.failedBackend}' to '${event.nextBackend}' [${event.errorClass}] (attempt ${event.attempt})`,
        );
        break;
      case 'chain_exhausted':
        console.error(
          `[fallback] All backends exhausted after ${event.totalAttempts} attempts (last: '${event.lastBackend}' [${event.lastErrorClass}])`,
        );
        break;
      case 'chain_success':
        console.info(
          `[fallback] Backend '${event.backendName}' succeeded in ${event.durationMs}ms (attempt ${event.attempt})`,
        );
        break;
    }
  }
}
