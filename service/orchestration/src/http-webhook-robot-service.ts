import {
  HumanGuidanceEventSchema,
  HumanResponseEventSchema,
} from '@open-tomato/types';

import { BaseRobotService } from './base-robot-service.js';
import { waitForResponse } from './wait-for-response.js';
import { withExponentialBackoff } from './with-exponential-backoff.js';

/**
 * Configuration for the {@link HttpWebhookRobotService}.
 */
export interface HttpWebhookConfig {
  /** URL to POST outbound questions and check-ins to. */
  readonly webhookUrl: string;

  /** Maximum milliseconds to wait for a human response (default: 300 000). */
  readonly timeoutMs?: number;

  /** Milliseconds between poll cycles while waiting (default: 250). */
  readonly pollIntervalMs?: number;

  /** Maximum retry attempts for outbound question delivery (default: 3). */
  readonly maxRetries?: number;

  /** Base delay in ms for exponential backoff on retries (default: 500). */
  readonly baseRetryDelayMs?: number;
}

/**
 * Resolved (all-required) version of {@link HttpWebhookConfig}.
 */
interface ResolvedConfig {
  readonly webhookUrl: string;
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
  readonly maxRetries: number;
  readonly baseRetryDelayMs: number;
}

const DEFAULTS = {
  timeoutMs: 300_000,
  pollIntervalMs: 250,
  maxRetries: 3,
  baseRetryDelayMs: 500,
} as const;

/**
 * Reference HTTP webhook transport adapter for the human-in-the-loop system.
 *
 * **Outbound** — questions and check-ins are delivered as JSON POST requests to
 * the configured `webhookUrl`.  `sendQuestion` retries transient failures with
 * exponential backoff; `sendCheckin` is fire-and-forget.
 *
 * **Inbound** — human responses and proactive guidance arrive via
 * {@link handleIncomingResponse} and {@link handleIncomingGuidance}.  Wire
 * these to your HTTP framework of choice (Express, Hono, plain `Bun.serve`,
 * etc.).  Both methods validate the request body against Zod schemas before
 * processing.
 *
 * @example
 * ```typescript
 * const service = new HttpWebhookRobotService({ webhookUrl: 'https://example.com/hook' });
 *
 * // Express routes
 * app.post('/robot/response', (req, res) => {
 *   const result = service.handleIncomingResponse(req.body);
 *   res.status(result.ok ? 200 : 400).json(result);
 * });
 * app.post('/robot/guidance', (req, res) => {
 *   const result = service.handleIncomingGuidance(req.body);
 *   res.status(result.ok ? 200 : 400).json(result);
 * });
 * ```
 */
export class HttpWebhookRobotService extends BaseRobotService {
  private readonly config: ResolvedConfig;

  constructor(config: HttpWebhookConfig) {
    super();
    this.config = {
      webhookUrl: config.webhookUrl,
      timeoutMs: config.timeoutMs ?? DEFAULTS.timeoutMs,
      pollIntervalMs: config.pollIntervalMs ?? DEFAULTS.pollIntervalMs,
      maxRetries: config.maxRetries ?? DEFAULTS.maxRetries,
      baseRetryDelayMs: config.baseRetryDelayMs ?? DEFAULTS.baseRetryDelayMs,
    };
  }

  /**
   * Delivers a blocking question to the configured webhook URL and waits for
   * a human response.
   *
   * The outbound POST is retried with exponential backoff on transient
   * failures.  After successful delivery the method polls the internal
   * pending-responses map until a reply arrives, the timeout expires, or the
   * service shuts down.
   *
   * @param sessionId - The session the question belongs to.
   * @param question - The question text to present to the human.
   * @param timeoutMs - Override for the configured timeout (ms).
   * @returns The human's response text, or `null` on timeout / shutdown.
   */
  async sendQuestion(
    sessionId: string,
    question: string,
    timeoutMs?: number,
  ): Promise<string | null> {
    const timeout = timeoutMs ?? this.config.timeoutMs;

    await withExponentialBackoff(
      () => this.postWebhook({
        type: 'human.interact',
        sessionId,
        question,
        timestamp: new Date().toISOString(),
      }),
      this.config.maxRetries,
      this.config.baseRetryDelayMs,
    );

    return waitForResponse(
      this.pendingResponses,
      sessionId,
      timeout,
      this.config.pollIntervalMs,
      this.shutdownSignal,
    );
  }

  /**
   * Sends a non-blocking check-in message to the configured webhook URL.
   *
   * Fire-and-forget — no retry on failure, errors are silently swallowed.
   *
   * @param sessionId - The session the check-in belongs to.
   * @param message - The informational message text.
   */
  async sendCheckin(sessionId: string, message: string): Promise<void> {
    try {
      await this.postWebhook({
        type: 'human.checkin',
        sessionId,
        message,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Fire-and-forget: swallow errors silently.
    }
  }

  /**
   * Processes an incoming human response webhook payload.
   *
   * Validates the body against {@link HumanResponseEventSchema} and, on
   * success, injects the response so that an in-flight `sendQuestion` for the
   * same session unblocks.
   *
   * @param body - The raw (unparsed) request body.
   * @returns `{ ok: true }` on success, or `{ ok: false, error: string }` on
   *   validation failure.
   */
  handleIncomingResponse(body: unknown): { ok: true } | { ok: false; error: string } {
    const result = HumanResponseEventSchema.safeParse(body);
    if (!result.success) {
      return { ok: false, error: result.error.message };
    }
    this.acceptResponse(result.data.sessionId, result.data.response);
    return { ok: true };
  }

  /**
   * Processes an incoming human guidance webhook payload.
   *
   * Validates the body against {@link HumanGuidanceEventSchema} and, on
   * success, accumulates the guidance entry and notifies registered handlers.
   *
   * @param body - The raw (unparsed) request body.
   * @returns `{ ok: true }` on success, or `{ ok: false, error: string }` on
   *   validation failure.
   */
  handleIncomingGuidance(body: unknown): { ok: true } | { ok: false; error: string } {
    const result = HumanGuidanceEventSchema.safeParse(body);
    if (!result.success) {
      return { ok: false, error: result.error.message };
    }
    this.acceptGuidance(result.data.sessionId, result.data.guidance);
    return { ok: true };
  }

  /**
   * POSTs a JSON payload to the configured webhook URL.
   *
   * @throws On non-2xx status or network error.
   */
  private async postWebhook(payload: Record<string, unknown>): Promise<void> {
    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Webhook POST failed: ${response.status} ${response.statusText}`,
      );
    }
  }
}
