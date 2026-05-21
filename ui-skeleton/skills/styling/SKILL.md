---
name: styling
description: Use when touching globals.css, declaring a design token, adding an animation, choosing colors for a variant, or anything Tailwind v4 related. Covers the @theme block, palette fallbacks, animation keyframes, tailwind-merge behaviors, and the silent-drop trap for undeclared tokens.
---

# Styling

This skill covers everything between `src/styles/globals.css` and the class strings inside `*.variants.ts` files. If you're writing a variant axis itself (CVA mechanics), pair this with [../cva-variants/SKILL.md](../cva-variants/SKILL.md).

## Stack

- **Tailwind CSS v4** — single entry, CSS-driven config via `@theme`.
- **PostCSS** — wired via `postcss.config.mjs` using `@tailwindcss/postcss`. Required for tooling that runs PostCSS independently (some Storybook configs).
- **Vite plugin** — `@tailwindcss/vite` is the preferred integration for Vite-driven builds.

Both the PostCSS plugin and the Vite plugin coexist this iteration. Don't remove either without verifying Storybook still compiles styles.

## The Tailwind v4 entry

The single stylesheet entry is `src/styles/globals.css`. It is the only place that declares tokens or `@layer` rules for this package.

```css
@import "tailwindcss";

@theme {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.15 0 0);
  --color-primary: oklch(0.55 0.18 250);
  --color-primary-foreground: oklch(0.98 0 0);
  /* ... see the full file for all declared tokens ... */
  --radius: 0.5rem;
  --animate-spin: spin 1s linear infinite;
  --animate-wave: skeleton-wave 1.6s ease-in-out infinite;
  --shadow-elev-1: 0 1px 2px oklch(0 0 0 / 0.08);
  --shadow-elev-2: 0 4px 8px oklch(0 0 0 / 0.10);
}

@keyframes skeleton-wave {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@layer base {
  *, ::before, ::after { @apply border-border; }
  body { @apply bg-background text-foreground antialiased; }
}
```

### Tailwind v4 differences from v3 worth knowing

- The single `@import "tailwindcss";` directive replaces the v3 trio of `@tailwind base/components/utilities`.
- Design tokens live inside a top-level `@theme { ... }` block as CSS custom properties (`--color-*`, `--radius`, `--shadow-*`, `--animate-*`). Tailwind generates matching utilities automatically (e.g., `--color-primary` → `.bg-primary`, `.text-primary`, `.ring-primary`, etc.).
- `@keyframes` blocks live at the **top level** of the stylesheet, NOT inside `@theme`. The `--animate-*` token in `@theme` binds the utility name; the `@keyframes` block defines the actual animation. The keyframes identifier can differ from the utility name (e.g. utility `animate-wave` bound to keyframes `skeleton-wave`).

## The silent-token-drop trap (CRITICAL)

**Tailwind v4 silently drops utility classes that reference undeclared `@theme` tokens.** No build warning, no console message, the class simply does not appear in the compiled CSS bundle.

Example: a variant references `bg-card` and `text-card-foreground`, but neither `--color-card` nor `--color-card-foreground` is declared in `globals.css`. The classes `.bg-card{...}` and `.text-card-foreground{...}` are absent from `preview-*.css`. Rendering can still look correct due to sibling-variant overrides and cascade from `body`'s base rules, but the references are dead.

### How to verify token coverage

For every new color / shadow / animation utility you add to a variant block:

1. Grep the source for the utility pattern: `grep -rn 'bg-card\|text-card' src/atoms/`.
2. Confirm the matching token exists in `src/styles/globals.css`: `grep '\-\-color-card' src/styles/globals.css`.
3. After `bun run build-storybook`, inspect `storybook-static/assets/preview-*.css` to confirm the utility appears: `grep '.bg-card' storybook-static/assets/preview-*.css`.

Steps 1–2 are mandatory on every variant change. Step 3 is the headless verification for "tokens actually reach the bundle" — see [../storybook/SKILL.md](../storybook/SKILL.md) for the full end-to-end check.

## Adding a token

If a variant needs a semantic token that doesn't exist yet:

1. Add `--<token>-<name>: <oklch value>;` inside `@theme { }` in `src/styles/globals.css`. Use OKLCH for colors (matches the existing palette and gives better perceptual blending).
2. Add the foreground pair if it's a background color: `--color-<name>-foreground: <contrasting oklch>;`.
3. Add a brief justification in the per-atom README (Variants section or a comment in `<component>.variants.ts`) explaining what the token represents.
4. Verify with the grep + preview-css check above.

## Adding a non-semantic palette color

Tailwind v4's default color palette (red, emerald, slate, etc.) remains available even when `@theme` only declares a constrained set of semantic tokens. `@theme` ADDS or OVERRIDES named entries — it does NOT clear the defaults.

**Rule of thumb:** Reach for a palette color (e.g. `border-emerald-500`) when a UI state needs a one-off color and a semantic token doesn't yet exist for it. Document the choice in the component README so a future iteration can promote it to a proper token without breaking the public variant API.

Example: success state on a form control could ship as `border-emerald-500` initially; if `--color-success` is later added to `@theme`, the variant can switch to `border-success` without API churn.

## Animations

Adding a new animation requires **two** CSS additions:

1. A `--animate-<name>: <keyframes-identifier> <duration> <timing> <iteration>;` token inside `@theme`. This generates the `animate-<name>` utility class.
2. A sibling **top-level** `@keyframes <keyframes-identifier> { ... }` block defining the actual keyframes.

```css
@theme {
  /* ... other tokens ... */
  --animate-shimmer: shimmer 1.2s ease-in-out infinite;
}

@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

The two identifiers don't have to match (utility `animate-shimmer` ↔ keyframes `shimmer` — clearer when they do; technically not required). The token's value binds them.

### Default animations that don't need extra setup

Tailwind v4 ships `animate-pulse`, `animate-spin`, `animate-ping`, `animate-bounce` out of the box. Use them directly.

## tailwind-merge behaviors worth knowing

Class merging happens via `cn()` (from `clsx` + `tailwind-merge`). Two non-obvious behaviors:

- **`bg-<color>` (background-color) and `bg-gradient-to-<dir>` (background-image) are separate groups.** They coexist on the same element rather than the gradient overriding the color. If a base class block sets `bg-muted` and a variant adds `bg-gradient-to-r from-* via-* to-*`, both classes survive the merge — the gradient image paints on top of the color. You don't need to lift the color into every variant branch.
- **Order matters** for utilities in the same group. The last one wins after merging. This is why variant classes should come after base classes in the cva block.

## Patterns for specific paint properties

### Tonal color via a single channel

For ring/border patterns where one tonal color should drive multiple paint properties (e.g. a spinner where border and text both need the same color), drive the color through `text-<token>` + `border-current` (or `fill-current`, `stroke-current`) rather than `border-<color>` directly.

- The variant axis touches `text-*` only — one short class per variant value.
- The base class block hard-codes `border-current border-t-transparent rounded-full`.
- This collapses N variant pairs of `(border-*, text-*)` into N single classes.

Same trick works for any visual that wants a single tonal color to drive multiple paint properties.

### Arbitrary values in cva blocks

Arbitrary-value Tailwind classes (`border-[3px]`, `w-[7.5rem]`, `aspect-[16/9]`) are fine to use sparingly inside cva variant blocks where the design-token vocabulary doesn't cover the case. Each one generates exactly one utility class at compile time, and the value is fixed (de-duped by the compiler) so the cost only matters if it depended on runtime data.

**Rule:** Arbitrary values are OK for **static** variant values. Don't use them with runtime-interpolated values (`w-[${pct}%]`) — that regenerates a utility per render and bloats the CSS.

For static one-offs, prefer arbitrary values over inflating `@theme` with one-off entries.

### `peer` for sibling state tracking

Pair an interactive control with class `peer` and put `peer-disabled:opacity-50 peer-disabled:cursor-not-allowed` (or similar `peer-*` modifiers) on the sibling element to track state via CSS. Works because Radix forwards native `disabled` onto the underlying element, so the `:disabled` pseudo-class fires. See checkbox/radio/switch patterns in [../radix-wrappers/SKILL.md](../radix-wrappers/SKILL.md).

## Accessibility-related utilities

Tailwind v4 ships these by default — no `@theme` additions needed:

- `sr-only` — visually hidden, exposed to assistive tech.
- `border-current`, `text-current`, `fill-current`, `stroke-current`.
- `border-t-transparent` and the rest of the directional transparent borders.

## Where to put what

| Concern | Location |
|---|---|
| Design tokens (colors, radii, shadows, animation token bindings) | `src/styles/globals.css` `@theme { }` block |
| Keyframe definitions | `src/styles/globals.css` top-level `@keyframes` |
| Base global rules (body color, border-color reset) | `src/styles/globals.css` `@layer base` |
| Per-component variants | `src/atoms/<Component>/<component>.variants.ts` |
| Cross-component class helpers (focus ring, disabled state, ...) | `src/particles/mixins.ts` |
| Class merging | `cn()` from `src/particles/cn.ts` |

## Where this does NOT live

The sibling `../design-system/colors_and_type.css` is referenced manually in upstream notes but is NOT imported into `globals.css` this iteration. Tokens are mirrored locally. Workspace-level integration is deferred — see [../../NEXT-ITERATIONS.md](../../NEXT-ITERATIONS.md).
