import type { CoreConfig } from '../types.js';

/**
 * The set of recognised top-level keys defined in `CoreConfigSchema`.
 * Any key present in the raw config object that is not in this set is
 * considered unrecognised and will trigger a warning.
 */
const KNOWN_TOP_LEVEL_KEYS = new Set<string>([
  'event_loop',
  'cli',
  'core',
  'memories',
  'tasks',
  'hooks',
  'skills',
  'features',
  'robot',
  'prompt',
  'prompt_file',
]);

/**
 * Compares the raw (unparsed) config object's top-level keys against the
 * known schema keys and emits a `console.warn` for each unrecognised key.
 *
 * This is a best-effort deprecation/typo guard. It runs after the Zod parse
 * succeeds so it never prevents a valid config from loading — it only informs
 * the user that certain keys they wrote will be silently ignored.
 *
 * @param raw    - The raw value read from the YAML file before Zod parsing.
 * @param parsed - The fully validated `CoreConfig` produced by Zod (unused
 *                 directly, but kept in the signature so callers always pass
 *                 both and cannot accidentally swap the arguments).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function warnDroppedFields(raw: unknown, _parsed: CoreConfig): void {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return;
  }

  const unknownKeys = Object.keys(raw as Record<string, unknown>).filter(
    (key) => !KNOWN_TOP_LEVEL_KEYS.has(key),
  );

  for (const key of unknownKeys) {
    console.warn(
      `[open-tomato config] Unrecognised top-level key "${key}" will be ignored. ` +
        'Check for typos or remove it from your configuration file.',
    );
  }
}
