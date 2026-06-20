import { z } from 'zod';

/**
 * Zod schema for the `robot` section of the core config.
 *
 * Configures the optional robot/bot integration. When `enabled` is `true`,
 * `timeout_ms` is required (enforced via a `.refine` check).
 *
 * The `service_*` fields configure the `RobotService` runtime behaviour and
 * can be overridden via environment variables:
 *
 * | Env var                          | Field                | Default   |
 * | -------------------------------- | -------------------- | --------- |
 * | `ROBOT_SERVICE_TIMEOUT_MS`       | `service_timeout_ms` | `300000`  |
 * | `ROBOT_SERVICE_POLL_INTERVAL_MS` | `service_poll_interval_ms` | `250` |
 * | `ROBOT_SERVICE_MAX_RETRIES`      | `service_max_retries`| `3`       |
 * | `ROBOT_SERVICE_WEBHOOK_URL`      | `service_webhook_url`| —         |
 */
export const RobotSchema = z.object({
  enabled: z.boolean().default(false),
  bot_token: z.string().optional(),
  timeout_ms: z.number().int()
    .positive()
    .optional(),

  /**
   * Maximum milliseconds to wait for a human response before timing out.
   * Env override: `ROBOT_SERVICE_TIMEOUT_MS`
   * @default 300_000 (5 minutes)
   */
  service_timeout_ms: z.number().int()
    .positive()
    .default(300_000),

  /**
   * Milliseconds between each poll cycle while waiting for a response.
   * Env override: `ROBOT_SERVICE_POLL_INTERVAL_MS`
   * @default 250
   */
  service_poll_interval_ms: z.number().int()
    .positive()
    .default(250),

  /**
   * Maximum number of retry attempts for transient failures.
   * Env override: `ROBOT_SERVICE_MAX_RETRIES`
   * @default 3
   */
  service_max_retries: z.number().int()
    .nonnegative()
    .default(3),

  /**
   * Webhook URL used by `HttpWebhookRobotService` to deliver outbound
   * questions and check-ins.
   * Env override: `ROBOT_SERVICE_WEBHOOK_URL`
   */
  service_webhook_url: z.string().url()
    .optional(),
}).refine(
  (val) => !(val.enabled && val.timeout_ms === undefined),
  { message: 'timeout_ms is required when enabled is true', path: ['timeout_ms'] },
);

/** Inferred TypeScript type for {@link RobotSchema}. */
export type Robot = z.infer<typeof RobotSchema>;
