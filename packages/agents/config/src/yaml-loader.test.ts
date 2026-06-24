import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ConfigValidationError, YamlFileNotFoundError, YamlParseError } from './errors.js';
import { loadCoreConfig } from './yaml-loader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '__fixtures__');

describe('loadCoreConfig', () => {
  describe('happy path', () => {
    it('loads and validates a fully specified config', async () => {
      const config = await loadCoreConfig(join(fixtures, 'valid-core-config.yml'));

      expect(config.event_loop.iterations).toBe(5);
      expect(config.event_loop.runtime_ms).toBe(60000);
      expect(config.event_loop.cost_limit_usd).toBe(2.0);
      expect(config.event_loop.completion_promise).toBe('all tasks done');
      expect(config.event_loop.required_events).toEqual(['task.complete']);
      expect(config.event_loop.enforce_hat_scope).toBe(true);

      expect(config.cli.backend).toBe('anthropic');
      expect(config.cli.prompt_mode).toBe('oneshot');

      expect(config.robot.enabled).toBe(false);
    });

    it('resolves relative specs_dir against the config file directory', async () => {
      const configPath = join(fixtures, 'valid-core-config.yml');
      const config = await loadCoreConfig(configPath);

      const expectedSpecsDir = resolve(fixtures, './specs');
      expect(config.core.specs_dir).toBe(expectedSpecsDir);
    });

    it('resolves relative skills.dirs entries against the config file directory', async () => {
      const configPath = join(fixtures, 'valid-core-config.yml');
      const config = await loadCoreConfig(configPath);

      const expectedSkillsDir = resolve(fixtures, './skills');
      expect(config.skills.dirs).toEqual([expectedSkillsDir]);
    });

    it('loads a minimal config and applies schema defaults', async () => {
      const config = await loadCoreConfig(join(fixtures, 'minimal-core-config.yml'));

      expect(config.event_loop.iterations).toBe(10);
      expect(config.event_loop.required_events).toEqual([]);
      expect(config.event_loop.enforce_hat_scope).toBe(false);

      expect(config.cli.backend).toBe('anthropic');
      expect(config.cli.prompt_mode).toBe('oneshot');

      expect(config.memories.inject_mode).toBe('prepend');
      expect(config.memories.filter).toEqual([]);

      expect(config.core.guardrails).toEqual([]);
      expect(config.skills.dirs).toEqual([]);
    });

    it('returns a plain object (not a Zod wrapper)', async () => {
      const config = await loadCoreConfig(join(fixtures, 'valid-core-config.yml'));
      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();
    });
  });

  describe('missing file', () => {
    it('throws YamlFileNotFoundError when the file does not exist', async () => {
      await expect(
        loadCoreConfig(join(fixtures, 'does-not-exist.yml')),
      ).rejects.toThrow(YamlFileNotFoundError);
    });

    it('YamlFileNotFoundError message includes the file path', async () => {
      const missingPath = join(fixtures, 'does-not-exist.yml');
      await expect(
        loadCoreConfig(missingPath),
      ).rejects.toThrow(missingPath);
    });

    it('YamlFileNotFoundError has the correct name', async () => {
      const missingPath = join(fixtures, 'does-not-exist.yml');
      const err = await loadCoreConfig(missingPath).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(YamlFileNotFoundError);
      expect((err as YamlFileNotFoundError).name).toBe('YamlFileNotFoundError');
    });

    it('YamlFileNotFoundError exposes the filePath property', async () => {
      const missingPath = join(fixtures, 'does-not-exist.yml');
      const err = await loadCoreConfig(missingPath).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(YamlFileNotFoundError);
      expect((err as YamlFileNotFoundError).filePath).toBe(missingPath);
    });
  });

  describe('invalid YAML syntax', () => {
    it('throws YamlParseError for a file with malformed YAML', async () => {
      await expect(
        loadCoreConfig(join(fixtures, 'invalid-yaml-syntax.yml')),
      ).rejects.toThrow(YamlParseError);
    });

    it('YamlParseError message includes the file path', async () => {
      const badPath = join(fixtures, 'invalid-yaml-syntax.yml');
      await expect(
        loadCoreConfig(badPath),
      ).rejects.toThrow(badPath);
    });

    it('YamlParseError has the correct name', async () => {
      const err = await loadCoreConfig(join(fixtures, 'invalid-yaml-syntax.yml')).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(YamlParseError);
      expect((err as YamlParseError).name).toBe('YamlParseError');
    });
  });

  describe('invalid config (schema validation failure)', () => {
    it('throws ConfigValidationError when config violates schema constraints', async () => {
      await expect(
        loadCoreConfig(join(fixtures, 'invalid-core-config.yml')),
      ).rejects.toThrow(ConfigValidationError);
    });

    it('ConfigValidationError has the correct name', async () => {
      const err = await loadCoreConfig(join(fixtures, 'invalid-core-config.yml')).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConfigValidationError);
      expect((err as ConfigValidationError).name).toBe('ConfigValidationError');
    });

    it('ConfigValidationError message describes the invalid field', async () => {
      const err = await loadCoreConfig(join(fixtures, 'invalid-core-config.yml')).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConfigValidationError);
      const message = (err as ConfigValidationError).message;
      expect(message).toContain('event_loop');
    });

    it('ConfigValidationError exposes the zodError property', async () => {
      const err = await loadCoreConfig(join(fixtures, 'invalid-core-config.yml')).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConfigValidationError);
      expect((err as ConfigValidationError).zodError).toBeDefined();
    });
  });
});
