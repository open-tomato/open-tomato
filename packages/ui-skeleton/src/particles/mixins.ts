/**
 * Composable className mixins reused across atoms (Button, Input, Toggle,
 * Checkbox, ...).
 *
 * Atoms should compose these constants via `cn()` instead of repeating the
 * underlying `focus-visible:*` / `disabled:*` utility strings, so that
 * interaction states stay consistent with the `--color-ring` token declared
 * in `src/styles/globals.css`.
 *
 * - `focusRing` — visible keyboard focus ring using `--color-ring`. Pair with
 *   `focus-visible:outline-none` so the native outline does not stack with
 *   the ring.
 * - `disabled` — non-interactive, dimmed state. Mirrors shadcn's convention
 *   of suppressing pointer events and reducing opacity rather than hiding
 *   the element.
 */
export const mixins = {
  focusRing:
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  disabled: 'disabled:pointer-events-none disabled:opacity-50',
} as const;

/**
 * Union of supported mixin keys. Mirrors `keyof typeof mixins`.
 */
export type MixinKey = keyof typeof mixins;

/**
 * Class string emitted for a given mixin key. Convenience type for atoms
 * that store a mixin class string in component state.
 */
export type MixinClass = (typeof mixins)[MixinKey];
