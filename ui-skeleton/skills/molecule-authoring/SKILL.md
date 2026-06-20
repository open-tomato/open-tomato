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

## Patterns by molecule shape

The molecule layer covers several recurring shapes. The cardinal rules above (six-file, composition, className, slot vocabulary) apply to all of them; this section documents the per-shape specifics.

### Typography variant alignment

Typography's `variant` axis is a STRICT subset of its `as` axis: `as` includes `h1..h6` + `p | span | code` (and intentionally excludes `div` — see the `TypographyAs` comment), but `variant` only covers `display | h1 | h2 | h3 | h4 | h5 | body | caption | code | kbd`. Molecules composing Typography for sized title slots must use values from the `variant` set, not the `as` set. `h5` was added in Phase 2 specifically to support Alert's `{ sm: 'h5', md: 'h4', lg: 'h3' }` lookup table.

When a molecule's lookup table maps `size` to Typography `variant`, do NOT also pass `as` to force a non-heading element. Typography's variant-derived default tag (heading variants → matching `h*` tag) is the right answer for stacked title+description layouts inside a flex/row wrapper — the block-level heading naturally breaks the line before the inline-by-default caption description. Forcing `as='span'` on the title collapses both onto the same line and breaks the layout.

### Composition molecules (ButtonGroup, ToggleGroup)

Molecules that own N homogeneous atom children propagate group-level axes via `React.Children.map` + `React.isValidElement` + `React.cloneElement`. The `??` order matters — per-child overrides win over the group default:

```tsx
const groupChildren = React.Children.map(children, (child) => {
  if (!React.isValidElement<Partial<ButtonProps>>(child)) return child;
  return React.cloneElement(child, {
    size: child.props.size ?? size,
    variant: child.props.variant ?? variant,
  });
});
```

Non-element children (strings, `null`, fragments) pass through unchanged via the `!isValidElement` early return.

For segmented-control wrappers (`attached` axis collapsing neighbor borders), express the neighbor-sibling Tailwind on the wrapper via cva `compoundVariants` rather than baking it into each child atom. See [../cva-variants/SKILL.md](../cva-variants/SKILL.md) for the canonical compound-variant block (the `[&>*:focus-visible]:relative z-10` pair is mandatory to keep the focus ring visible above the next sibling's negative margin).

### Discriminated-union molecules (ToggleGroup-style)

Radix `ToggleGroup` (and other single/multiple-selection primitives) changes per-item ARIA semantics based on the `type` discriminator: `type='single'` sets `role='radio'` + `aria-checked` (radiogroup semantics) while `type='multiple'` keeps `role='button'` + `aria-pressed`. Tests must use the role matching the mode under test — `getByRole('radio', { name })` for single, `getByRole('button', { name })` for multiple. Counting items across both modes is best done via `container.querySelectorAll('[data-slot=<composed-atom-slot>]')` since the role differs by mode.

For molecules whose props differ by a discriminator (`type: 'single' | 'multiple'` with different `value` / `defaultValue` / `onValueChange` shapes), define separate `*SingleProps` / `*MultipleProps` interfaces both extending a shared `*BaseProps`, then union them as the public type. The `forwardRef` body narrows via `if (props.type === '<discriminator>')` and destructures inside each branch — pass `type="<discriminator>" as const` explicitly to Radix in each branch so it sees the correct narrowed shape. Spreading the union directly into Radix loses the discriminator and produces "string is not assignable to string[]" errors.

When composing an atom via Radix's `asChild` on a wrapper item (`<RadixToggleGroup.Item asChild value={...}><Toggle .../></RadixToggleGroup.Item>`), Radix's Slot machinery projects state plumbing onto the atom. The atom is the actual DOM `<button>` — its `data-slot` / `data-variant` / `data-size` attributes survive, as does any explicit `aria-label` passed to it. This is the canonical pattern for variant propagation through Radix selection primitives.

### Data-driven molecules (Table-style large-N cells)

For molecules that render N homogeneous cells from an array prop (Table's `headers[]` / `rows[][]` / `footer[]`), prefer styling cells via descendant cva selectors on the root (`[&_th]:px-3 [&_td]:py-3`) over wrapping each cell in a composed atom. Per-cell `<Typography>` wrappers multiply render cost on large data sets; descendant selectors apply the same visual scale axis-by-axis with one `cn()` call on the root. Reserve atom composition for the SINGLETON slots (Table's `caption` uses Typography `variant="caption"`) where the per-instance cost is one wrapper, not N.

`react/no-array-index-key` is NOT enabled in the shared eslint config — positional cells / rows can use array index keys directly without `eslint-disable` comments. The default `react/jsx-key` rule only fires when a key is missing entirely.

Scope test queries to a specific table section with `within(container.querySelector('tbody') as HTMLElement).getByRole('cell', ...)` (or `tfoot`) when the same cell text could appear in multiple sections. The `within()` helper from `@testing-library/react` accepts any HTMLElement, not just the bound render container.

### Inline-label molecules (Switch, RadioGroup)

For molecules that pair a single control with an inline label and need `peer-disabled` styling (text dims + `cursor-not-allowed` when the control is `disabled`), render a NATIVE `<label>` element with the molecule's own `*LabelVariants` cva — do NOT compose the Label atom. The Label atom does not expose a `peer-disabled` axis, and the molecule cannot inject className into it. The native `<label htmlFor={id}>` linked via `React.useId()` (with `id` prop override) provides click-to-toggle without needing Radix Label's labelable-child de-dup logic (that logic only matters when the label WRAPS the control).

The label wrapper carries `data-slot="<molecule>-root"` and `data-size`; the label element carries `data-slot="<molecule>-label"`; the control sits inside as a `peer` sibling. The label's variants string starts with `'select-none ... peer-disabled:cursor-not-allowed peer-disabled:opacity-50'`. When `label` is omitted, return the bare control (no wrapper, no label slot) so `aria-label[ledby]`-only usage stays clean. Canonical in `src/atoms/Checkbox/Checkbox.tsx` and `src/molecules/Switch/Switch.tsx`.

Multi-item radio-style molecules (RadioGroup and any future "list of N controls + label + description per row" wrapper) CANNOT use Tailwind's `peer-disabled:` modifier for the label text — the `peer-` selector only reaches the immediate sibling of the disabled control, and when label + description live in a separate column wrapper (`<span class="flex flex-col">`) they are two DOM levels removed and the modifier silently no-ops. Two viable substitutes:

- (a) Wrap the whole row in `<label htmlFor>` and apply the disabled visual treatment imperatively via `cn(..., item.disabled === true && 'opacity-50 cursor-not-allowed')` based on the descriptor's `disabled` field.
- (b) Set `data-disabled=""` on the row and target it with descendant selectors.

Pattern (a) is canonical in `src/molecules/RadioGroup/RadioGroup.tsx`. Bonus: a row-level `<label>` makes the description text clickable too, which feels right for grouped choice UI.

Multi-item molecules generate per-item DOM ids by deriving from a single `React.useId()` base, e.g. `const itemId = \`${baseId}-${item.value}\`;`. The `id` prop on the molecule overrides the generated base. Using the descriptor's `value` as the id suffix guarantees uniqueness within the group AND stability across renders — do NOT use the array index, which shifts when items are reordered and breaks label/control pairing mid-render. Same `value` doubles as the React key.

### Radix-wrapper molecules with auto-injected trigger icons (Collapsible)

When a Radix-trigger molecule auto-injects an icon (e.g. a rotating chevron) into the trigger's `leadingIcon` / `trailingIcon` slot via `React.cloneElement`, type the slot prop as `React.ReactElement<{ leadingIcon?: React.ReactNode; trailingIcon?: React.ReactNode }>`. The generic on `ReactElement` propagates into `cloneElement`'s constraint so TypeScript flags consumers passing an element whose props don't accept those slots — catches the "user passed a raw `<div>` as trigger" case at compile time instead of silently no-op'ing the icon injection.

To drive own decorative `data-state` attributes (e.g. a chevron span using Tailwind's `data-[state=open]:rotate-180` selector) from a Radix wrapper, track open state internally with `useState` and forward `open` + `onOpenChange` as a controlled passthrough to Radix. Radix's `data-state` only lives on the Trigger element itself — siblings / decorative slots can't observe it via CSS without the molecule maintaining a parallel state copy:

```tsx
const isControlled = open !== undefined;
const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
const resolvedOpen = isControlled ? open : uncontrolledOpen;
const handleOpenChange = (next: boolean) => {
  if (!isControlled) setUncontrolledOpen(next);
  onOpenChange?.(next);
};
```

When the molecule always passes `open={resolvedOpen}` to a Radix Root, do NOT also pass `defaultOpen` to Radix — `open !== undefined` makes Radix treat the component as controlled and `defaultOpen` becomes a no-op (with a dev warning). Consume `defaultOpen` as the initial value of the internal `useState` and destructure it out of the rest spread so it does not reach Radix.

### Portal-based Radix wrapper molecules (Popover, Tooltip, HoverCard, ContextMenu, Select)

Several pitfalls cluster around portal-based Radix wrappers. Apply them together:

- **Do NOT re-emit `data-placement` / `data-align` from the molecule.** Radix Popover / Tooltip / HoverCard / ContextMenu Content automatically emit `data-state="open|closed"`, `data-side="top|right|bottom|left"`, and `data-align="start|center|end"` AFTER collision detection. The molecule's `placement` / `align` axes are the CONSUMER's request — the resolved value may differ if there's no room. Re-emitting would shadow Radix's collision-aware attrs and mislead consumers reading them in DevTools. Keep `data-size` (molecule-owned) but defer placement / align observability to Radix.
- **Surface cva is sibling to the sizing cva.** When a portal-based molecule conditionally composes a surface atom (Card) AND falls back to inline surface styling for the unwrapped case, do NOT bake the surface classes into the base sizing cva — they'd double up with Card's own border / shadow. Pattern: keep `popoverContentVariants` for sizing + positioning only; export a sibling `*ContentSurfaceVariants` cva for the surface (border + bg + shadow + padding); compose conditionally in `cn(base, !hasCard && surface(...))`. Mirrors the wrapper-frame particle composition pattern.
- **Accessible name on portaled content.** Radix's portaled Content carries `role="dialog"` (Popover) or `role="tooltip"` (Tooltip) by default. axe's `aria-dialog-name` rule fails when a dialog has no accessible name. Satisfy via `contentProps={{ 'aria-label': '...' }}` in tests, or rely on Radix auto-wiring `aria-labelledby` when the consumer provides a title element with a known id (Popover does NOT auto-wire). Document this in the README so consumers know to supply one of `title` / `contentProps['aria-label']`.
- **`bg-popover` / `text-popover-foreground` are NOT declared.** Tailwind v4 silently drops these (and `bg-card` / `text-card-foreground` — also undeclared) under the current `globals.css`. Use `bg-background` / `text-foreground` for portaled surfaces, or add the `--color-popover*` tokens to `@theme` first. See [../styling/SKILL.md](../styling/SKILL.md) for the silent-token-drop trap.
- **`contentProps` MUST `Omit` `'className'` plus molecule-owned positioning props** (`side`, `align`, `children`). Same rule as atom-layer per-part bag props; without the omit, a consumer string reaches the inner Content via `{...bag}` and re-opens the escape hatch.
- **`modal={false}` is the default for Popover-style wrappers** (background pointer events stay live; consumer opts into focus trapping when they want dialog semantics). Tooltips have no `modal` axis; HoverCard is implicitly non-modal. Document the default explicitly in the README.
- **Tooltip ships its own internal `RadixTooltip.Provider`** with `delayDuration={300}` so consumers don't need to wrap their app. Provider props (`delayDuration` / `skipDelayDuration` / `disableHoverableContent`) are exposed as molecule props for per-instance tuning. Pattern is Tooltip-specific — Popover / HoverCard / ContextMenu don't require a Provider, so they wrap only the Root.
- **Discriminated-union `items` slot for portaled listboxes.** Use explicit `type: 'item' | 'separator'` tags and separate exported interfaces (`SelectItemEntry`, `SelectSeparatorEntry`) instead of `type?: 'item'` optionals. Required-discriminator unions narrow correctly in `items.map(...)` without the consumer needing `as` casts. Item-value-as-React-key is canonical; separators have no natural identity so `key={\`separator-${index}\`}` is acceptable.
- **Optional `trigger` override.** When a Radix wrapper offers BOTH a default styled trigger AND an optional `trigger?: React.ReactElement` override (Select), the override path uses `<RadixSelect.Trigger asChild {...triggerProps}>{trigger}</RadixSelect.Trigger>` — `asChild` projects Radix state plumbing onto the consumer's element, and the molecule's visual axes (`variant` / `size` / `density` / `tone`) become no-ops in this mode. Document this clearly in the README. Tests should cover the override path by asserting the consumer-supplied element survives (e.g. `expect(trigger.tagName).toBe('BUTTON'); expect(trigger).not.toHaveAttribute('data-slot', 'select-trigger');`).
- **`triggerProps` for ARIA wiring on the default trigger.** For Radix-trigger molecules that own the rendered trigger DOM (Select's wrapper-frame trigger, NativeSelect, future Combobox), expose a `triggerProps?: Omit<RadixTriggerProps, 'className' | 'children'>` pass-through bag for `aria-label`, `aria-labelledby`, `id`, focus handlers, `disabled`. Different from Popover / Tooltip / HoverCard, which receives the trigger as a slot element and lets the consumer's element carry its own ARIA — Select's default trigger is internal, so the consumer needs a typed seam to label the combobox.

For the polyfill chain that makes Radix Select / Listbox testable (`scrollIntoView`, `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`) and the Tooltip duplicate-text / axe `region` workarounds, see [../component-testing/SKILL.md](../component-testing/SKILL.md).

### Native form-control molecules (NativeSelect)

Native `<select>` (single, no `multiple`) has implicit ARIA role `combobox` per the modern HTML AAM spec — the same role Radix Select's Trigger emits — so `screen.getByRole('combobox', { name })` works for both NativeSelect and the portaled Select molecule. With `multiple` or `size > 1` the implicit role becomes `listbox`. Native form-control accessible names come from a wrapping `<label htmlFor>`, an `aria-label`, or `aria-labelledby` — the molecule does NOT auto-generate one.

`<option hidden>` (used as a `disabled hidden value=""` placeholder paired with `defaultValue=""` to render the placeholder selected on mount) is excluded from the ARIA tree, so `screen.getByRole('option', { name, hidden: true })` STILL misses it — testing-library's `hidden: true` option controls whether `aria-hidden` parents are traversed, not the HTML `hidden` attribute on `<option>`. Query directly via DOM (`container.querySelector('option[value=""]')`) and assert `toBeDisabled()` + `toHaveAttribute('hidden')` + `toHaveTextContent(placeholder)`.

Native `<select>` chevron suppression: apply `appearance-none` on the inner `<select>` and render a decorative chevron icon as a sibling inside the wrapper-frame (`lucide-react`'s `ChevronDown` is canonical). The chevron span carries `aria-hidden` and `pointer-events-none` so clicks fall through to the native control and screen readers ignore the duplicate glyph.

`userEvent.selectOptions(select, value)` (from `@testing-library/user-event`) is the canonical way to drive native `<select>` value changes in tests — accepts a string, a number, an HTMLOptionElement, or an array (for `multiple`). Fires `onChange` synchronously with the awaited promise; pair with `expect(select).toHaveValue(...)` to assert. Avoid `fireEvent.change(select, { target: { value } })` — it skips the focus/click sequence and can desync controlled-component tests.

Data-driven `<select>` content uses a discriminated union mirroring Select's `SelectItemEntry` but with option/group distinction: `{ type: 'option', value, label?, disabled? }` for individual entries and `{ type: 'group', label, options: NativeSelectOptionEntry[] }` for `<optgroup>` clusters. The `type` discriminator is required (not optional). Render `<optgroup>` via `key={\`${descriptor.label}-${index}\`}` because group labels CAN collide across descriptor arrays.

When both `options` and `children` are supplied, `options` wins (the molecule passes `options.map(renderDescriptor)` as the select's child set and ignores `children`). Document the precedence in the README's Do / Don't — silent override is acceptable here because the data-driven path is canonical and `children` is the escape hatch for hand-authored JSX.

### Single-hidden-input molecules with N visual slot cells (InputOTP)

`input-otp`'s `OTPInput` renders a Fragment containing a `<div data-input-otp-container>` (styled via `containerClassName`) holding the rendered slot row (children or `render` prop output) PLUS an absolutely-positioned wrapper containing a single hidden `<input>` that receives all `{...rest}` props (ARIA, data-*, ref). The forwarded ref points at the hidden input. There is no separate "root" attribute the consumer can label, so to expose a `data-slot="input-otp-root"` anchor with variant-resolution data-attrs (`data-length`, `data-size`, `data-invalid`), wrap `OTPInput` in your own outer `<div>` — the one-extra-DOM-node cost is worth the clean separation from the hidden-input's `data-slot="input-otp-control"` and per-slot `data-slot="input-otp-slot"` queries.

Slots are read out of `OTPInputContext.slots[index]` (shape: `{ char, placeholderChar, isActive, hasFakeCaret }`). A per-slot subcomponent that calls `useContext(OTPInputContext)` is the canonical render approach. Pass `size` and `invalid` as parent-resolved props rather than reading them from context — they're molecule-owned axes, not library state. The slot's `isActive` flag is the test-observable hook for caret position; cva's `active: { true, false }` axis (plus `compoundVariants` for `{ invalid: true, active: true }` → `'ring-destructive'`) keeps the resolved classes in the snapshot rather than relying on `data-[active=true]:` selector lookups.

Connected-cell visual style (shared borders between neighboring cells without doubling up) uses `border-y border-r first:border-l first:rounded-l-md last:rounded-r-md` on each cell — NOT `gap-*` on the parent. Matches the shadcn default. Reserve `gap-*` for OTP variants that intentionally space the cells (e.g. the "phone PIN with dash separator" layout).

The `input-otp` library exports `REGEXP_ONLY_DIGITS`, `REGEXP_ONLY_CHARS`, and `REGEXP_ONLY_DIGITS_AND_CHARS` as regex-source strings — use these directly when defaulting the `pattern` prop. For numeric OTP the trio is `inputMode="numeric"`, `autoComplete="one-time-code"`, `pattern={REGEXP_ONLY_DIGITS}`. All three must be overridable via props for alphanumeric / mixed-case codes — mobile users get locked out of mixed-case fields when `inputMode="numeric"` forces the digits-only keypad.

`input-otp`'s `onChange` signature is non-standard: `(newValue: string) => unknown` — NOT a React `ChangeEvent`. Document this in the README so consumers don't try to read `event.target.value`. `onComplete` fires when the value transitions from `< maxLength` to exactly `maxLength` (one-shot at boundary); useful for auto-submitting verification forms.

Test the controlled-value rendering by passing `value="12"` directly — `input-otp` resolves `i = value ?? internalState` so the context slots immediately reflect the prop. Use `fireEvent.change(input, { target: { value: '...' } })` instead of `userEvent.type` for OTP value transitions — the library's internal `selectionchange` listener pairs with native input events fine in jsdom, but `userEvent`'s character-by-character typing path can race with the polyfilled `scrollIntoView` / `setSelectionRange` in unstable ways. `getByRole('textbox', { name })` queries the hidden input.

`containerClassName` on `OTPInput` is the right place to apply Tailwind's `has-[input:disabled]:` modifier — the input is a descendant of the container div, and the `:has()` selector lets the row-level dim style fire without per-cell coordination. Same trick that NativeSelect's wrapper uses for the native `<select>`.

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
