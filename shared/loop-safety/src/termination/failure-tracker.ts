/**
 * Configuration options for {@link FailureTracker}.
 */
export interface FailureTrackerConfig {
  /** Maximum number of consecutive failures before the limit is considered exceeded. */
  maxConsecutiveFailures: number;
}

/**
 * Tracks consecutive process failures in the orchestration event loop.
 *
 * A successful event resets the counter to zero. When the counter reaches
 * or exceeds `maxConsecutiveFailures`, {@link isExceeded} returns `true`
 * to signal that termination should be considered.
 */
export class FailureTracker {
  private consecutiveFailures = 0;

  constructor(private readonly config: FailureTrackerConfig) {}

  /**
   * Record a successful process outcome. Resets the consecutive failure counter to zero.
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Record a process failure. Increments the consecutive failure counter.
   *
   * @returns The updated consecutive failure count after this call.
   */
  recordFailure(): number {
    return ++this.consecutiveFailures;
  }

  /**
   * Returns `true` when the consecutive failure count has reached or exceeded
   * the configured threshold; `false` otherwise.
   */
  isExceeded(): boolean {
    return this.consecutiveFailures >= this.config.maxConsecutiveFailures;
  }
}
