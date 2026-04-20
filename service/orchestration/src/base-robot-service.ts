import type { RobotService } from '@open-tomato/types';

import { GuidanceAccumulator } from './guidance-accumulator.js';

/**
 * Guidance handler callback type.
 */
type GuidanceHandler = (sessionId: string, guidance: string) => void;

/**
 * Abstract base class for {@link RobotService} implementations.
 *
 * Provides common infrastructure shared by every concrete transport adapter:
 *
 * - **Pending responses** — an instance-level `Map<string, string>` that
 *   concrete transports populate when a human reply arrives.  The map is
 *   consumed by {@link waitForResponse} to unblock a pending
 *   {@link sendQuestion} call.
 * - **Guidance accumulation** — a {@link GuidanceAccumulator} that collects
 *   proactive guidance entries per session.  Concrete transports push
 *   entries; the orchestration loop flushes them before each prompt build.
 * - **Guidance registration** — `onGuidance` stores handlers and
 *   {@link notifyGuidanceHandlers} dispatches incoming guidance to all of them.
 * - **Shutdown** — backed by an {@link AbortController} so that in-flight
 *   blocking waits can observe the signal and resolve early.
 *
 * Concrete subclasses must implement {@link sendQuestion} and
 * {@link sendCheckin}; they typically call {@link notifyGuidanceHandlers}
 * from their transport-specific message receiver.
 *
 * @example
 * ```typescript
 * class SlackRobotService extends BaseRobotService {
 *   async sendQuestion(sessionId: string, question: string, timeoutMs?: number) {
 *     await this.slackClient.postMessage(question);
 *     return waitForResponse(
 *       this.pendingResponses, sessionId,
 *       timeoutMs ?? 300_000, 250, this.shutdownSignal,
 *     );
 *   }
 *
 *   async sendCheckin(sessionId: string, message: string) {
 *     await this.slackClient.postMessage(message);
 *   }
 * }
 * ```
 *
 * @see {@link waitForResponse} for the polling utility used inside `sendQuestion`.
 * @see {@link GuidanceAccumulator} for the per-session guidance store.
 */
export abstract class BaseRobotService implements RobotService {
  private readonly guidanceHandlers: GuidanceHandler[] = [];
  private readonly abortController = new AbortController();

  /**
   * Stores pending human responses keyed by session ID.
   * Concrete transports populate this map (via protected helpers);
   * {@link waitForResponse} polls it to unblock a pending
   * {@link sendQuestion} call.
   */
  protected readonly pendingResponses: Map<string, string> = new Map();

  /**
   * Accumulates proactive human guidance entries per session.
   * The orchestration loop calls {@link GuidanceAccumulator.flush} before
   * each prompt build to retrieve and clear accumulated guidance.
   */
  protected readonly guidanceAccumulator: GuidanceAccumulator =
    new GuidanceAccumulator();

  /**
   * The {@link AbortSignal} that fires when {@link shutdown} is called.
   * Subclasses (and internal utilities like `waitForResponse`) should
   * observe this signal to abort in-flight work promptly.
   */
  protected get shutdownSignal(): AbortSignal {
    return this.abortController.signal;
  }

  /** @inheritdoc */
  abstract sendQuestion(
    sessionId: string,
    question: string,
    timeoutMs?: number,
  ): Promise<string | null>;

  /** @inheritdoc */
  abstract sendCheckin(sessionId: string, message: string): Promise<void>;

  /** @inheritdoc */
  onGuidance(handler: GuidanceHandler): void {
    this.guidanceHandlers.push(handler);
  }

  /** @inheritdoc */
  async shutdown(): Promise<void> {
    this.abortController.abort();
  }

  /** @inheritdoc */
  flushGuidance(sessionId: string): string | null {
    return this.guidanceAccumulator.flush(sessionId);
  }

  /** @inheritdoc */
  acceptResponse(sessionId: string, response: string): void {
    this.pendingResponses.set(sessionId, response);
  }

  /** @inheritdoc */
  acceptGuidance(sessionId: string, guidance: string): void {
    this.guidanceAccumulator.add(sessionId, guidance);
    this.notifyGuidanceHandlers(sessionId, guidance);
  }

  /**
   * Stores a human reply so that an in-flight {@link waitForResponse} poll
   * for the same session will resolve on its next tick.
   *
   * @deprecated Use {@link acceptResponse} instead.
   */
  protected injectResponse(sessionId: string, text: string): void {
    this.acceptResponse(sessionId, text);
  }

  /**
   * Accumulates a proactive guidance entry for the given session and notifies
   * all registered guidance handlers.
   *
   * @deprecated Use {@link acceptGuidance} instead.
   */
  protected injectGuidanceEntry(sessionId: string, text: string): void {
    this.acceptGuidance(sessionId, text);
  }

  /**
   * Dispatches a guidance message to all registered handlers.
   *
   * Concrete transports should call this when a proactive guidance message
   * arrives from the human operator.
   *
   * @param sessionId - The target session.
   * @param guidance - The guidance text.
   */
  private notifyGuidanceHandlers(sessionId: string, guidance: string): void {
    for (const handler of this.guidanceHandlers) {
      handler(sessionId, guidance);
    }
  }
}
