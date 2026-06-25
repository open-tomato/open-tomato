/**
 * Resolve a `{{vault.<id>}}` reference into the ordered list of concrete BWS
 * keys to try when looking up the secret.
 *
 * The fallback rule lets a single config refer to an abstract id
 * (e.g. `db-password`) and have it resolve to the most-specific concrete
 * secret available for the current deployment without forcing every config
 * to enumerate per-env/per-region variants. Given an abstract `id` plus the
 * deployment's `env` and optional `region`, the resolver returns up to three
 * candidate keys in decreasing specificity:
 *
 * 1. `<id>-<env>-<region>` — only when both `env` and `region` are non-empty
 * 2. `<id>-<env>` — only when `env` is non-empty
 * 3. `<id>` — always
 *
 * A `region` supplied without an `env` does NOT produce a region-only segment;
 * the dash-joined format presupposes an environment, and `<id>-<region>` would
 * collide with `<id>-<env>` on lookup.
 *
 * Empty strings are treated as "not provided", so a caller that has no env
 * available can pass `''` and receive `[id]` without having to branch on
 * undefined. The returned list is de-duplicated, so callers never make
 * redundant lookups when env/region collapse the more-specific keys onto the
 * bare id.
 *
 * @param id - The abstract id from a `{{vault.<id>}}` reference.
 * @param env - The deployment environment (e.g. `'production'`, `'staging'`).
 *   Pass `''` when no environment context is available.
 * @param region - Optional deployment region (e.g. `'us-east-1'`). Ignored
 *   when `env` is empty.
 * @returns Ordered, de-duplicated fallback list of concrete BWS keys, most
 *   specific first.
 */
export function resolveVaultId(id: string, env: string, region?: string): string[] {
  const trimmedEnv = env.trim();
  const trimmedRegion = region?.trim() ?? '';

  const keys: string[] = [];
  if (trimmedEnv && trimmedRegion) {
    keys.push(`${id}-${trimmedEnv}-${trimmedRegion}`);
  }
  if (trimmedEnv) {
    keys.push(`${id}-${trimmedEnv}`);
  }
  keys.push(id);

  return Array.from(new Set(keys));
}
