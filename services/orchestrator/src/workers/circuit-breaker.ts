/**
 * Per-backend circuit breaker for the fallback chain.
 *
 * Tracks consecutive failures per backend name and opens the circuit
 * (marking the backend as unavailable) once a configurable failure
 * threshold is reached. After a cool-down window the circuit transitions
 * to half-open, allowing a single probe attempt.
 *
 * The fallback coordinator calls `isOpen()` when selecting the next
 * eligible backend, `recordFailure()` after a retryable error, and
 * `recordSuccess()` after a successful execution.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Snapshot of a single backend's circuit state. */
interface BackendCircuitState {
  /** Number of consecutive failures recorded. */
  readonly failures: number;
  /** Timestamp when the circuit opened, or `null` if closed. */
  readonly openedAt: number | null;
}

/** Configuration options for the {@link CircuitBreaker}. */
interface CircuitBreakerOptions {
  /** Number of consecutive failures before the circuit opens. */
  readonly failureThreshold: number;
  /** Milliseconds to wait before allowing a half-open probe. */
  readonly coolDownMs: number;
}

// ---------------------------------------------------------------------------
// CircuitBreaker
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 3,
  coolDownMs: 60_000,
};

/**
 * Per-backend circuit breaker that tracks consecutive failures and
 * temporarily marks backends as unavailable after a configurable threshold.
 *
 * After the cool-down window elapses, the circuit transitions to half-open,
 * allowing a single probe attempt to determine if the backend has recovered.
 */
export class CircuitBreaker {
  private readonly states = new Map<string, BackendCircuitState>();
  private readonly options: CircuitBreakerOptions;
  private readonly now: () => number;

  constructor(
    options: Partial<CircuitBreakerOptions> = {},
    /** Injectable clock for deterministic testing. */
    now: () => number = Date.now,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.now = now;
  }

  /**
   * Returns `true` when the backend's circuit is open **and** the cool-down
   * window has not yet elapsed.
   *
   * Once the cool-down expires the circuit is considered half-open — `isOpen`
   * returns `false` so the coordinator may attempt a single probe request.
   */
  isOpen(backendName: string): boolean {
    const state = this.states.get(backendName);

    if (state === undefined || state.openedAt === null) {
      return false;
    }

    const elapsed = this.now() - state.openedAt;

    if (elapsed >= this.options.coolDownMs) {
      // Half-open: allow one probe attempt
      return false;
    }

    return true;
  }

  /**
   * Increments the consecutive failure count for the backend.
   * Opens the circuit when the failure threshold is reached.
   */
  recordFailure(backendName: string): void {
    const current = this.states.get(backendName) ?? {
      failures: 0,
      openedAt: null,
    };

    const failures = current.failures + 1;

    this.states.set(backendName, {
      failures,
      openedAt:
        failures >= this.options.failureThreshold
          ? this.now()
          : current.openedAt,
    });
  }

  /**
   * Resets the failure count and closes the circuit for the backend.
   * Called after a successful execution (including a half-open probe).
   */
  recordSuccess(backendName: string): void {
    this.states.set(backendName, { failures: 0, openedAt: null });
  }
}

export type { BackendCircuitState, CircuitBreakerOptions };
