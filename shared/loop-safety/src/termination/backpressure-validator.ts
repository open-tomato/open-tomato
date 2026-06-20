/**
 * Represents build quality evidence attached to a `build.done` event.
 *
 * Each field is optional; when present it must be one of `'pass'`, `'fail'`, or `'skip'`.
 * At least one field must be present for the evidence to be considered valid.
 */
export interface BuildEvidence {
  /** Result of the test suite run. */
  tests?: 'pass' | 'fail' | 'skip';
  /** Result of the lint check. */
  lint?: 'pass' | 'fail' | 'skip';
  /** Result of the TypeScript type-check. */
  typecheck?: 'pass' | 'fail' | 'skip';
}

/** Number of consecutive malformed JSONL lines that triggers the threshold. */
const MALFORMED_THRESHOLD = 3;

/**
 * Validates JSONL payloads and build evidence in the orchestration event loop.
 *
 * Tracks consecutive malformed JSONL records and raises a flag when the count
 * reaches the configured threshold. Build evidence validation is stateless —
 * each call to {@link validateBuildEvidence} is independent.
 */
export class BackpressureValidator {
  private malformedCount = 0;

  /**
   * Attempt to parse `raw` as a single JSON value (JSONL line).
   *
   * @returns `null` when the input is valid JSON, or a descriptive error string
   *   when it is malformed.
   */
  validateJsonl(raw: string): string | null {
    try {
      JSON.parse(raw);
      return null;
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : String(err);
      return `Invalid JSONL: ${message}`;
    }
  }

  /**
   * Increment the consecutive malformed counter.
   *
   * @returns `true` when the malformed count has reached or exceeded the
   *   threshold (3 consecutive malformed lines), `false` otherwise.
   */
  recordMalformed(): boolean {
    this.malformedCount += 1;
    return this.malformedCount >= MALFORMED_THRESHOLD;
  }

  /**
   * Record a valid JSONL line. Resets the consecutive malformed counter to zero.
   */
  recordValid(): void {
    this.malformedCount = 0;
  }

  /**
   * Validate build evidence attached to a `build.done` event.
   *
   * Rules:
   * - `evidence` must be a non-null object.
   * - At least one of `tests`, `lint`, or `typecheck` must be present.
   * - None of the present fields may be `'fail'`.
   *
   * @returns `null` when the evidence is valid, or a reason string describing
   *   the first validation failure.
   */
  validateBuildEvidence(evidence: unknown): string | null {
    if (evidence === null || typeof evidence !== 'object') {
      return 'Build evidence is missing or not an object';
    }

    const ev = evidence as Record<string, unknown>;
    const knownFields = ['tests', 'lint', 'typecheck'] as const;

    const presentFields = knownFields.filter((f) => f in ev);

    if (presentFields.length === 0) {
      return 'Build evidence must include at least one of: tests, lint, typecheck';
    }

    for (const field of presentFields) {
      if (ev[field] === 'fail') {
        return `Build evidence reports failure for: ${field}`;
      }
    }

    return null;
  }
}
