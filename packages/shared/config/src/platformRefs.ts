/**
 * Pattern for `{{platform.<vendor>.<path>}}` placeholders in config values.
 *
 * Schema v2 leaves these references unresolved at load time; a platform plugin's
 * `resolvePlatformRefs` consumes them later at emit-time. This module only
 * recognizes the literal syntax — it does NOT resolve, mutate, or validate the
 * vendor/path against any plugin registry.
 *
 * Capture groups:
 * - `vendor` — kebab-case vendor identifier (e.g. `homelab`, `heroku`)
 * - `path`   — dotted path inside the vendor namespace (e.g. `network.subnet`)
 *
 * The `g` flag is set so the pattern can be used with `String.prototype.matchAll`
 * to extract every occurrence in a value. Consumers that use `.test()` or
 * `.exec()` must reset `lastIndex` between calls, or clone the regex.
 *
 * Other prefixes such as `{{config.foo}}` or `{{vault.foo}}` are intentionally
 * excluded; only the literal `platform.` prefix matches.
 */
export const PLATFORM_REF_PATTERN: RegExp =
  /\{\{platform\.(?<vendor>[a-z][a-z0-9-]*)\.(?<path>[a-z0-9_][\w.-]*)\}\}/g;

/**
 * Returns true if `value` contains at least one `{{platform.<vendor>.<path>}}`
 * reference.
 *
 * Uses `matchAll` to avoid the `lastIndex` state hazard that comes with the
 * shared global `PLATFORM_REF_PATTERN`.
 */
export function isPlatformRef(value: string): boolean {
  return !value.matchAll(PLATFORM_REF_PATTERN).next().done;
}
