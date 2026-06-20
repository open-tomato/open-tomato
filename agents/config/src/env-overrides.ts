import type { CoreConfig } from './types.js';

/**
 * Applies environment variable overrides to a validated `CoreConfig`.
 *
 * Each supported variable is documented inline. All env vars are optional —
 * when absent the original config value is preserved unchanged.
 *
 * @param config - The base `CoreConfig` produced by `loadCoreConfig`.
 * @returns A new `CoreConfig` with env-var overrides applied (immutable update).
 */
export function applyEnvOverrides(config: CoreConfig): CoreConfig {
  return {
    ...config,
    cli: {
      ...config.cli,
      /**
       * `BACKEND` — overrides `cli.backend`.
       * Example: `BACKEND=openai`
       */
      ...(process.env.BACKEND !== undefined && { backend: process.env.BACKEND }),
    },
    event_loop: {
      ...config.event_loop,
      /**
       * `MAX_TURNS` — overrides `event_loop.iterations`.
       * Must be a positive integer string.
       * Example: `MAX_TURNS=20`
       */
      ...(process.env.MAX_TURNS !== undefined &&
        (() => {
          const parsed = Number.parseInt(process.env.MAX_TURNS as string, 10);
          return Number.isFinite(parsed)
            ? { iterations: parsed }
            : {};
        })()),
    },
    robot: {
      ...config.robot,
      /**
       * `TIMEOUT_S` — overrides `robot.timeout_ms` (converted from seconds to milliseconds).
       * Must be a positive integer string representing seconds.
       * Example: `TIMEOUT_S=30` sets `timeout_ms` to `30000`.
       */
      ...(process.env.TIMEOUT_S !== undefined &&
        (() => {
          const parsed = Number.parseInt(process.env.TIMEOUT_S as string, 10);
          return Number.isFinite(parsed)
            ? { timeout_ms: parsed * 1000 }
            : {};
        })()),
      /**
       * `ROBOT_SERVICE_TIMEOUT_MS` — overrides `robot.service_timeout_ms`.
       * Must be a positive integer string (milliseconds).
       * Example: `ROBOT_SERVICE_TIMEOUT_MS=600000`
       */
      ...(process.env.ROBOT_SERVICE_TIMEOUT_MS !== undefined &&
        (() => {
          const parsed = Number.parseInt(process.env.ROBOT_SERVICE_TIMEOUT_MS as string, 10);
          return Number.isFinite(parsed)
            ? { service_timeout_ms: parsed }
            : {};
        })()),
      /**
       * `ROBOT_SERVICE_POLL_INTERVAL_MS` — overrides `robot.service_poll_interval_ms`.
       * Must be a positive integer string (milliseconds).
       * Example: `ROBOT_SERVICE_POLL_INTERVAL_MS=500`
       */
      ...(process.env.ROBOT_SERVICE_POLL_INTERVAL_MS !== undefined &&
        (() => {
          const parsed = Number.parseInt(process.env.ROBOT_SERVICE_POLL_INTERVAL_MS as string, 10);
          return Number.isFinite(parsed)
            ? { service_poll_interval_ms: parsed }
            : {};
        })()),
      /**
       * `ROBOT_SERVICE_MAX_RETRIES` — overrides `robot.service_max_retries`.
       * Must be a non-negative integer string.
       * Example: `ROBOT_SERVICE_MAX_RETRIES=5`
       */
      ...(process.env.ROBOT_SERVICE_MAX_RETRIES !== undefined &&
        (() => {
          const parsed = Number.parseInt(process.env.ROBOT_SERVICE_MAX_RETRIES as string, 10);
          return Number.isFinite(parsed)
            ? { service_max_retries: parsed }
            : {};
        })()),
      /**
       * `ROBOT_SERVICE_WEBHOOK_URL` — overrides `robot.service_webhook_url`.
       * Must be a valid URL string.
       * Example: `ROBOT_SERVICE_WEBHOOK_URL=https://hooks.example.com/robot`
       */
      ...(process.env.ROBOT_SERVICE_WEBHOOK_URL !== undefined && {
        service_webhook_url: process.env.ROBOT_SERVICE_WEBHOOK_URL,
      }),
    },
  };
}
