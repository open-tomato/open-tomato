/**
 * Deep-merge utilities for the layered config stack
 * (`config.default.yaml` → `config.<env>.yaml` → …). Plain objects are merged
 * recursively; every other value (scalars, arrays, `null`) is replaced
 * wholesale by the later layer. Inputs are never mutated.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Merge `override` onto `base`, recursing into nested plain objects. Returns a
 * new object; neither argument is mutated.
 */
export function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = result[key];
    result[key] =
      isPlainObject(baseValue) && isPlainObject(overrideValue)
        ? deepMerge(baseValue, overrideValue)
        : overrideValue;
  }

  return result;
}

/**
 * Fold a list of config layers left-to-right (last write wins). An empty list
 * yields an empty object.
 */
export function mergeLayers(
  layers: ReadonlyArray<Record<string, unknown>>,
): Record<string, unknown> {
  return layers.reduce<Record<string, unknown>>(
    (acc, layer) => deepMerge(acc, layer),
    {},
  );
}
