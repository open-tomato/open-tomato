import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { ConfigValidationError, YamlFileNotFoundError } from './errors.js';
import { loadConfig } from './loader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '__fixtures__');

describe('loadConfig (integration)', () => {
  describe('core config only (no hat sources)', () => {
    it('loads a valid core config and returns resolved config', async () => {
      const config = await loadConfig({ configPath: join(fixtures, 'valid-core-config.yml') });

      expect(config.event_loop.iterations).toBe(5);
      expect(config.cli.backend).toBe('anthropic');
      expect(config.robot.enabled).toBe(false);
      expect(config.hatCollection).toBeUndefined();
    });

    it('applies schema defaults for a minimal config', async () => {
      const config = await loadConfig({ configPath: join(fixtures, 'minimal-core-config.yml') });

      expect(config.event_loop.iterations).toBe(10);
      expect(config.event_loop.enforce_hat_scope).toBe(false);
      expect(config.hatCollection).toBeUndefined();
    });
  });

  describe('with hat sources', () => {
    it('attaches hatCollection when a file-path hat source is provided', async () => {
      const config = await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        hatSources: [join(fixtures, 'hat-collection.yml')],
      });

      expect(config.hatCollection).toBeDefined();
      expect(config.hatCollection!.hats).toHaveLength(3);
      const ids = config.hatCollection!.hats.map((h) => h.id);
      expect(ids).toEqual(['planner', 'executor', 'reporter']);
    });

    it('hat fields are correctly parsed from fixture', async () => {
      const config = await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        hatSources: [join(fixtures, 'hat-collection.yml')],
      });

      const executor = config.hatCollection!.hats.find((h) => h.id === 'executor');
      expect(executor).toBeDefined();
      expect(executor!.triggers).toEqual(['plan:ready']);
      expect(executor!.publishes).toEqual(['task:done']);
      expect(executor!.concurrency).toBe(2);
      expect(executor!.aggregate).toBe(false);
    });

    it('parses a named backend string from a hat', async () => {
      const config = await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        hatSources: [join(fixtures, 'hat-collection.yml')],
      });

      const executor = config.hatCollection!.hats.find((h) => h.id === 'executor');
      expect(executor).toBeDefined();
      expect(executor!.backend).toBe('gemini');
    });

    it('hats without a backend field default to undefined', async () => {
      const config = await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        hatSources: [join(fixtures, 'hat-collection.yml')],
      });

      const planner = config.hatCollection!.hats.find((h) => h.id === 'planner');
      expect(planner).toBeDefined();
      expect(planner!.backend).toBeUndefined();
    });

    it('parses a custom backend descriptor object from a hat', async () => {
      const config = await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        hatSources: [join(fixtures, 'hat-collection-with-backend.yml')],
      });

      const reporter = config.hatCollection!.hats.find((h) => h.id === 'reporter');
      expect(reporter).toBeDefined();
      expect(reporter!.backend).toEqual({
        name: 'my-custom-llm',
        command: '/usr/local/bin/my-llm',
        args: ['--json'],
        promptMode: 'stdin',
        outputFormat: 'stream-json',
        envVars: { MY_API_KEY: 'secret' },
      });
    });

    it('parses a mix of hats with and without backend overrides', async () => {
      const config = await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        hatSources: [join(fixtures, 'hat-collection-with-backend.yml')],
      });

      const hats = config.hatCollection!.hats;
      const planner = hats.find((h) => h.id === 'planner');
      const executor = hats.find((h) => h.id === 'executor');
      const reporter = hats.find((h) => h.id === 'reporter');

      expect(planner!.backend).toBeUndefined();
      expect(executor!.backend).toBe('gemini');
      expect(typeof reporter!.backend).toBe('object');
    });

    it('attaches hatCollection when a builtin preset is used', async () => {
      const config = await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        hatSources: ['builtin:sequential'],
      });

      expect(config.hatCollection).toBeDefined();
      expect(config.hatCollection!.hats).toHaveLength(1);
      expect(config.hatCollection!.hats[0]!.id).toBe('worker');
    });

    it('merges multiple hat sources left-to-right', async () => {
      const config = await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        hatSources: [join(fixtures, 'hat-collection.yml'), 'builtin:sequential'],
      });

      // sequential preset adds `worker` hat; fixture has planner/executor/reporter
      expect(config.hatCollection).toBeDefined();
      const ids = config.hatCollection!.hats.map((h) => h.id);
      expect(ids).toContain('planner');
      expect(ids).toContain('worker');
    });
  });

  describe('env overrides', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('applies envOverride option with final precedence over process.env', async () => {
      process.env['BACKEND'] = 'openai';

      const config = await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        envOverride: { BACKEND: 'vertex' },
      });

      expect(config.cli.backend).toBe('vertex');
    });

    it('does not mutate process.env after loading', async () => {
      const before = process.env['BACKEND'];

      await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        envOverride: { BACKEND: 'vertex' },
      });

      expect(process.env['BACKEND']).toBe(before);
    });
  });

  describe('startup validation after env overrides', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('throws ConfigValidationError when ROBOT_SERVICE_TIMEOUT_MS is negative', async () => {
      await expect(
        loadConfig({
          configPath: join(fixtures, 'valid-core-config.yml'),
          envOverride: { ROBOT_SERVICE_TIMEOUT_MS: '-1' },
        }),
      ).rejects.toThrow(ConfigValidationError);
    });

    it('throws ConfigValidationError when ROBOT_SERVICE_POLL_INTERVAL_MS is zero', async () => {
      await expect(
        loadConfig({
          configPath: join(fixtures, 'valid-core-config.yml'),
          envOverride: { ROBOT_SERVICE_POLL_INTERVAL_MS: '0' },
        }),
      ).rejects.toThrow(ConfigValidationError);
    });

    it('throws ConfigValidationError when ROBOT_SERVICE_MAX_RETRIES is negative', async () => {
      await expect(
        loadConfig({
          configPath: join(fixtures, 'valid-core-config.yml'),
          envOverride: { ROBOT_SERVICE_MAX_RETRIES: '-5' },
        }),
      ).rejects.toThrow(ConfigValidationError);
    });

    it('throws ConfigValidationError when ROBOT_SERVICE_WEBHOOK_URL is not a valid URL', async () => {
      await expect(
        loadConfig({
          configPath: join(fixtures, 'valid-core-config.yml'),
          envOverride: { ROBOT_SERVICE_WEBHOOK_URL: 'not-a-url' },
        }),
      ).rejects.toThrow(ConfigValidationError);
    });

    it('includes a descriptive error message identifying the invalid field', async () => {
      await expect(
        loadConfig({
          configPath: join(fixtures, 'valid-core-config.yml'),
          envOverride: { ROBOT_SERVICE_TIMEOUT_MS: '-1' },
        }),
      ).rejects.toThrow(/robot.*service_timeout_ms/i);
    });

    it('accepts valid env override values without error', async () => {
      const config = await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        envOverride: {
          ROBOT_SERVICE_TIMEOUT_MS: '600000',
          ROBOT_SERVICE_POLL_INTERVAL_MS: '500',
          ROBOT_SERVICE_MAX_RETRIES: '5',
          ROBOT_SERVICE_WEBHOOK_URL: 'https://hooks.example.com/robot',
        },
      });

      expect(config.robot.service_timeout_ms).toBe(600_000);
      expect(config.robot.service_poll_interval_ms).toBe(500);
      expect(config.robot.service_max_retries).toBe(5);
      expect(config.robot.service_webhook_url).toBe('https://hooks.example.com/robot');
    });
  });

  describe('error propagation', () => {
    it('throws YamlFileNotFoundError when configPath does not exist', async () => {
      await expect(
        loadConfig({ configPath: join(fixtures, 'does-not-exist.yml') }),
      ).rejects.toThrow(YamlFileNotFoundError);
    });

    it('throws ConfigValidationError when the config file is schema-invalid', async () => {
      await expect(
        loadConfig({ configPath: join(fixtures, 'invalid-core-config.yml') }),
      ).rejects.toThrow(ConfigValidationError);
    });

    it('throws YamlFileNotFoundError when a hat source file does not exist', async () => {
      await expect(
        loadConfig({
          configPath: join(fixtures, 'valid-core-config.yml'),
          hatSources: [join(fixtures, 'no-such-hats.yml')],
        }),
      ).rejects.toThrow(YamlFileNotFoundError);
    });
  });

  describe('ResolvedConfig shape', () => {
    it('returned value includes all core config sections', async () => {
      const config = await loadConfig({ configPath: join(fixtures, 'valid-core-config.yml') });

      expect(config).toHaveProperty('event_loop');
      expect(config).toHaveProperty('cli');
      expect(config).toHaveProperty('core');
      expect(config).toHaveProperty('memories');
      expect(config).toHaveProperty('skills');
      expect(config).toHaveProperty('features');
      expect(config).toHaveProperty('robot');
    });

    it('hatCollection is absent when no hat sources provided', async () => {
      const config = await loadConfig({ configPath: join(fixtures, 'valid-core-config.yml') });

      expect('hatCollection' in config).toBe(false);
    });

    it('hatCollection is present when hat sources are provided', async () => {
      const config = await loadConfig({
        configPath: join(fixtures, 'valid-core-config.yml'),
        hatSources: ['builtin:wave-review'],
      });

      expect('hatCollection' in config).toBe(true);
      expect(config.hatCollection).toBeDefined();
    });
  });
});
