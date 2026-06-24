/**
 * Accumulates proactive human guidance messages per session.
 *
 * Guidance entries are stored until {@link flush} is called, which returns
 * all accumulated entries as a numbered list and clears the store for that
 * session.
 *
 * @example
 * ```typescript
 * const accumulator = new GuidanceAccumulator();
 * accumulator.add('session-1', 'Use the staging database');
 * accumulator.add('session-1', 'Skip email notifications');
 *
 * accumulator.flush('session-1');
 * // => "1. Use the staging database\n2. Skip email notifications"
 *
 * accumulator.flush('session-1');
 * // => null (already flushed)
 * ```
 *
 * @see {@link injectGuidance} for appending flushed guidance into a prompt.
 */
export class GuidanceAccumulator {
  private readonly items: Map<string, string[]> = new Map();

  /**
   * Appends a guidance entry for the given session.
   *
   * @param sessionId - The session to attach guidance to.
   * @param guidance - The guidance text to accumulate.
   */
  add(sessionId: string, guidance: string): void {
    const list = this.items.get(sessionId) ?? [];
    list.push(guidance);
    this.items.set(sessionId, list);
  }

  /**
   * Returns all accumulated guidance for the session as a numbered list
   * and clears the store.  Returns `null` if no guidance has been
   * accumulated for the session.
   *
   * @param sessionId - The session to flush guidance for.
   * @returns A numbered list string, or `null` if empty.
   */
  flush(sessionId: string): string | null {
    const list = this.items.get(sessionId);
    if (!list || list.length === 0) return null;
    this.items.delete(sessionId);
    return list.map((g, i) => `${i + 1}. ${g}`).join('\n');
  }
}
