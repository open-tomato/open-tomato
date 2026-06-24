/**
 * Animation class constants reused across atoms (Spinner, Skeleton, ...).
 *
 * Atoms should reference these constants instead of repeating raw
 * `animate-*` utility strings, so that animation names stay consistent
 * with the `--animate-*` tokens declared in `src/styles/globals.css`.
 *
 * - `spin` — backed by `--animate-spin` in `@theme` (continuous rotation).
 * - `pulse` — Tailwind v4 built-in `animate-pulse` (opacity breathe).
 * - `fade` — opacity transition; pair with a state toggle (`opacity-0` /
 *   `opacity-100`) to drive the fade in/out at the consumer site.
 */
export const animations = {
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  fade: 'transition-opacity duration-200 ease-in-out',
} as const;

/**
 * Union of supported animation keys. Mirrors `keyof typeof animations`.
 */
export type AnimationKey = keyof typeof animations;

/**
 * Class string emitted for a given animation key. Convenience type for atoms
 * that store a class string in component state (e.g. animation variants).
 */
export type AnimationClass = (typeof animations)[AnimationKey];
