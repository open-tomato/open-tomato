---
name: atom-authoring
description: Use when adding a new atom, editing an existing atom's file layout, or anything that touches the six-file convention under src/atoms/<Component>/. Covers naming, displayName, forwardRef, asChild polymorphism, the no-public-className rule, and the per-atom generation procedure.
---

# Atom Authoring

This skill is the canonical source for "how an atom is built" in `packages/ui-skeleton/`. Read it end-to-end before adding or restructuring any atom.

## The contract: six files, one directory, no exceptions

Every atom lives in its own directory under `src/atoms/<Component>/` and contains exactly six files. Do not omit, rename, or merge files.

```text
src/atoms/<Component>/
├── <Component>.tsx              # React component (PascalCase)
├── <component>.variants.ts      # CVA variants (lowercase / kebab-case)
├── <Component>.test.tsx         # Vitest + Testing Library + jest-axe
├── <Component>.stories.tsx      # Storybook 8 stories with autodocs
├── README.md                    # per-component documentation
└── index.ts                     # barrel re-exporting the component + variants
```

The set is enforced by tooling (registry.json schema, downstream consumers, the lint pipeline) and by team convention. Six files in, six files out.

## File-by-file requirements

### 1. `<Component>.tsx` — the component

- PascalCase filename matching the directory name.
- **No default exports.** Use a named export wrapped in `React.forwardRef`.
- Set `<Component>.displayName = "<Component>";` immediately after `forwardRef`.
- TSDoc on the exported component: one-line summary, `@remarks`, `@example`.
- Props declared as a named `interface <Component>Props` that extends the underlying HTML element attrs (or Radix primitive props) **plus** the `VariantProps` derived from the variants file.
- All styling MUST flow through the variants call: `cn(<component>Variants({ ... }))`. Do NOT accept a public `className` prop — see the className rule below.
- When the atom needs polymorphism, use the Radix `Slot` pattern via an `asChild?: boolean` prop (single child required).
- Import the variants from the sibling file. Never re-derive variant logic inline.

### 2. `<component>.variants.ts` — the variants

- Lowercase filename (`button.variants.ts`); kebab-case for multi-word names (`aspect-ratio.variants.ts`).
- Exports `<component>Variants` built with `cva(...)` and a sibling type `<Component>Variants = VariantProps<typeof <component>Variants>`.
- Order inside the cva block: base classes first, then `variants`, then `defaultVariants`.
- Use design-system tokens from `@/styles/globals.css` (e.g. `bg-primary`, `text-foreground`, `ring-ring`, `shadow-elev-1`) — never raw colors. See [../styling/SKILL.md](../styling/SKILL.md) for the token contract.
- Only this file and `src/particles/` may call `cva` directly. The component file imports the call expression; it never builds its own variants inline.
- For deeper CVA patterns (variant maps, boolean axes, multi-element variants, polymorphic axes), see [../cva-variants/SKILL.md](../cva-variants/SKILL.md).

### 3. `<Component>.test.tsx` — the tests

Minimum three assertions per atom:

1. Renders children (or the configured slot content).
2. Applies a variant class for at least one non-default variant.
3. No a11y violations: `await axe(container)` returns `toHaveNoViolations()`.

Use `@testing-library/jest-dom/vitest` matchers (registered in `vitest.setup.ts`). Coverage thresholds apply per-package, not per-file: 80% lines / 80% statements / 75% branches / 80% functions.

For testing pitfalls (jsdom limits, Radix gated behaviors, `ResizeObserver` polyfill, `bun test` vs `bun run test`), see [../component-testing/SKILL.md](../component-testing/SKILL.md).

### 4. `<Component>.stories.tsx` — the stories

- `title: 'Atoms/<Component>'`
- `component: <Component>`
- `tags: ['autodocs']`
- Minimum two stories: a `Default` story and an `AllVariants` matrix that renders every variant value side-by-side.
- Declare `argTypes` for every variant prop so controls are usable.

For Storybook configuration, headless verification, and the addon stack, see [../storybook/SKILL.md](../storybook/SKILL.md).

### 5. `README.md` — per-component documentation

Sections, in this order:

- `# <Component>` (single H1 — markdown lint enforces no second H1 anywhere in the file)
- One-sentence description and which shadcn primitive(s) it wraps (or "authored from scratch" if it has no shadcn equivalent).
- `## Import` — single line: `import { <Component> } from '@open-tomato/ui-skeleton';`
- `## Props` — table of props, types, defaults.
- `## Variants` — table or matrix of variant values.
- `## Accessibility` — keyboard, ARIA, focus, and `data-*` notes.
- `## Do / Don't` — short list reinforcing the variant-only styling rule.

Top-level sections are H2 (`##`); nested categories are H3 (`###`). Don't skip heading levels — `markdown/heading-increment` will fail `bun lint`. Every fenced code block needs an explicit language tag (`text` for ASCII trees, `bash` for shell, `tsx`/`ts`/`css` for code).

### 6. `index.ts` — the barrel

```ts
export * from './<Component>';
export * from './<component>.variants';
```

Two lines. Nothing else. No side effects, no default exports.

## Naming and import conventions

- **Component file**: PascalCase (`Button.tsx`, `AspectRatio.tsx`).
- **Variants file**: lowercase + `.variants.ts`; kebab-case for multi-word (`aspect-ratio.variants.ts`).
- **Test file**: PascalCase + `.test.tsx`.
- **Story file**: PascalCase + `.stories.tsx`.
- **Path alias**: import from `@/...` (resolves to `src/...`). Never use deep relative paths like `../../particles/cn`. Sibling imports inside the same atom directory use `./<name>`.
- **Quotes**: single quotes in `.ts` / `.tsx`. ESLint auto-fixes — write that way to keep diffs clean.
- **Barrels**: `export *` unless there's a name collision; in that case, re-export explicitly.
- **Imports**: ESLint enforces grouping/sorting. Expect `import * as React from 'react'` to be grouped with third-party; `@/...` lives in its own group below; relative `./...` is last. Write imports already grouped this way.

## The className rule (cardinal)

**Atoms MUST NOT accept `className` as a public prop.** Styling is controlled exclusively through variants. This is enforced both at the type level (the props interface either does not extend an HTMLAttributes type or explicitly omits `className` from it) and at the runtime level (the `cn()` call inside the component takes no consumer string).

What this means in practice:

- Do NOT include `className` in the public props interface.
- Do NOT destructure `className` from props.
- Do NOT pass a consumer-supplied string into `cn(...)`.
- DO add `'className'` to the existing `Omit<...>` clause when the props interface extends a React HTMLAttributes type. Without the `Omit`, `className` is implicitly inherited and would land on the DOM via `{...rest}`.

What's still fine:

- Inside an atom, `cn()` can compose classes from a base block plus variant-driven conditions (e.g., `cn(baseClasses, isDisabled && 'opacity-50')`).
- Inline `style={{...}}` is acceptable for values that genuinely need runtime computation (e.g., Progress's indicator `translateX`, Skeleton's `width`/`height`/`size` props that emit explicit dimensions).

If a consumer needs a knob the current variants don't cover, that's a signal the variant API is incomplete — add a variant axis, don't open a className escape hatch.

**Compliance is universal as of Phase 2.** Every atom under `src/atoms/` follows this rule. Button remains the canonical reference — open `src/atoms/Button/Button.tsx` to see the props interface using `Omit<..., 'className'>` and the bare `cn(buttonVariants({...}))` call.

## Authoring rules

- **Types colocated** in `<Component>.tsx` for atoms. Split into a separate `<Component>.types.ts` only when discriminated unions are shared with other components (molecule level and up).
- **No default exports** anywhere under `src/atoms/`.
- **No barrel side effects** — barrels only re-export.
- **Shared helpers belong in `particles/`**. If two atoms need the same className helper, lift it to `src/particles/mixins.ts` (or a new particle module) rather than copying.
- **`asChild` polymorphism**: required for any atom that callers will reasonably want to render as `<a>`, Next `<Link>`, etc. Uses `@radix-ui/react-slot`. See [../radix-wrappers/SKILL.md](../radix-wrappers/SKILL.md) for the `Slot` + `Slottable` pattern and the icon-sibling trap.
- **Default `type='button'`** when wrapping a native `<button>`, but skip the default when `asChild` is true (the rendered element may not be a `<button>`). Pattern: `type={asChild ? undefined : (type ?? 'button')}`.
- **Polymorphic `as` prop** for atoms that render one of N intrinsic elements (Typography). Constrain `as` to a closed string union, not the generic `<T extends ElementType>` dance. See [../cva-variants/SKILL.md](../cva-variants/SKILL.md) for the pattern.

## The atom is also a registry item

Every atom must appear in `registry.json` `items[]` (file lives at the package root). Required fields:

- `name`: kebab-case (e.g. `aspect-ratio`, `scroll-area`).
- `type`: `registry:ui`.
- `files`: array of `{ path, type }` entries pointing at the `.tsx` and `.variants.ts` (repo-relative paths like `src/atoms/Button/Button.tsx`).
- `registryDependencies`: array of npm package names the wrapper imports beyond `react` and `@/particles/cn` (e.g. `@radix-ui/react-slot`, `@radix-ui/react-checkbox`, `lucide-react`). Empty array for pure-CVA atoms with no external imports.

For registry semantics, the shadcn CLI workflow, and how `registryDependencies` differs from shadcn's evolving `radix-ui` umbrella convention, see [../shadcn-integration/SKILL.md](../shadcn-integration/SKILL.md).

## Per-atom procedure (copy from Button)

Iteration 1 chose **hand-write Button as the canonical reference, copy-shape for every other atom**. No code-generation script, no plop/hygen templates. Each atom is authored in its own task by reading Button and adapting.

### Why not templates or codegen

- Per-atom logic diverges enough (Radix wrappers vs. pure CVA vs. polymorphic `as` prop) that templates would have too many holes; a literal copy of Button is a better starting point.
- The agent loop processes one atom per task — consistency comes from the shared reference, not from runtime generation.
- Direct inspection of Button is unambiguous and reviewable; a generator would add a dependency and hide the convention behind tooling.
- `bunx shadcn@latest add <atom>` can be consulted for the underlying primitive shape, but its output never lands in `src/atoms/` directly — always rewrite into the six-file wrapper convention. See [../shadcn-integration/SKILL.md](../shadcn-integration/SKILL.md) for shadcn's lowercase-flat default and how to translate it.

### Procedure

For each new atom:

1. Open `src/atoms/Button/` and read all six files end-to-end. Button is ground truth for file layout, TSDoc style, variant naming, test structure, story structure, README structure.
2. Look up the atom's spec (variants, props, underlying primitive) wherever the iteration's planning lives — usually a Linear ticket, design-system doc, or a transient planning document at the package root. That spec is the only intentional deviation from Button.
3. Create `src/atoms/<Component>/` with the six required files. Start each file by copying its Button counterpart, then adapt:
   - `<component>.variants.ts`: rename `buttonVariants` → `<component>Variants`, replace the `variants` block per the spec.
   - `<Component>.tsx`: rename the component and props interface, swap the rendered element (or Radix primitive import), keep the `forwardRef` + `cn(<component>Variants({...}))` shape. Drop `asChild` / `Slot` if polymorphism is not needed.
   - **Props interface inheritance**: when the props interface extends a React HTMLAttributes type (or a Radix primitive's props), `Omit` the keys that collide with variant axes AND `'className'`. Button's canonical shape is `extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'className'>, ButtonVariants` — `'color'` is omitted because the native `color` attribute conflicts with a categorical variant axis, and `'className'` is omitted per the cardinal rule above. Replicate the pattern: keep `'className'` in every atom's `Omit<...>`, and add any other native attribute names (`'size'` on `<input>`/`<select>`, `'color'` when the cva block declares a `color` variant) that collide with categorical axes. Without the `Omit`, the colliding key is inherited and either breaks the variant typing or leaks to the DOM via `{...rest}`.
   - `<Component>.test.tsx`: keep the same three-assertion shape (renders, variant class, no a11y violations). Adjust the role / variant under test.
   - `<Component>.stories.tsx`: copy meta shape, retitle `Atoms/<Component>`, adjust `argTypes` and the `AllVariants` matrix.
   - `README.md`: copy the section order, fill the props/variants tables, rewrite the Do/Don't bullets if non-obvious.
   - `index.ts`: re-export the component and the variants module.
4. Append the atom to `registry.json` `items[]`.
5. Run `bun run check-types && bun run test && bun run lint` locally. Do not move on while any of them fails.

### Authored-from-scratch atoms (Kbd, Spinner, Typography)

These have no shadcn equivalent. They still follow the six-file convention and still copy Button's shape. The only difference: the rendered element is a plain HTML tag (`<kbd>`, `<div>`, or a polymorphic `as` prop) and there is no Radix import. Treat them like Badge or Skeleton — pure CVA over a primitive element.

## Layer overview (where atoms sit)

```text
src/
├── index.ts                 # top-level barrel — re-exports every layer
├── styles/globals.css       # Tailwind v4 entry + @theme tokens
├── particles/               # shared helpers (cn, variants, tokens, mixins, ...)
├── atoms/                   # THIS FILE'S DOMAIN — single-entry wrappers
├── molecules/               # placeholder barrel
├── organisms/               # placeholder barrel
├── providers/               # placeholder barrel
├── templates/               # placeholder barrel
└── pages/                   # placeholder barrel
```

The placeholder barrels (`molecules`, `organisms`, `providers`, `templates`, `pages`) re-export from the top-level barrel via `// eslint-disable-next-line import/export -- placeholder barrel until <layer> ship` comments. When a layer ships real exports, remove the suppression rather than refactoring the placeholder shape — the per-line comment is intentional and removes cleanly.

## When in doubt

- Open Button and read it.
- The relevant skill (linked from each section above) has the deeper context.
- If a convention here conflicts with a transient planning doc (iteration plan, ticket spec), the planning doc wins for scope; this skill wins for file layout and naming.
