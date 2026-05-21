---
name: molecule-authoring
description: Use when adding a new molecule, editing an existing molecule's file layout, or anything that touches the six-file convention under src/molecules/<Component>/. Covers naming, displayName, forwardRef, the no-public-className rule, the layer-import (composition) rule, slot-prop vocabulary, variant propagation, the Radix-trigger pattern, and the per-molecule generation procedure.
---

# Molecule Authoring

This skill is the canonical source for "how a molecule is built" in `packages/ui-skeleton/`. Read it end-to-end before adding or restructuring any molecule. Atoms (single-element wrappers) are covered in [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md) — read that first if you have not yet. The molecule layer composes atoms; everything that holds for atoms holds for molecules unless this file overrides it.

## The contract: six files, one directory, no exceptions

Every molecule lives in its own directory under `src/molecules/<Component>/` and contains exactly six files. The set is identical to the atom layer; the contents differ.

```text
src/molecules/<Component>/
├── <Component>.tsx              # React component (PascalCase) — composes atoms
├── <component>.variants.ts      # CVA variants (lowercase / kebab-case)
├── <Component>.test.tsx         # Vitest + Testing Library + jest-axe
├── <Component>.stories.tsx      # Storybook 8 stories with autodocs
├── README.md                    # per-component documentation (includes ## Composition)
└── index.ts                     # barrel re-exporting the component + variants
```

The set is enforced by tooling (registry.json schema, downstream consumers, the lint pipeline) and by team convention. Six files in, six files out. No exceptions for "stateless wrappers" or "single-axis molecules".

## File-by-file requirements

### 1. `<Component>.tsx` — the component

- PascalCase filename matching the directory name.
- **No default exports.** Use a named export wrapped in `React.forwardRef`.
- Set `<Component>.displayName = "<Component>";` immediately after `forwardRef`.
- TSDoc on the exported component: one-line summary, `@remarks` (call out variant-propagation lookup tables and which atoms are composed), `@example`.
- Props declared as a named `interface <Component>Props` that extends the rendered root element's attrs (or the Radix root primitive's props) **plus** the `VariantProps` derived from the variants file.
- **No `className` in the props interface.** Add `'className'` to the `Omit<...>` clause on every HTMLAttributes-derived parent type. The className rule (cardinal) below has the full rationale.
- Standard slot-prop vocabulary lives on the public API (see "Slot props" below). Slot content renders raw inside composed atoms — molecules do NOT inject styling into consumer-supplied nodes.
- All molecule styling MUST flow through the variants call: `cn(<component>Variants({ ... }))` for the root and/or `cn(<componentSubpart>Variants({ ... }))` for header/content/footer subparts. Do NOT accept a public `className` prop and do NOT pass a `className` string into a composed atom — see the className rule below.
- Variant propagation from the molecule's axes to each composed atom's axes lives in **lookup tables** colocated with the component (see "Variant propagation" below).
- Import composed atoms from `@/atoms/<Name>`. Import the variants from the sibling `<component>.variants.ts`. Never re-derive variant logic inline.

### 2. `<component>.variants.ts` — the variants

- Lowercase filename (`alert.variants.ts`); kebab-case for multi-word names (`button-group.variants.ts`).
- Exports `<component>Variants` built with `cva(...)` and a sibling type `<Component>Variants = VariantProps<typeof <component>Variants>`.
- A molecule's root cva often emits an **empty class string** for every variant value — visible styling comes from the composed atoms via lookup-table propagation. The empty cva still exists so `VariantProps<typeof <component>Variants>` produces the public type that the props interface extends. Alert is the canonical demonstration; see "The canonical reference: Alert" below.
- For subpart styling that the molecule owns (e.g. Alert's `alertHeaderVariants` selecting per-severity leading-icon tint via a descendant selector), export additional cva blocks from the same file (`<component><Subpart>Variants`).
- Order inside each cva block: base classes first, then `variants`, then `defaultVariants`.
- Use design-system tokens from `@/styles/globals.css` (e.g. `bg-primary`, `text-foreground`, `ring-ring`, `shadow-elev-1`) — never raw colors. See [../styling/SKILL.md](../styling/SKILL.md) for the token contract.
- Only this file and `src/particles/` may call `cva` directly. The component file imports the call expression; it never builds its own variants inline.
- For deeper CVA patterns (variant maps, boolean axes, multi-element variants, polymorphic axes, the `Omit<...,'size'>` trap), see [../cva-variants/SKILL.md](../cva-variants/SKILL.md).

### 3. `<Component>.test.tsx` — the tests

Molecule tests have a **five-assertion baseline**, expanded from the atom layer's three:

1. **Renders all slots.** Query each slot (`leading`, `title`, `description`, body `children`, `actions`, etc.) via `getByText`, `getByTestId`, or `data-slot=...` selectors. A missing slot is a silent regression.
2. **Composes the expected atom role(s).** Use `getByRole('alert')` for Alert, `getByRole('switch')` for Switch, `getByRole('group')` for ButtonGroup, etc. Confirms the molecule actually delegates to the expected atom and not a generic `<div>`.
3. **Variant propagation.** Pass a non-default value on the molecule's axis (e.g. `size="lg"`) and assert that the composed atoms receive the mapped variant — query via `data-*` attributes on the rendered atom (e.g. `toHaveAttribute('data-padding', 'lg')` on the Card root, `toHaveAttribute('data-variant', 'h3')` on the rendered title). Avoid brittle className introspection.
4. **No a11y violations.** `await axe(container)` returns `toHaveNoViolations()`.
5. **State behavior.** For stateful molecules (Popover, Tooltip, Switch, RadioGroup, etc.), verify the controlled/uncontrolled flow: open/close, hover, checked, value change. Use `screen.findByRole(...)` (the `find*` family) for portaled content — Radix Portal renders outside `container`, so `getByRole(...)` on the bound container will miss it.

Stateless molecules (Alert, ButtonGroup, Item, Table) still meet the first four; the fifth becomes a "renders custom override" assertion (e.g. Alert's `header` override replacing the default `title` + `description` layout).

Use `@testing-library/jest-dom/vitest` matchers (registered in `vitest.setup.ts`). Coverage thresholds apply per-package, not per-file: 80% lines / 80% statements / 75% branches / 80% functions.

For testing pitfalls (jsdom limits, Radix gated behaviors, `ResizeObserver` polyfill, `bun test` vs `bun run test`, the portal/`findByRole` rule, Tooltip's `delayDuration={0}` test override), see [../component-testing/SKILL.md](../component-testing/SKILL.md).

### 4. `<Component>.stories.tsx` — the stories

- `title: 'Molecules/<Component>'`
- `component: <Component>`
- `tags: ['autodocs']`
- Minimum stories:
  - `Default` — the simplest meaningful invocation.
  - `AllVariants` — matrix rendering every variant value side-by-side.
  - For stateful molecules: at least one state-demo story (`Open`, `Checked`, `WithCustomTrigger`) that exercises the controlled API or interactive flow. Storybook autodocs renders these in the docs page.
  - For slot-heavy molecules: at least one story that exercises a non-default slot override (`WithCustomHeader`, `WithActions`).
- Declare `argTypes` for every variant prop so controls are usable; declare `argTypes: { className: { table: { disable: true } } }` is **not** needed — molecules don't expose `className`, so it simply isn't in the props interface.

For Storybook configuration, headless verification, and the addon stack, see [../storybook/SKILL.md](../storybook/SKILL.md).

### 5. `README.md` — per-component documentation

Sections, in this order:

- `# <Component>` (single H1 — markdown lint enforces no second H1 anywhere in the file)
- One-sentence description and the underlying Radix primitive (or `"authored from scratch"` if it has no Radix equivalent), plus the atoms it composes.
- `## Import` — single line: `import { <Component> } from '@open-tomato/ui-skeleton';`
- `## Props` — table of props, types, defaults. Include the slot props (`leading`, `title`, `description`, `header`, `actions`, `footer`, `trigger` as applicable).
- `## Variants` — table or matrix of variant values, including the **lookup-table mapping** to composed atom axes (e.g. Alert's `size → Card.padding`, `size → Typography.variant`). This is the molecule-specific documentation surface.
- `## Composition` — **molecule-only section.** Lists composed atoms, lookup tables, the no-`className`-downward rule, the slot-prop vocabulary, and the layer-import direction. See "The `## Composition` README section" below for the full template.
- `## Accessibility` — keyboard, ARIA, focus, portal semantics, and `data-*` notes.
- `## Do / Don't` — short list reinforcing the variant-only styling rule and the slot-vs-className distinction.

Top-level sections are H2 (`##`); nested categories are H3 (`###`). Don't skip heading levels — `markdown/heading-increment` will fail `bun lint`. Every fenced code block needs an explicit language tag (`text` for ASCII trees, `bash` for shell, `tsx`/`ts`/`css` for code).

### 6. `index.ts` — the barrel

```ts
export * from './<Component>';
export * from './<component>.variants';
```

Two lines. Nothing else. No side effects, no default exports.

## Naming and import conventions

- **Component file**: PascalCase (`Alert.tsx`, `ButtonGroup.tsx`, `InputOTP.tsx`).
- **Variants file**: lowercase + `.variants.ts`; kebab-case for multi-word (`button-group.variants.ts`, `input-otp.variants.ts`).
- **Test file**: PascalCase + `.test.tsx`.
- **Story file**: PascalCase + `.stories.tsx`.
- **Path alias**: import composed atoms from `@/atoms/<Name>`, particles from `@/particles/...`. Never use deep relative paths like `../../atoms/Card`. Sibling imports inside the same molecule directory use `./<name>`.
- **Quotes**: single quotes in `.ts` / `.tsx`. ESLint auto-fixes — write that way to keep diffs clean.
- **Barrels**: `export *` unless there's a name collision; in that case, re-export explicitly.
- **Imports**: ESLint enforces grouping/sorting. Expect `import * as React from 'react'` and Radix imports to be grouped with third-party; `@/atoms/*` and `@/particles/*` live in their own group below; relative `./...` is last. Write imports already grouped this way.

## The composition rule (cardinal)

Molecules compose atoms. They MUST NOT compose other molecules.

**Three rules, enforced by ESLint `no-restricted-imports` keyed off `files: ['src/molecules/**/*.{ts,tsx}']` in `eslint.config.mjs`:**

1. **No molecule-to-molecule imports.** A molecule MUST NOT import from `@/molecules/*`, `../molecules/*`, or any relative path that reaches another molecule. When a candidate composes another molecule (e.g. a Combobox that uses Popover + Input), promote it to organism — the molecule layer is single-encapsulation only.
2. **No upward-layer imports.** A molecule MUST NOT import from `@/organisms/*`, `@/templates/*`, `@/pages/*`, or `@/providers/*`. Imports go strictly downward: molecule → atom → particle → token.
3. **Atoms and particles are the only legal upstream layers.** Imports from `@/atoms/<Name>` and `@/particles/*` are unrestricted. Internal sibling imports inside the molecule directory (`./alert.variants`) are unrestricted.

The lint guard intentionally matches the import-path string, not the resolved module — a guard fires against `@/molecules/X` even if `X` does not exist yet. This lets you add the guard before molecules ship and trust it from day one.

If you need a knob that the current layer-direction rule prevents (e.g. a molecule that genuinely needs another molecule's state), the answer is "promote to organism", not "open a guard exception".

## The className rule (cardinal)

**Molecules MUST NOT accept `className` as a public prop.** The rule is identical to the atom layer, with one molecule-specific addition: **molecules also MUST NOT pass `className` into composed atoms**. Atoms reject `className` at the type level (their props interface uses `Omit<..., 'className'>`), so the violation surfaces at compile time, but the rule is also conceptual: a molecule that needed to nudge an atom's styling via a className string would be working around the variant system.

What this means in practice:

- Do NOT include `className` in the molecule's public props interface.
- Do NOT destructure `className` from props.
- Do NOT pass a consumer-supplied string into the molecule's own `cn(...)`.
- Do NOT pass `className` (consumer-supplied or molecule-derived) into a composed atom (`<Card className={...} />` is wrong even if the value is a constant).
- DO add `'className'` to the existing `Omit<...>` clause when the props interface extends a React HTMLAttributes type. Without the `Omit`, `className` is implicitly inherited and would land on the rendered root via `{...rest}`.

When a molecule needs to nudge a composed atom's styling, the recipe is:

- **If the need is general** (every consumer of the atom would benefit), add a variant axis to the atom — see [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md).
- **If the need is molecule-specific** (only this molecule cares), map the molecule's own variant axis into an existing atom variant via a lookup table — see "Variant propagation" below.

What's still fine:

- Inside a molecule, `cn()` can compose classes from a base block plus variant-driven conditions (e.g., `cn(alertHeaderVariants({ severity }), isCollapsed && 'opacity-50')`).
- Per-severity tinting of slot content via descendant selectors in the molecule's own subpart cva (`'[&_[data-slot=alert-leading]]:text-emerald-600'`) is acceptable — the styling lives on the molecule's element, not on a string passed into the atom.

**Compliance is universal as of Phase 2.** Every molecule under `src/molecules/` follows this rule. Alert is the canonical reference — open `src/molecules/Alert/Alert.tsx` to see the props interface using `Omit<..., 'title' | 'className'>` and the composed `<Card>` invocation with no `className` prop.

## Variant propagation

Molecules own a **lookup table** from each public axis to each composed atom's axis. Direct passthrough is fine when values match; explicit mapping is required when axes diverge or names differ.

Pattern (from Alert):

```tsx
const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const titleVariantForSize = { sm: 'h5', md: 'h4', lg: 'h3' } as const;

// inside the component:
return (
  <Card padding={cardPaddingForSize[resolvedSize]} ...>
    <Typography variant={titleVariantForSize[resolvedSize]}>{title}</Typography>
  </Card>
);
```

Rules:

- Tables are `const` records with `as const` so TypeScript narrows the result to a specific union, not `string`. Without `as const`, the composed atom rejects the result (e.g. Typography's `variant` is a closed `'h1' | ... | 'caption'` union).
- Resolve defaults explicitly (`const resolvedSize = size ?? 'md';`) before indexing. Don't index with a possibly-undefined value.
- One lookup table per (molecule axis × composed atom axis) pair. If a molecule's `size` axis drives both `Card.padding` and `Typography.variant`, write two tables — combining them is unnecessary cleverness and harder to extend.
- The molecule's variants file may emit empty class strings (Alert's root cva does this). All visible styling comes from the composed atoms via propagation. The empty cva still exists so `VariantProps<typeof <component>Variants>` produces the public type.
- Reflect resolved axes on the rendered root as `data-*` attributes (`data-severity`, `data-size`, `data-state`) so tests and downstream styling can observe them without className introspection. The composed atom's own data-attributes (`data-padding`, `data-variant`) propagate naturally from below.

## Slot props

The molecule layer shares a standard slot-prop vocabulary. Use these names when the slot's purpose matches; invent new names sparingly and only when no existing name fits.

| Slot | Type | Purpose |
| --- | --- | --- |
| `title` | `React.ReactNode` | Rendered inside `Typography(variant=h*)` by default (variant chosen by molecule's `size` axis). |
| `description` | `React.ReactNode` | Rendered inside `Typography(variant=caption)`. |
| `leading` | `React.ReactNode` | Leading icon/avatar/badge. Wrapped in `<span aria-hidden>` when decorative. |
| `trailing` | `React.ReactNode` | Trailing actions/badges/chevrons. |
| `actions` | `React.ReactNode` | Bottom action row (e.g. Alert's `actions` renders into Card's footer). |
| `header` | `React.ReactNode` | Overrides the default `leading` + `title` + `description` layout (mutually exclusive with the default). |
| `footer` | `React.ReactNode` | Bottom section. |
| `trigger` | `React.ReactElement` | Radix-trigger molecules only — see "The trigger pattern" below. |

Rules:

- Slot content renders raw inside the composed atom. The molecule does NOT wrap it in styled containers or inject `className`. The Alert leading slot is the canonical exception: the molecule wraps it in `<span data-slot="alert-leading" aria-hidden>` for ARIA + the descendant-selector tint, but the consumer's node renders verbatim inside that span.
- `header` (and similar override slots) is mutually exclusive with the default layout slots. Document this in the README's Do / Don't.
- Slot props are `React.ReactNode` (allows null/false/array/string/element), not `React.ReactElement` — except `trigger`, which must be a single element so `React.cloneElement` / `asChild` work.
- Type the prop interface with `Omit<HTMLAttrs, 'title' | 'className' | ...>` whenever a slot name collides with a native HTMLAttribute (notably `title` on `<div>` — Alert omits it).

## The trigger pattern (for Radix-trigger molecules)

Popover, Tooltip, ContextMenu, HoverCard, and Collapsible all share a common shape: a single trigger element (button, icon, etc.) opens a portal-rendered content surface. The molecule exposes a `trigger` slot prop and wraps it internally with Radix's `asChild` to avoid double-wrapping.

```tsx
import * as RadixPopover from '@radix-ui/react-popover';

export interface PopoverProps extends ... {
  /** Single React element that opens the popover when interacted with. */
  trigger: React.ReactElement;
  // ...
}

export const Popover = React.forwardRef<HTMLDivElement, PopoverProps>(
  ({ trigger, children, ... }, ref) => (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content ref={ref} ...>{children}</RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  ),
);
```

Rules:

- `trigger: React.ReactElement` (not `ReactNode`). Radix's `asChild` requires a single child element so it can merge props into it.
- The `asChild` is an internal implementation detail; the consumer never sees it. They pass a Button (or any atom/element) and the molecule wires the trigger semantics.
- The consumer is responsible for the trigger's accessible name (`aria-label` on the Button, visible text content, etc.). The molecule does NOT inject accessible names into the trigger.
- For tests, query the portaled content with `screen.findByRole(...)` (the `find*` family) — Radix Portal renders outside the bound container, so `getByRole(...)` on the test container will miss it.
- For Tooltip specifically, render an internal `RadixTooltip.Provider delayDuration={300}` so consumers don't have to wrap the tree. Tests pass `delayDuration={0}` to skip the hover delay.

## Authoring rules

- **Types colocated** in `<Component>.tsx` for molecules. Split into a separate `<Component>.types.ts` only when discriminated unions (e.g. ContextMenu's items union, RadioGroup's items list) are wide enough to warrant a dedicated file.
- **No default exports** anywhere under `src/molecules/`.
- **No barrel side effects** — barrels only re-export.
- **Shared helpers belong in `particles/`**. If two molecules need the same className helper (e.g. the wrapper-frame shape shared by Select and NativeSelect), lift it to `src/particles/wrapper-frame.variants.ts` (or a new particle module) rather than copying.
- **No `asChild` on the molecule's outer API.** Molecules render multiple elements and cannot collapse to a Slot. `asChild` is reserved for the internal `trigger` pattern above.
- **Default `type='button'`** when a molecule renders a native `<button>` (e.g. ToggleGroup items via Toggle atom). Atoms already handle this; molecules just need to forward correctly through `asChild`.
- **Layer direction is one-way.** Molecule imports atom; atom never imports molecule. The lint guard fires both ways (atoms can't import molecules either) — see [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md).

## The molecule is also a registry item

Every molecule must appear in `registry.json` `items[]` (file lives at the package root). Required fields:

- `name`: kebab-case (e.g. `alert`, `button-group`, `input-otp`).
- `type`: `registry:ui`.
- `files`: array of `{ path, type }` entries pointing at the `.tsx` and `.variants.ts` (repo-relative paths like `src/molecules/Alert/Alert.tsx`).
- `registryDependencies`: array of **npm package names** the wrapper imports beyond `react` and `@/particles/cn` (e.g. `@radix-ui/react-popover`, `@radix-ui/react-tooltip`, `input-otp`, `lucide-react`). Empty array for pure-composition molecules with no external imports (e.g. `button-group`, `item`, `table`).

**Internal atom imports (e.g. a molecule's tsx importing `@/atoms/Card`) are NOT listed in `registryDependencies`.** They resolve via the build alias / package subpath, not via npm. The convention matches the atom layer.

For registry semantics, the shadcn CLI workflow, and how `registryDependencies` differs from shadcn's evolving `radix-ui` umbrella convention, see [../shadcn-integration/SKILL.md](../shadcn-integration/SKILL.md).

## The canonical reference: Alert

Phase 2 designates `src/molecules/Alert/` as the canonical reference. Read all six files before authoring any other molecule.

Alert is intentionally minimal:

- Composes two atoms (Card + Typography).
- Has two axes (`severity`, `size`) demonstrating the empty-root-cva + subpart-cva pattern (`alertVariants` emits no classes; `alertHeaderVariants` tints per severity).
- Demonstrates variant propagation via lookup tables (`cardPaddingForSize`, `titleVariantForSize`).
- Demonstrates the slot vocabulary (`leading`, `title`, `description`, `header` override, `actions`, `children`).
- Demonstrates the override pattern (`header` replaces the default layout when set).
- Demonstrates `data-*` reflection of resolved axes for testing.
- Has no Radix dependency, no portal, no state — leaving those concerns to the appropriate per-molecule sections of this skill.

## The `## Composition` README section

Every molecule's README includes a `## Composition` section between `## Variants` and `## Accessibility`. The section makes the molecule's place in the layered architecture explicit. Use the following template, adapting bullets to the molecule (the outer fence below uses four backticks so the inner triple-backtick `ts` block is preserved when the template is copied into a per-molecule README):

````markdown
## Composition

- **Composed atoms:** `<Atom>` provides ..., `<Atom>` renders ....
- **Variant propagation via lookup tables.** The molecule owns the mapping
  from its own axes to each composed atom's axes:

  ```ts
  const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const titleVariantForSize = { sm: 'h5', md: 'h4', lg: 'h3' } as const;
  ```

  `size` maps to `<Atom>`'s `<axis>` axis (passthrough/explicit lookup). ...
- **No `className` flows downward.** Atoms reject `className` both at the
  type level and at runtime. If a knob the variants don't cover is needed,
  add a variant axis on the atom OR on this molecule — don't open an escape
  hatch.
- **Slot prop vocabulary.** `leading`, `title`, `description`, `header`,
  `actions`, plus `children` for the body. Slot content renders raw inside
  the composed atoms; the molecule does not inject styling into
  consumer-supplied nodes.
- **Layer-import direction.** Imports `@/atoms/<Atom>`, `@/atoms/<Atom>`,
  and `@/particles/cn`. Does NOT import other molecules, organisms,
  templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.
````

## Per-molecule procedure (copy from Alert)

Phase 2 chose **hand-write Alert as the canonical reference, copy-shape for every other molecule**. No code-generation script, no plop/hygen templates. Each molecule is authored in its own task by reading Alert and adapting.

### Procedure

For each new molecule:

1. Open `src/molecules/Alert/` and read all six files end-to-end. Alert is ground truth for file layout, TSDoc style, variant naming, the empty-root-cva pattern, lookup-table propagation, slot vocabulary, the override pattern, test structure, story structure, README structure (including the `## Composition` section).
2. Look up the molecule's spec (variants, props, underlying Radix primitive or composed atom set) wherever the iteration's planning lives — usually the PLAN's per-molecule sketch table or a transient planning document at the package root. That spec is the only intentional deviation from Alert.
3. Create `src/molecules/<Component>/` with the six required files. Start each file by copying its Alert counterpart, then adapt:
   - `<component>.variants.ts`: rename `alertVariants` → `<component>Variants`. Decide whether the root cva emits real classes (when the molecule's root is a `<div>` it owns) or empty strings (when the molecule delegates all root styling to a composed atom like Alert delegates to Card). Add subpart cva blocks when the molecule needs descendant-selector styling beyond what the atoms provide.
   - `<Component>.tsx`: rename the component and props interface. Replace composed atoms (Card + Typography → the atoms this molecule needs). Replace the root render (Card → Radix Root + atoms, or a plain `<div>` with the atoms inside). Keep the `forwardRef` shape. Add `Radix*.Trigger` / `Radix*.Portal` if the molecule is Radix-state-based. Update the lookup tables to match the molecule's axes.
   - **Props interface inheritance**: when the props interface extends a React HTMLAttributes type (or a Radix primitive's props), `Omit` the keys that collide with variant axes AND `'className'` AND any slot-prop names that collide with native HTMLAttributes (e.g. `'title'` on `<div>`). Alert's canonical shape is `extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'className'>, AlertVariants`. Replicate the pattern: keep `'className'` in every molecule's `Omit<...>`, and add slot-prop or native-attribute names that collide. Without the `Omit`, the colliding key is inherited and either breaks the variant typing or leaks to the DOM via `{...rest}`.
   - `<Component>.test.tsx`: keep the same five-assertion baseline (renders all slots, composes expected atom role, variant propagation, no a11y violations, state behavior / override). Adjust the role / variant / state under test. For portaled molecules, use `screen.findByRole(...)`.
   - `<Component>.stories.tsx`: copy meta shape, retitle `Molecules/<Component>`, adjust `argTypes` and the `AllVariants` matrix. Add state-demo or slot-override stories per the molecule's shape (see "File-by-file requirements" section 4).
   - `README.md`: copy the section order, fill the props/variants tables, rewrite the `## Composition` section per the template above, rewrite the Do/Don't bullets if non-obvious.
   - `index.ts`: re-export the component and the variants module.
4. Append the molecule to `registry.json` `items[]` with `registryDependencies` listing only external npm packages (Radix primitives, `input-otp`, `lucide-react`). Internal `@/atoms/*` imports are NOT registry deps.
5. Add the molecule to `src/molecules/index.ts` (the layer barrel) and to `vite.config.ts` `build.lib.entry` (per-molecule entry under `molecules/<Name>`).
6. Run `bun run check-types && bun run test && bun run lint` locally. Do not move on while any of them fails.

## Layer overview (where molecules sit)

```text
src/
├── index.ts                 # top-level barrel — re-exports every layer
├── styles/globals.css       # Tailwind v4 entry + @theme tokens
├── particles/               # shared helpers (cn, variants, tokens, wrapper-frame, ...)
├── atoms/                   # 18 single-entry wrappers
├── molecules/               # THIS FILE'S DOMAIN — 15 atom-composing wrappers
├── organisms/               # placeholder barrel
├── providers/               # placeholder barrel
├── templates/               # placeholder barrel
└── pages/                   # placeholder barrel
```

Import direction is strictly one-way and bounded by the ESLint `no-restricted-imports` guard:

- molecule → atom: OK (`@/atoms/Card`, `@/atoms/Typography`).
- molecule → particle: OK (`@/particles/cn`, `@/particles/wrapper-frame.variants`).
- molecule → molecule: BLOCKED. Promote to organism.
- molecule → organism / template / page / provider: BLOCKED.
- atom → molecule: BLOCKED. Atoms don't compose; if shared logic between atom and molecule is needed, lift it to a particle.

When in doubt about which layer something belongs in, ask: does it compose another molecule? Yes → organism. Does it compose only atoms / pure-HTML / a single Radix primitive? Yes → molecule. Does it render a single element / wrap a single Radix primitive without composition? Yes → atom.

## When in doubt

- Open Alert and read it.
- The relevant skill (linked from each section above) has the deeper context.
- If a convention here conflicts with a transient planning doc (iteration plan, ticket spec), the planning doc wins for scope; this skill wins for file layout, naming, and the cardinal rules (className, composition).
