/**
 * `loadConfig` — the runtime entry point. Discovers and deep-merges the config
 * stack for an env/region, resolves `{{config.*}}` self-references, guards
 * against leftover `{{vault.*}}` / `{{proc.*}}` placeholders, validates, and
 * returns a typed, deep-frozen config object.
 */
import type { ConfigExtension, ProjectConfig } from './schema.js';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { load as parseYaml } from 'js-yaml';

import { ConfigError } from './errors.js';
import { mergeLayers } from './merge.js';
import { resolveConfigRefs, findUnresolvedTemplates } from './template.js';
import { validateConfig } from './validate.js';

/** The shape returned by {@link loadConfig}; `env`/`infrastructure` are widened
 * by a `defineConfig` schema when one is supplied. */
export type ResolvedConfig<
  TEnv = Record<string, unknown>,
  TInfra = Record<string, unknown>,
> = {
  project: ProjectConfig;
  infrastructure: TInfra;
  env: TEnv;
} & Record<string, unknown>;

/** Options for {@link loadConfig}. */
export interface LoadConfigOptions<
  TEnv = Record<string, unknown>,
  TInfra = Record<string, unknown>,
> {
  /** Directory containing `config.default.yaml` and any overlays. */
  configDir: string;
  /** Target environment, selecting `config.<env>.yaml`. */
  env: string;
  /** Optional region, selecting `config.<env>.<region>.yaml`. */
  region?: string;
  /** A `defineConfig` extension that types and validates `env`/`infrastructure`. */
  schema?: ConfigExtension<TEnv, TInfra>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readYamlIfExists(
  path: string,
): Promise<Record<string, unknown> | undefined> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    return undefined; // a missing layer is silently skipped
  }

  const parsed = parseYaml(raw);
  if (parsed === null || parsed === undefined) return {};
  if (!isPlainObject(parsed)) {
    throw new ConfigError(
      'VALIDATION_FAILED',
      `Config file is not a mapping: ${path}`,
      { file: path },
    );
  }
  return parsed;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * Load, merge, resolve, validate, and freeze the config for an env/region.
 * Throws {@link ConfigError} on a missing default, leftover secret/proc
 * placeholders, or validation failure.
 */
export async function loadConfig<
  TEnv = Record<string, unknown>,
  TInfra = Record<string, unknown>,
>(
  options: LoadConfigOptions<TEnv, TInfra>,
): Promise<ResolvedConfig<TEnv, TInfra>> {
  const { configDir, env, region, schema } = options;

  const defaultPath = join(configDir, 'config.default.yaml');
  const defaultLayer = await readYamlIfExists(defaultPath);
  if (defaultLayer === undefined) {
    throw new ConfigError(
      'MISSING_DEFAULT',
      `config.default.yaml not found in ${configDir}`,
      { file: defaultPath },
    );
  }

  const layers: Record<string, unknown>[] = [defaultLayer];

  const envLayer = await readYamlIfExists(join(configDir, `config.${env}.yaml`));
  if (envLayer) layers.push(envLayer);

  if (region) {
    const regionLayer = await readYamlIfExists(
      join(configDir, `config.${env}.${region}.yaml`),
    );
    if (regionLayer) layers.push(regionLayer);
  }

  // Developer-only override, never loaded in CI or production.
  if (process.env.NODE_ENV === 'development') {
    const localLayer = await readYamlIfExists(join(configDir, 'config.local.yaml'));
    if (localLayer) layers.push(localLayer);
  }

  const merged = resolveConfigRefs(mergeLayers(layers));

  const [firstUnresolved] = findUnresolvedTemplates(merged);
  if (firstUnresolved) {
    throw new ConfigError(
      'UNRESOLVED_TEMPLATE',
      `Found unresolved template '${firstUnresolved.placeholder}' in ${firstUnresolved.path}. ` +
        `Run 'tomato config export ${env}' to resolve secrets before starting the service.`,
      { key: firstUnresolved.path },
    );
  }

  const defaultEnv = isPlainObject(defaultLayer.env)
    ? defaultLayer.env
    : {};
  const validated = validateConfig(merged, { defaultEnv, extension: schema });

  return deepFreeze(validated) as ResolvedConfig<TEnv, TInfra>;
}
