import { createHash } from 'crypto';

/**
 * Configuration options for {@link StaleDetector}.
 */
export interface StaleDetectorConfig {
  /** Number of consecutive identical signatures before stale is declared. Default: 3. */
  threshold: number;
  /**
   * Topics that are excluded from stale detection and never increment the counter.
   * Default: `['task.complete']`.
   */
  excludedTopics?: string[];
}

const DEFAULT_CONFIG: Required<StaleDetectorConfig> = {
  threshold: 3,
  excludedTopics: ['task.complete'],
};

/**
 * Detects when the orchestration loop emits consecutive identical event
 * signatures, which indicates the loop has stalled on the same output.
 *
 * A signature is a SHA-1 hash of `topic + source + payloadFingerprint`.
 * Topics listed in `excludedTopics` are silently skipped without affecting
 * the counter.
 *
 * When the same signature appears `threshold` times in a row,
 * {@link record} returns `true` to signal that termination should be
 * considered.
 */
export class StaleDetector {
  private readonly config: Required<StaleDetectorConfig>;
  private lastSignature: string | null = null;
  private consecutiveCount = 0;

  constructor(config: Partial<StaleDetectorConfig> = {}) {
    this.config = {
      threshold: config.threshold ?? DEFAULT_CONFIG.threshold,
      excludedTopics: config.excludedTopics ?? DEFAULT_CONFIG.excludedTopics,
    };
  }

  /**
   * Compute the event signature and update the consecutive-match counter.
   *
   * @param topic - The event topic (e.g. `'build.blocked'`).
   * @param source - The originating agent or component identifier.
   * @param payloadFingerprint - A stable fingerprint of the event payload.
   * @returns `true` when the stale threshold is reached on this call;
   *   `false` otherwise, including when the topic is excluded.
   */
  record(topic: string, source: string, payloadFingerprint: string): boolean {
    if (this.config.excludedTopics.includes(topic)) {
      return false;
    }

    const signature = this.computeSignature(topic, source, payloadFingerprint);

    if (signature === this.lastSignature) {
      this.consecutiveCount += 1;
    } else {
      this.lastSignature = signature;
      this.consecutiveCount = 1;
    }

    return this.consecutiveCount >= this.config.threshold;
  }

  /**
   * Reset the stale counter and last-seen signature.
   *
   * Call this whenever a new hat (orchestrator role) activation occurs to
   * avoid false positives across distinct execution phases.
   */
  resetOnHatActivation(): void {
    this.lastSignature = null;
    this.consecutiveCount = 0;
  }

  /**
   * Compute a stable SHA-1 hex digest for the combination of topic, source,
   * and payload fingerprint.
   */
  private computeSignature(
    topic: string,
    source: string,
    payloadFingerprint: string,
  ): string {
    return createHash('sha1')
      .update(`${topic}\x00${source}\x00${payloadFingerprint}`)
      .digest('hex');
  }
}
