import type { HatCollection } from './types.js';

import { ConfigValidationError } from './errors.js';
import { HatCollectionSchema } from './schemas/hat-collection.schema.js';
import { loadHatCollection } from './yaml-loader.js';

/**
 * Merges two hat collections, using `id` as the stable identity key.
 *
 * Merge rules:
 * - Hats present in `base` are preserved in their original order.
 * - When a hat in `override` shares an `id` with a base hat, the override hat
 *   replaces it in-place (positional order from `base` is kept).
 * - Hats in `override` whose `id` does not exist in `base` are appended after
 *   all base hats, in the order they appear in `override`.
 *
 * After merging, the full `HatCollectionSchema` refinements are re-run on the
 * merged result (including ambiguous routing detection and the aggregate/
 * non-aggregate wave-config check).
 *
 * @param base     - The base hat collection.
 * @param override - The hat collection whose hats take precedence.
 * @returns A new `HatCollection` with the merged hats.
 * @throws {ConfigValidationError} When the merged collection fails schema validation.
 */
export function mergeHatCollections(
  base: HatCollection,
  override: HatCollection,
): HatCollection {
  const overrideMap = new Map(override.hats.map((hat) => [hat.id, hat]));

  const mergedHats = base.hats.map((hat) => overrideMap.has(hat.id)
    ? overrideMap.get(hat.id)!
    : hat);

  const baseIds = new Set(base.hats.map((hat) => hat.id));
  for (const hat of override.hats) {
    if (!baseIds.has(hat.id)) {
      mergedHats.push(hat);
    }
  }

  const candidate = {
    version: override.version ?? base.version,
    hats: mergedHats,
  };

  // Re-run the full schema refinements (ambiguous routing + aggregate constraint)
  // on the merged collection so the same rules that govern parsed YAML also
  // govern programmatically merged collections.
  const result = HatCollectionSchema.safeParse(candidate);
  if (!result.success) {
    throw new ConfigValidationError(result.error);
  }

  return result.data;
}

/**
 * Loads multiple hat collection sources and merges them left-to-right, so
 * each subsequent source overrides hats from all previous sources.
 *
 * @param sources - Array of source specifiers (file paths or `builtin:<name>`).
 * @param baseDir - Directory to resolve relative file paths against.
 * @returns The fully merged `HatCollection`.
 * @throws {Error} When `sources` is empty.
 * @throws {YamlFileNotFoundError} When a file-path source does not exist.
 * @throws {YamlParseError} When a file-path source contains invalid YAML.
 * @throws {ConfigValidationError} When any source fails schema validation or
 *   the merged result has ambiguous routing.
 */
export async function loadAndMergeCollections(
  sources: string[],
  baseDir: string,
): Promise<HatCollection> {
  if (sources.length === 0) {
    throw new Error('loadAndMergeCollections requires at least one source');
  }

  const collections = await Promise.all(
    sources.map((source) => loadHatCollection(source, baseDir)),
  );

  let merged = collections[0] as HatCollection;
  for (let i = 1; i < collections.length; i++) {
    // mergeHatCollections validates the merged result via HatCollectionSchema
    // after each step, so the final collection is always schema-valid.
    merged = mergeHatCollections(merged, collections[i] as HatCollection);
  }

  return merged;
}
