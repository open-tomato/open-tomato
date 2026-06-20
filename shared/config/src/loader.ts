import type { LoadConfigOptions, ResolvedConfig } from './types.js';

import { dirname, resolve } from 'node:path';

import { applyEnvOverrides } from './env-overrides.js';
import { ConfigValidationError } from './errors.js';
import { loadAndMergeCollections } from './hat-merger.js';
import { CoreConfigSchema } from './schemas/core-config.schema.js';
import { validateSemantics } from './validation/semantic.js';
import { loadCoreConfig } from './yaml-loader.js';

/**
 * Loads, validates, and resolves the full application configuration.
 *
 * Steps performed:
 * 1. Read and schema-validate the core config YAML at `options.configPath`.
 * 2. Apply environment variable overrides — first from `process.env`, then
 *    from `options.envOverride` (which takes final precedence).
 * 3. Re-validate the full config against the Zod schema — env overrides may
 *    introduce values that violate constraints (e.g. negative timeout,
 *    invalid URL). Throws a descriptive `ConfigValidationError` on failure.
 * 4. Run semantic validation (bot token resolvability, hook contracts).
 * 5. If `options.hatSources` is provided and non-empty, load and merge the
 *    hat collections left-to-right; the merged result is attached as
 *    `hatCollection` on the returned object.
 *
 * @param options - Configuration loading options.
 * @param options.configPath  - Path to the core config YAML file.
 * @param options.hatSources  - Optional list of hat collection sources
 *   (file paths or `builtin:<name>` specifiers).
 * @param options.envOverride - Optional map of env-var key/value pairs that
 *   take final precedence over both the config file and `process.env`.
 * @returns The fully resolved configuration.
 * @throws {YamlFileNotFoundError} When `configPath` does not exist.
 * @throws {YamlParseError} When `configPath` contains invalid YAML.
 * @throws {ConfigValidationError} When schema validation fails.
 * @throws {ConfigSemanticError} When semantic validation fails.
 */
export async function loadConfig(options: LoadConfigOptions): Promise<ResolvedConfig> {
  const baseDir = dirname(resolve(options.configPath));

  // 1. Load and schema-validate core config
  let config = await loadCoreConfig(options.configPath);

  // 2a. Apply process.env overrides
  config = applyEnvOverrides(config);

  // 2b. Apply options.envOverride with final precedence, using the same
  //     process.env mechanism to avoid duplicating the parsing logic.
  if (options.envOverride !== undefined) {
    const saved: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(options.envOverride)) {
      saved[key] = process.env[key];
      process.env[key] = value;
    }

    try {
      config = applyEnvOverrides(config);
    } finally {
      // Restore original process.env values regardless of errors
      for (const [key, savedValue] of Object.entries(saved)) {
        if (savedValue === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = savedValue;
        }
      }
    }
  }

  // 3. Re-validate after env overrides — env vars may introduce values that
  //    violate Zod constraints (e.g. negative timeout, invalid URL).
  const revalidated = CoreConfigSchema.safeParse(config);
  if (!revalidated.success) {
    throw new ConfigValidationError(revalidated.error);
  }
  config = revalidated.data;

  // 4. Semantic validation
  await validateSemantics(config);

  // 5. Load and merge hat collections if provided
  if (options.hatSources !== undefined && options.hatSources.length > 0) {
    const hatCollection = await loadAndMergeCollections(options.hatSources, baseDir);
    return { ...config, hatCollection };
  }

  return config;
}
