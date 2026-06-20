import type { CoreConfig, HatCollection } from './types.js';

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { load as parseYaml, YAMLException } from 'js-yaml';

import { ConfigValidationError, YamlFileNotFoundError, YamlParseError } from './errors.js';
import { resolveBuiltinPreset } from './presets/index.js';
import { CoreConfigSchema } from './schemas/core-config.schema.js';
import { HatCollectionSchema } from './schemas/hat-collection.schema.js';

/**
 * Resolves relative `core.specs_dir` and `skills.dirs` paths in a raw parsed
 * YAML object against `baseDir`, leaving absolute paths unchanged.
 *
 * Non-object input is returned as-is.
 *
 * @param raw     - The parsed YAML value (unknown shape).
 * @param baseDir - Directory to resolve relative paths against (typically the
 *                  directory containing the config file).
 * @returns A new object with the path fields resolved; the original is not
 *          mutated.
 */
export function normalizePaths(raw: unknown, baseDir: string): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return raw;
  }

  const obj = raw as Record<string, unknown>;

  const resolvePath = (p: unknown): unknown => typeof p === 'string'
    ? resolve(baseDir, p)
    : p;

  // Normalize core.specs_dir
  let core = obj['core'];
  if (typeof core === 'object' && core !== null && !Array.isArray(core)) {
    const coreObj = core as Record<string, unknown>;
    if ('specs_dir' in coreObj) {
      core = { ...coreObj, specs_dir: resolvePath(coreObj['specs_dir']) };
    }
  }

  // Normalize skills.dirs
  let skills = obj['skills'];
  if (typeof skills === 'object' && skills !== null && !Array.isArray(skills)) {
    const skillsObj = skills as Record<string, unknown>;
    if (Array.isArray(skillsObj['dirs'])) {
      skills = {
        ...skillsObj,
        dirs: skillsObj['dirs'].map(resolvePath),
      };
    }
  }

  return {
    ...obj,
    ...(core !== obj['core']
      ? { core }
      : {}),
    ...(skills !== obj['skills']
      ? { skills }
      : {}),
  };
}

/**
 * Reads and parses a YAML file from disk.
 *
 * @param filePath - Absolute or relative path to the YAML file.
 * @returns The parsed content as an unknown value.
 * @throws {YamlFileNotFoundError} When the file does not exist.
 * @throws {YamlParseError} When the file content is not valid YAML.
 */
export async function readYaml(filePath: string): Promise<unknown> {
  let raw: string;

  try {
    raw = await readFile(filePath, 'utf8');
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'ENOENT') {
      throw new YamlFileNotFoundError(filePath);
    }
    throw err;
  }

  try {
    return parseYaml(raw);
  } catch (err) {
    if (err instanceof YAMLException) {
      throw new YamlParseError(filePath, err);
    }
    throw err;
  }
}

/**
 * Reads, normalizes, and validates a core configuration YAML file.
 *
 * Resolves relative `core.specs_dir` and `skills.dirs` paths against the
 * directory containing `configPath` before validation.
 *
 * @param configPath - Absolute or relative path to the core config YAML file.
 * @returns The validated and normalized `CoreConfig` object.
 * @throws {YamlFileNotFoundError} When the file does not exist.
 * @throws {YamlParseError} When the file content is not valid YAML.
 * @throws {ConfigValidationError} When the parsed content fails schema validation.
 */
export async function loadCoreConfig(configPath: string): Promise<CoreConfig> {
  const baseDir = dirname(resolve(configPath));
  const raw = await readYaml(configPath);
  const normalized = normalizePaths(raw, baseDir);

  const result = CoreConfigSchema.safeParse(normalized);
  if (!result.success) {
    throw new ConfigValidationError(result.error);
  }

  return result.data;
}

const BUILTIN_PREFIX = 'builtin:';

/**
 * Loads and validates a hat collection from either a file path or a
 * `builtin:<name>` specifier.
 *
 * - File path: resolved against `baseDir`, read as YAML, validated against
 *   `HatCollectionSchema`.
 * - `builtin:<name>`: delegates to `resolveBuiltinPreset(name)`.
 *
 * @param source  - A file path (absolute or relative) or `builtin:<name>`.
 * @param baseDir - Directory to resolve relative file paths against.
 * @returns The validated `HatCollection`.
 * @throws {YamlFileNotFoundError} When a file-path source does not exist.
 * @throws {YamlParseError} When a file-path source contains invalid YAML.
 * @throws {ConfigValidationError} When the parsed content fails schema validation.
 * @throws {Error} When an unknown builtin preset name is requested.
 */
export async function loadHatCollection(
  source: string,
  baseDir: string,
): Promise<HatCollection> {
  if (source.startsWith(BUILTIN_PREFIX)) {
    const name = source.slice(BUILTIN_PREFIX.length);
    return resolveBuiltinPreset(name);
  }

  const filePath = resolve(baseDir, source);
  const raw = await readYaml(filePath);

  const result = HatCollectionSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigValidationError(result.error);
  }

  return result.data;
}
