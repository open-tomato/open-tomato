import type { CoreConfig } from './types.js';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyEnvOverrides } from './env-overrides.js';
import { CoreConfigSchema } from './schemas/core-config.schema.js';

function makeBaseConfig(overrides: Partial<CoreConfig> = {}): CoreConfig {
  const parsed = CoreConfigSchema.safeParse(overrides);
  if (!parsed.success) throw new Error('Invalid base config fixture');
  return parsed.data;
}

describe('applyEnvOverrides', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, savedEnv);
  });

  describe('when no env vars are set', () => {
    it('returns a new object with the same values', () => {
      delete process.env.BACKEND;
      delete process.env.MAX_TURNS;
      delete process.env.TIMEOUT_S;
      delete process.env.ROBOT_SERVICE_TIMEOUT_MS;
      delete process.env.ROBOT_SERVICE_POLL_INTERVAL_MS;
      delete process.env.ROBOT_SERVICE_MAX_RETRIES;
      delete process.env.ROBOT_SERVICE_WEBHOOK_URL;

      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);

      expect(result).not.toBe(base);
      expect(result.cli.backend).toBe(base.cli.backend);
      expect(result.event_loop.iterations).toBe(base.event_loop.iterations);
      expect(result.robot.timeout_ms).toBe(base.robot.timeout_ms);
    });
  });

  describe('BACKEND env var', () => {
    it('overrides cli.backend when BACKEND is set', () => {
      process.env.BACKEND = 'openai';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.cli.backend).toBe('openai');
    });

    it('preserves original cli.backend when BACKEND is not set', () => {
      delete process.env.BACKEND;
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.cli.backend).toBe(base.cli.backend);
    });

    it('does not mutate the original config', () => {
      process.env.BACKEND = 'vertex';
      const base = makeBaseConfig();
      const originalBackend = base.cli.backend;
      applyEnvOverrides(base);
      expect(base.cli.backend).toBe(originalBackend);
    });

    it('preserves other cli fields when BACKEND is set', () => {
      process.env.BACKEND = 'openai';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.cli.prompt_mode).toBe(base.cli.prompt_mode);
    });
  });

  describe('MAX_TURNS env var', () => {
    it('overrides event_loop.iterations when MAX_TURNS is a valid integer string', () => {
      process.env.MAX_TURNS = '20';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.event_loop.iterations).toBe(20);
    });

    it('preserves original iterations when MAX_TURNS is not set', () => {
      delete process.env.MAX_TURNS;
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.event_loop.iterations).toBe(base.event_loop.iterations);
    });

    it('ignores MAX_TURNS when value is not a finite number', () => {
      process.env.MAX_TURNS = 'abc';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.event_loop.iterations).toBe(base.event_loop.iterations);
    });

    it('ignores MAX_TURNS when value is NaN', () => {
      process.env.MAX_TURNS = 'NaN';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.event_loop.iterations).toBe(base.event_loop.iterations);
    });

    it('does not mutate the original config', () => {
      process.env.MAX_TURNS = '50';
      const base = makeBaseConfig();
      const originalIterations = base.event_loop.iterations;
      applyEnvOverrides(base);
      expect(base.event_loop.iterations).toBe(originalIterations);
    });

    it('preserves other event_loop fields when MAX_TURNS is set', () => {
      process.env.MAX_TURNS = '5';
      const base = makeBaseConfig({ event_loop: { required_events: ['task.done'] } });
      const result = applyEnvOverrides(base);
      expect(result.event_loop.required_events).toEqual(['task.done']);
    });
  });

  describe('TIMEOUT_S env var', () => {
    it('overrides robot.timeout_ms (converted from seconds to ms) when TIMEOUT_S is set', () => {
      process.env.TIMEOUT_S = '30';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.timeout_ms).toBe(30_000);
    });

    it('preserves original robot.timeout_ms when TIMEOUT_S is not set', () => {
      delete process.env.TIMEOUT_S;
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.timeout_ms).toBe(base.robot.timeout_ms);
    });

    it('ignores TIMEOUT_S when value is not a finite number', () => {
      process.env.TIMEOUT_S = 'invalid';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.timeout_ms).toBe(base.robot.timeout_ms);
    });

    it('ignores TIMEOUT_S when value is NaN', () => {
      process.env.TIMEOUT_S = 'NaN';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.timeout_ms).toBe(base.robot.timeout_ms);
    });

    it('converts seconds to milliseconds correctly', () => {
      process.env.TIMEOUT_S = '1';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.timeout_ms).toBe(1_000);
    });

    it('does not mutate the original config', () => {
      process.env.TIMEOUT_S = '10';
      const base = makeBaseConfig();
      const originalTimeoutMs = base.robot.timeout_ms;
      applyEnvOverrides(base);
      expect(base.robot.timeout_ms).toBe(originalTimeoutMs);
    });

    it('preserves other robot fields when TIMEOUT_S is set', () => {
      process.env.TIMEOUT_S = '5';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.enabled).toBe(base.robot.enabled);
    });
  });

  describe('ROBOT_SERVICE_TIMEOUT_MS env var', () => {
    it('overrides robot.service_timeout_ms when set', () => {
      process.env.ROBOT_SERVICE_TIMEOUT_MS = '600000';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.service_timeout_ms).toBe(600_000);
    });

    it('preserves original service_timeout_ms when not set', () => {
      delete process.env.ROBOT_SERVICE_TIMEOUT_MS;
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.service_timeout_ms).toBe(base.robot.service_timeout_ms);
    });

    it('ignores when value is not a finite number', () => {
      process.env.ROBOT_SERVICE_TIMEOUT_MS = 'abc';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.service_timeout_ms).toBe(base.robot.service_timeout_ms);
    });
  });

  describe('ROBOT_SERVICE_POLL_INTERVAL_MS env var', () => {
    it('overrides robot.service_poll_interval_ms when set', () => {
      process.env.ROBOT_SERVICE_POLL_INTERVAL_MS = '500';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.service_poll_interval_ms).toBe(500);
    });

    it('preserves original service_poll_interval_ms when not set', () => {
      delete process.env.ROBOT_SERVICE_POLL_INTERVAL_MS;
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.service_poll_interval_ms).toBe(base.robot.service_poll_interval_ms);
    });

    it('ignores when value is not a finite number', () => {
      process.env.ROBOT_SERVICE_POLL_INTERVAL_MS = 'NaN';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.service_poll_interval_ms).toBe(base.robot.service_poll_interval_ms);
    });
  });

  describe('ROBOT_SERVICE_MAX_RETRIES env var', () => {
    it('overrides robot.service_max_retries when set', () => {
      process.env.ROBOT_SERVICE_MAX_RETRIES = '5';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.service_max_retries).toBe(5);
    });

    it('preserves original service_max_retries when not set', () => {
      delete process.env.ROBOT_SERVICE_MAX_RETRIES;
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.service_max_retries).toBe(base.robot.service_max_retries);
    });

    it('ignores when value is not a finite number', () => {
      process.env.ROBOT_SERVICE_MAX_RETRIES = 'invalid';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.service_max_retries).toBe(base.robot.service_max_retries);
    });
  });

  describe('ROBOT_SERVICE_WEBHOOK_URL env var', () => {
    it('overrides robot.service_webhook_url when set', () => {
      process.env.ROBOT_SERVICE_WEBHOOK_URL = 'https://hooks.example.com/robot';
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.service_webhook_url).toBe('https://hooks.example.com/robot');
    });

    it('preserves original service_webhook_url when not set', () => {
      delete process.env.ROBOT_SERVICE_WEBHOOK_URL;
      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);
      expect(result.robot.service_webhook_url).toBe(base.robot.service_webhook_url);
    });
  });

  describe('multiple env vars set simultaneously', () => {
    it('applies all overrides at once', () => {
      process.env.BACKEND = 'anthropic';
      process.env.MAX_TURNS = '15';
      process.env.TIMEOUT_S = '60';

      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);

      expect(result.cli.backend).toBe('anthropic');
      expect(result.event_loop.iterations).toBe(15);
      expect(result.robot.timeout_ms).toBe(60_000);
    });

    it('does not affect unrelated config sections', () => {
      process.env.BACKEND = 'openai';
      process.env.MAX_TURNS = '3';

      const base = makeBaseConfig();
      const result = applyEnvOverrides(base);

      expect(result.core).toEqual(base.core);
      expect(result.memories).toEqual(base.memories);
      expect(result.features).toEqual(base.features);
    });
  });
});
