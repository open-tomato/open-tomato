import { z } from 'zod';

/**
 * Zod schema for the `RobotService` configuration.
 *
 * All fields have sensible defaults so a bare `{}` is a valid config — useful
 * for local development where the defaults are good enough.
 */
export const RobotServiceConfigSchema = z.object({
  /**
   * Maximum milliseconds to wait for a human response before timing out.
   * @default 300_000 (5 minutes)
   */
  timeoutMs: z.number().int()
    .positive()
    .default(300_000),

  /**
   * Milliseconds between each poll cycle while waiting for a response.
   * @default 250
   */
  pollIntervalMs: z.number().int()
    .positive()
    .default(250),

  /**
   * Maximum number of retry attempts for transient failures (e.g. network
   * errors when delivering a question via webhook).
   * @default 3
   */
  maxRetries: z.number().int()
    .nonnegative()
    .default(3),

  /**
   * Default session identifier used when no explicit session is provided.
   * @default 'main'
   */
  sessionId: z.string().min(1)
    .default('main'),
});

/**
 * Configuration for a `RobotService` instance.
 *
 * Every field is optional at parse time — `RobotServiceConfigSchema.parse({})`
 * returns a fully populated config with documented defaults.
 */
export type RobotServiceConfig = z.infer<typeof RobotServiceConfigSchema>;
