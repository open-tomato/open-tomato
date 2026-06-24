/**
 * TypeScript mirror of `@theme` token names declared in
 * `src/styles/globals.css`. Provides type-safe access to the design token
 * surface (radius, animate, shadow) so atoms and particle helpers can
 * reference token keys without stringly-typed lookups.
 *
 * The CSS `@theme { ... }` block is the source of truth for token values —
 * keep this file in sync when token names are added, renamed, or removed.
 */

/**
 * Border-radius tokens. Mirrors the `--radius` custom property declared
 * in `@theme`. Tailwind v4 derives `rounded-*` utilities from this base.
 */
export const radiusTokens = ['default'] as const;
export type RadiusToken = (typeof radiusTokens)[number];

/**
 * Animation tokens. Each entry maps to an `--animate-<key>` declaration
 * in `@theme` and the corresponding `animate-<key>` Tailwind utility.
 */
export const animateTokens = ['spin'] as const;
export type AnimateToken = (typeof animateTokens)[number];

/**
 * Box-shadow elevation tokens. Each entry maps to a `--shadow-<key>`
 * declaration in `@theme` and the corresponding `shadow-<key>` utility.
 */
export const shadowTokens = ['elev-1', 'elev-2'] as const;
export type ShadowToken = (typeof shadowTokens)[number];
