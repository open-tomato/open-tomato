# UI Skeleton — Atom Authoring Convention

This file is the canonical reference for future agents that add, edit, or
generate atom components in `packages/ui-skeleton/`. Read it in full before
touching any file under `src/atoms/`.

## Layer overview

`src/` is organized by atomic-design layer. Every layer has a barrel `index.ts`
that re-exports its children, and the package root barrel `src/index.ts`
re-exports every layer.

```text
src/
├── index.ts                 # top-level barrel
├── styles/globals.css       # Tailwind v4 entry + @theme tokens
├── particles/               # shared helpers (cn, variants, tokens, mixins, ...)
├── atoms/                   # single-entry component wrappers (this doc)
├── molecules/               # placeholder barrel this iteration
├── organisms/               # placeholder barrel this iteration
├── providers/               # placeholder barrel this iteration
├── templates/               # placeholder barrel this iteration
└── pages/                   # placeholder barrel this iteration
```

## Per-atom file set

Every atom lives in its own directory under `src/atoms/<Component>/` and
contains exactly six files. The set is non-negotiable — do not omit, rename,
or merge files.

```text
src/atoms/<Component>/
├── <Component>.tsx              # React component (PascalCase)
├── <component>.variants.ts      # CVA variants (lowercase)
├── <Component>.test.tsx         # Vitest + Testing Library + jest-axe
├── <Component>.stories.tsx      # Storybook 8 stories with autodocs
├── README.md                    # per-component documentation
└── index.ts                     # barrel re-exporting the component + variants
```

### File-by-file requirements

1. **`<Component>.tsx`** — PascalCase filename matching the directory.
   - Default export forbidden; use a named export wrapped in `React.forwardRef`.
   - TSDoc on the exported component (one-line summary, `@remarks`, `@example`).
   - Props declared as a named `interface <Component>Props` that extends the
     underlying HTML element attrs (or Radix primitive props) and the
     `VariantProps` derived from the variants file.
   - All styling MUST flow through the variants call: `cn(<component>Variants({ ... }), className)`.
   - `className` is the only escape hatch; document that it is discouraged.
   - When the atom needs polymorphism, use the Radix `Slot` pattern via an
     `asChild?: boolean` prop (single child required).
   - Set `<Component>.displayName = "<Component>"` after `forwardRef`.

2. **`<component>.variants.ts`** — lowercase filename.
   - Exports `<component>Variants` built with `cva(...)` and a sibling type
     `<Component>Variants = VariantProps<typeof <component>Variants>`.
   - Base classes first, then `variants` block, then `defaultVariants`.
   - Use design-system tokens from `@/styles/globals.css` (e.g. `bg-primary`,
     `text-foreground`, `ring-ring`, `shadow-elev-1`); avoid raw colors.
   - Only this file and `particles/` may use `cva` directly — the component
     file imports the call expression, never builds its own variants inline.

3. **`<Component>.test.tsx`** — Vitest + React Testing Library + jest-axe.
   - Minimum three assertions: renders children, applies a variant class for
     at least one non-default variant, no a11y violations via `await axe(...)`.
   - Use `@testing-library/jest-dom/vitest` matchers (registered in
     `vitest.setup.ts`).
   - Coverage thresholds apply per-package, not per-file: 80% lines /
     80% statements / 75% branches / 80% functions.

4. **`<Component>.stories.tsx`** — Storybook 8 (`@storybook/react-vite`).
   - `title: "Atoms/<Component>"`, `component: <Component>`,
     `tags: ["autodocs"]`.
   - At minimum: a `Default` story and an `AllVariants` matrix story that
     renders every variant value side-by-side.
   - Declare `argTypes` for every variant prop so controls are usable.

5. **`README.md`** — per-component documentation. Sections in this order:
   - `# <Component>` (single H1; do not add a second H1 anywhere in the file)
   - One-sentence description and which shadcn primitive(s) it wraps.
   - `## Import` — single line: `import { <Component> } from "@open-tomato/ui-skeleton";`
   - `## Props` — table of props, types, defaults.
   - `## Variants` — table or matrix of variant values.
   - `## Accessibility` — keyboard, ARIA, focus, and `data-*` notes.
   - `## Do / Don't` — short list reinforcing the variant-only styling rule.

6. **`index.ts`** — barrel for the directory.
   ```ts
   export * from './<Component>';
   export * from './<component>.variants';
   ```

## Naming and import conventions

- **Component file**: PascalCase, e.g. `Button.tsx`, `AspectRatio.tsx`.
- **Variants file**: lowercase + `.variants.ts`, e.g. `button.variants.ts`,
  `aspect-ratio.variants.ts` (kebab-case for multi-word names).
- **Test file**: PascalCase + `.test.tsx`.
- **Story file**: PascalCase + `.stories.tsx`.
- **Path alias**: import from `@/...` (resolves to `src/...`); never use deep
  relative paths like `../../particles/cn`.
- **Quotes**: single quotes in `.ts` / `.tsx` (ESLint auto-fixes; write that
  way from the start to keep diffs clean).
- **Barrels re-export with `export *`** unless there is a name collision; in
  that case re-export explicitly.

## Authoring rules

- **Variant-only styling**: consumers tune visuals through variants. Never
  expose raw Tailwind utilities as props, and never read `className` from
  props to "merge in" arbitrary classes — `cn(...)` order already gives
  consumers the escape hatch.
- **Types colocated** in `<Component>.tsx` for atoms. Split into a separate
  `<Component>.types.ts` only when discriminated unions are shared with
  other components (molecule level and up).
- **No default exports** anywhere under `src/atoms/`.
- **No barrel side effects**: barrels only re-export.
- **Shared helpers belong in `particles/`**. If two atoms need the same
  className helper, lift it to `src/particles/mixins.ts` (or a new particle
  module) rather than copying.
- **`asChild` polymorphism**: required for any atom that callers will
  reasonably want to render as `<a>`, Next `<Link>`, etc. Uses
  `@radix-ui/react-slot`.

## Registry integration

Every atom must also be appended to `registry.json` `items[]` with:

- `name`: kebab-case (e.g. `aspect-ratio`)
- `type`: `registry:ui`
- `files`: paths to the `.tsx` and `.variants.ts`
- `registryDependencies`: any `@radix-ui/*` packages it wraps

The registry is internal-only and never published, but the shadcn CLI uses it
locally and downstream apps can mirror entries.

## When in doubt

- The canonical reference atom is **Button** — copy its shape (file layout,
  TSDoc style, variant naming, test structure, story structure, README
  structure) for every new atom.
- Authored-from-scratch atoms (Typography, Spinner, Kbd) still follow the
  same six-file convention; only the underlying primitive differs.
- If a convention here conflicts with `PLAN.md` or `PLAN_TRACKER.md`, the
  plan files win for scope; this file wins for file layout and naming.
