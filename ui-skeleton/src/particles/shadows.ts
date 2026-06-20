/**
 * Box-shadow elevation class constants reused across atoms (Card, Button,
 * Avatar, ...).
 *
 * Atoms should reference these constants instead of repeating raw `shadow-*`
 * utility strings, so that elevation stays consistent with the
 * `--shadow-elev-*` tokens declared in `src/styles/globals.css`.
 *
 * - `elev1` — backed by `--shadow-elev-1` in `@theme` (subtle surface lift).
 * - `elev2` — backed by `--shadow-elev-2` in `@theme` (raised surface, e.g.
 *   hover/active states or floating cards).
 */
export const shadows = {
  elev1: 'shadow-elev-1',
  elev2: 'shadow-elev-2',
} as const;

/**
 * Union of supported elevation keys. Mirrors `keyof typeof shadows`.
 */
export type ShadowKey = keyof typeof shadows;

/**
 * Class string emitted for a given elevation key. Convenience type for atoms
 * that store a class string in component state (e.g. elevation variants).
 */
export type ShadowClass = (typeof shadows)[ShadowKey];
