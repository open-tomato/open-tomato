import type { HatCollection } from '../types.js';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ConfigValidationError } from '../errors.js';
import { HatCollectionSchema } from '../schemas/hat-collection.schema.js';
import { readYaml } from '../yaml-loader.js';

/**
 * Names of all bundled preset hat collections.
 */
export const PRESET_NAMES = ['wave-review', 'sequential'] as const;

/** Union type of all valid builtin preset names. */
export type PresetName = typeof PRESET_NAMES[number];

const PRESET_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Resolves a named builtin preset to a validated `HatCollection`.
 *
 * Preset YAML files are bundled alongside this module under `src/presets/`.
 *
 * @param name - One of the values in {@link PRESET_NAMES}.
 * @returns The parsed and validated `HatCollection` for the preset.
 * @throws {Error} When `name` is not a known preset.
 * @throws {ConfigValidationError} When the bundled preset YAML fails schema validation.
 */
export async function resolveBuiltinPreset(name: string): Promise<HatCollection> {
  if (!(PRESET_NAMES as readonly string[]).includes(name)) {
    throw new Error(
      `Unknown builtin preset: "${name}". Available presets: ${PRESET_NAMES.join(', ')}`,
    );
  }

  const filePath = resolve(PRESET_DIR, `${name}.yml`);
  const raw = await readYaml(filePath);

  const result = HatCollectionSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigValidationError(result.error);
  }

  return result.data;
}
