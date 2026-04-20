/**
 * Transport-agnostic interface for human-in-the-loop interactions.
 *
 * Concrete implementations (HTTP webhook, Telegram, Slack, etc.) implement
 * this interface so the orchestration loop stays decoupled from any specific
 * messaging transport.
 *
 * @example
 * ```typescript
 * // In the orchestration loop:
 * const answer = await robotService.sendQuestion(sessionId, 'Approve deploy?');
 * if (answer === null) {
 *   // Timeout or shutdown — continue with default behaviour
 * }
 *
 * // Before each prompt build:
 * const guidance = robotService.flushGuidance(sessionId);
 * if (guidance) {
 *   prompt = injectGuidance(prompt, guidance);
 * }
 * ```
 *
 * @see {@link BaseRobotService} for the abstract base that concrete transports extend.
 */
export interface RobotService {
  /**
   * Send a blocking question to the human operator and wait for a response.
   *
   * @param sessionId - Identifies the orchestration session this question belongs to.
   * @param question  - The question text to present to the human.
   * @param timeoutMs - Maximum milliseconds to wait before returning a timeout.
   *                    When omitted the implementation should fall back to its
   *                    configured default (typically 300 000 ms).
   * @returns The human's response text, or `null` if the wait timed out or
   *          the service was shut down before a response arrived.
   */
  sendQuestion(sessionId: string, question: string, timeoutMs?: number): Promise<string | null>;

  /**
   * Send a non-blocking check-in message (fire and forget).
   *
   * @param sessionId - Identifies the orchestration session.
   * @param message   - Informational message for the human operator.
   */
  sendCheckin(sessionId: string, message: string): Promise<void>;

  /**
   * Register a handler invoked when the human sends proactive guidance.
   *
   * @param handler - Callback receiving the target session ID and the
   *                  guidance text.
   */
  onGuidance(handler: (sessionId: string, guidance: string) => void): void;

  /**
   * Flush accumulated guidance for a session.
   *
   * Returns all accumulated guidance entries as a numbered list string
   * and clears the internal store for that session.  Returns `null` if
   * no guidance has been accumulated since the last flush.
   *
   * @param sessionId - The session to flush guidance for.
   * @returns A numbered list string, or `null` if no guidance is pending.
   */
  flushGuidance(sessionId: string): string | null;

  /**
   * Accept an incoming human response, unblocking a pending
   * {@link sendQuestion} for the given session.
   *
   * @param sessionId - The session the response targets.
   * @param response  - The human's response text.
   */
  acceptResponse(sessionId: string, response: string): void;

  /**
   * Accept incoming guidance for a session.
   *
   * The guidance entry is accumulated and will be included in the next
   * prompt build when {@link flushGuidance} is called.
   *
   * @param sessionId - The session the guidance targets.
   * @param guidance  - The guidance text.
   */
  acceptGuidance(sessionId: string, guidance: string): void;

  /**
   * Signal the service to stop accepting new interactions.
   *
   * In-flight `sendQuestion` calls should resolve with `null` once shutdown
   * is signalled. The returned promise resolves when all pending work has
   * been drained.
   */
  shutdown(): Promise<void>;
}
