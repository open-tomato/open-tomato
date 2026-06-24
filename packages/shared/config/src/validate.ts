/**
 * Validation passes for the merged config:
 *
 * 1. Base + type-specific schema (`project` rules).
 * 2. Env structure — overlays may change values but not introduce `env` keys
 *    absent from `config.default.yaml`.
 * 3. Optional service-level extension schema from `defineConfig`.
 *
 * Failures throw {@link ConfigError} with `VALIDATION_FAILED` or
 * `SCHEMA_MISMATCH`.
 */
import type { ZodError } from 'zod';

import { ConfigError } from './errors.js';
import { BaseConfigSchema, type ConfigExtension } from './schema.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatZodError(error: ZodError): string {
  const lines = error.issues.map(
    (issue) => `  - ${issue.path.join('.') || '<root>'}: ${issue.message}`,
  );
  return `Config validation failed:\n${lines.join('\n')}`;
}

function assertEnvKeysSubset(
  declaredEnv: Record<string, unknown>,
  actualEnv: Record<string, unknown>,
  prefix = '',
): void {
  for (const [key, value] of Object.entries(actualEnv)) {
    const path = prefix
      ? `${prefix}.${key}`
      : key;

    if (!Object.prototype.hasOwnProperty.call(declaredEnv, key)) {
      throw new ConfigError(
        'SCHEMA_MISMATCH',
        `env key '${path}' is not declared in config.default.yaml`,
        { key: `env.${path}` },
      );
    }

    const declared = declaredEnv[key];
    if (isPlainObject(value) && isPlainObject(declared)) {
      assertEnvKeysSubset(declared, value, path);
    }
  }
}

/** Options for {@link validateConfig}. */
export interface ValidateOptions {
  /** The `env` section of `config.default.yaml`, used for the no-new-keys rule. */
  defaultEnv?: Record<string, unknown>;
  /** A `defineConfig` extension for service-level `env` / `infrastructure`. */
  extension?: ConfigExtension;
}

/**
 * Validate a merged config object. Returns the same object on success; throws
 * {@link ConfigError} on the first failure.
 */
export function validateConfig(
  merged: Record<string, unknown>,
  options: ValidateOptions = {},
): Record<string, unknown> {
  const base = BaseConfigSchema.safeParse(merged);
  if (!base.success) {
    throw new ConfigError('VALIDATION_FAILED', formatZodError(base.error));
  }

  if (options.defaultEnv) {
    const env = isPlainObject(merged.env)
      ? merged.env
      : {};
    assertEnvKeysSubset(options.defaultEnv, env);
  }

  const { extension } = options;
  if (extension?.env) {
    const result = extension.env.safeParse(merged.env);
    if (!result.success) {
      throw new ConfigError('VALIDATION_FAILED', formatZodError(result.error), {
        key: 'env',
      });
    }
  }
  if (extension?.infrastructure) {
    const result = extension.infrastructure.safeParse(merged.infrastructure);
    if (!result.success) {
      throw new ConfigError('VALIDATION_FAILED', formatZodError(result.error), {
        key: 'infrastructure',
      });
    }
  }

  return merged;
}
