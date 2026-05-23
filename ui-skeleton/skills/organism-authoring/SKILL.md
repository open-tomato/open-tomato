---
name: organism-authoring
description: Use when adding a new organism, editing an existing organism's file layout, or anything that touches the six-file convention under src/organisms/<Component>/. Covers naming, displayName, forwardRef, the no-public-className rule, the layer-import (composition) rule, the promote-to-template rule, slot-prop vocabulary, variant propagation, internal hooks/state/context, and the per-organism generation procedure.
---

# Organism Authoring

This skill is the canonical source for "how an organism is built" in `packages/ui-skeleton/`. Read it end-to-end before adding or restructuring any organism. Atoms (single-element wrappers) are covered in [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md); molecules (atom-composing wrappers) are covered in [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md). Read both first if you have not yet. The organism layer composes molecules, atoms, and particles; everything that holds for molecules holds for organisms unless this file overrides it.

## The contract: six files, one directory, no exceptions

Every organism lives in its own directory under `src/organisms/<Component>/` and contains exactly six files. The set is identical to the atom and molecule layers; the contents differ.

```text
src/organisms/<Component>/
├── <Component>.tsx              # React component (PascalCase) — composes molecules + atoms
├── <component>.variants.ts      # CVA variants (lowercase / kebab-case)
├── <Component>.test.tsx         # Vitest + Testing Library + jest-axe
├── <Component>.stories.tsx      # Storybook 8 stories with autodocs
├── README.md                    # per-component documentation (includes ## Composition)
└── index.ts                     # barrel re-exporting the component + variants
```

The set is enforced by tooling (registry.json schema, downstream consumers, the lint pipeline) and by team convention. Six files in, six files out. No exceptions for "wraps a single Radix primitive" or "stateless data-driven organism" — the size threshold is the layer's composition surface, not the per-file count.

## File-by-file requirements

### 1. `<Component>.tsx` — the component

- PascalCase filename matching the directory name.
- **No default exports.** Use a named export wrapped in `React.forwardRef`.
- Set `<Component>.displayName = "<Component>";` immediately after `forwardRef`.
- TSDoc on the exported component: one-line summary, `@remarks` (call out variant-propagation lookup tables, which molecules and atoms are composed, and any internal state / context the organism owns), `@example`.
- Props declared as a named `interface <Component>Props` that extends the rendered root element's attrs (or the Radix root primitive's props) **plus** the `VariantProps` derived from the variants file.
- **No `className` in the props interface.** Add `'className'` to the `Omit<...>` clause on every HTMLAttributes-derived parent type. The className rule (cardinal) below has the full rationale.
- Standard slot-prop vocabulary lives on the public API (see "Slot props" below). Slot content renders raw inside composed molecules and atoms — organisms do NOT inject styling into consumer-supplied nodes.
- All organism styling MUST flow through the variants call: `cn(<component>Variants({ ... }))` for the root and/or `cn(<componentSubpart>Variants({ ... }))` for header/content/footer subparts. Do NOT accept a public `className` prop and do NOT pass a `className` string into a composed molecule or atom — see the className rule below.
- Variant propagation from the organism's axes to each composed molecule's / atom's axes lives in **lookup tables** colocated with the component (see "Variant propagation" below).
- Import composed molecules from `@/molecules/<Name>` and atoms from `@/atoms/<Name>`. Import the variants from the sibling `<component>.variants.ts`. Never re-derive variant logic inline.
- **Internal hooks, state, and context are allowed.** Organisms are the first layer where stateful coordination across composed pieces becomes routine: `React.useState` for selection/expansion/pagination state, `React.useId()` for accessible-name pairing across rendered children, `React.useContext` for downstream data access, custom hooks (`useFilteredItems`, `useSortableColumns`) colocated in the component file or extracted into a sibling helper module inside the organism directory. See "Internal state and context" below for the rules around controlled-passthrough patterns and where helpers live.

### 2. `<component>.variants.ts` — the variants

- Lowercase filename (`accordion.variants.ts`); kebab-case for multi-word names (`data-table.variants.ts`).
- Exports `<component>Variants` built with `cva(...)` and a sibling type `<Component>Variants = VariantProps<typeof <component>Variants>`.
- An organism's root cva may emit real classes (when the organism owns visible root styling, e.g. DataTable's table-frame surface) or empty strings (when the organism delegates all root styling to a composed molecule / atom, e.g. Field delegates to Input's wrapper-frame). Both shapes are valid; the choice mirrors the molecule layer's empty-root-cva pattern. The cva still exists so `VariantProps<typeof <component>Variants>` produces the public type that the props interface extends.
- For subpart styling that the organism owns (e.g. an items[] separator row, a pagination chevron tint, a sortable-column header indicator), export additional cva blocks from the same file (`<component><Subpart>Variants`).
- Order inside each cva block: base classes first, then `variants`, then `defaultVariants`.
- Use design-system tokens from `@/styles/globals.css` (e.g. `bg-primary`, `text-foreground`, `ring-ring`, `shadow-elev-1`) — never raw colors. See [../styling/SKILL.md](../styling/SKILL.md) for the token contract.
- Only this file and `src/particles/` may call `cva` directly. The component file imports the call expression; it never builds its own variants inline.
- For deeper CVA patterns (variant maps, boolean axes, multi-element variants, polymorphic axes, the `Omit<...,'size'>` trap), see [../cva-variants/SKILL.md](../cva-variants/SKILL.md).

### 3. `<Component>.test.tsx` — the tests

Organism tests have the **five-assertion baseline** inherited from the molecule layer, with one organism-specific addition (`document.body` axe scans for portal-based organisms):

1. **Renders all slots.** Query each slot (`leading`, `title`, `description`, body `children`, `actions`, items[] descriptors, etc.) via `getByText`, `getByTestId`, `data-slot=...` selectors, or — for items[]-driven organisms — by asserting one element per descriptor index. A missing slot is a silent regression.
2. **Composes the expected molecule / atom role(s).** Use `getByRole('list')` for items[] lists, `getByRole('navigation')` for breadcrumbs, `getByRole('dialog')` for Dialog / AlertDialog, `getByRole('menu')` for DropdownMenu / Menubar, `getByRole('table')` for DataTable, etc. Confirms the organism actually delegates to the expected molecule / atom and not a generic `<div>`.
3. **Variant propagation.** Pass a non-default value on the organism's axis (e.g. `size="lg"`, `density="compact"`) and assert that the composed molecules / atoms receive the mapped variant — query via `data-*` attributes on the rendered molecule / atom (e.g. `toHaveAttribute('data-size', 'lg')` on the Card root that an Empty organism delegates to). Avoid brittle className introspection.
4. **No a11y violations.** `await axe(container)` returns `toHaveNoViolations()` — **except for portal-based organisms.** Dialog, AlertDialog, Drawer, DropdownMenu, Menubar, Sonner, Command, and any future Radix-portal-rendering organism MUST call `await axe(document.body)` instead. Radix portals into `document.body`, and a container-scoped axe scan silently misses the portaled content; the failure mode is "tests pass + production ships an unlabeled dialog." This rule is the single most important deviation from the molecule baseline.
5. **State behavior.** For stateful organisms (Accordion's expansion, Pagination's page navigation, Combobox's open + filter + selection, DataTable's sort/filter/page/select, Calendar's date selection, all Radix-portal organisms), verify the controlled/uncontrolled flow: open/close, hover, checked, value change, sort flip, page advance. Use `screen.findByRole(...)` (the `find*` family) for portaled content — Radix Portal renders outside `container`, so `getByRole(...)` on the bound container will miss it. For items[]-driven organisms with discriminated unions (DropdownMenu's `item | separator | label | group`), exercise at least one descriptor of each variant in the test fixture so the rendering branch coverage holds.

Stateless organisms (Empty, Breadcrumb when current-page-only) still meet the first four; the fifth becomes a "renders custom override" assertion (e.g. Breadcrumb's custom separator descriptor replacing the default chevron).

Use `@testing-library/jest-dom/vitest` matchers (registered in `vitest.setup.ts`). Coverage thresholds apply per-package, not per-file: 80% lines / 80% statements / 75% branches / 80% functions.

For testing pitfalls (jsdom limits, Radix gated behaviors, `ResizeObserver` polyfill, `bun test` vs `bun run test`, the portal/`findByRole` rule, the Radix Select polyfill chain, axe `region` workarounds), see [../component-testing/SKILL.md](../component-testing/SKILL.md).

### 4. `<Component>.stories.tsx` — the stories

- `title: 'Organisms/<Component>'`
- `component: <Component>`
- `tags: ['autodocs']`
- Minimum stories:
  - `Default` — the simplest meaningful invocation.
  - `AllVariants` — matrix rendering every variant value side-by-side. For items[]-driven organisms (Breadcrumb, DropdownMenu, Pagination), include at least one descriptor of each discriminated-union variant.
  - For stateful organisms: at least one state-demo story (`Open`, `Multiple`, `Filtered`, `WithSelection`, `Sortable`) that exercises the controlled API or interactive flow. Storybook autodocs renders these in the docs page.
  - For slot-heavy organisms: at least one story that exercises a non-default slot override (`WithCustomHeader`, `WithActions`, `CustomSeparator`).
  - For data-driven organisms (DataTable, Combobox, Calendar): include a realistic fixture of at least 20 rows / 20 items so the pagination / virtualization / type-ahead paths render meaningfully in autodocs.
- Declare `argTypes` for every variant prop so controls are usable; declaring `argTypes: { className: { table: { disable: true } } }` is **not** needed — organisms don't expose `className`, so it simply isn't in the props interface.

For Storybook configuration, headless verification, and the addon stack, see [../storybook/SKILL.md](../storybook/SKILL.md).

### 5. `README.md` — per-component documentation

Sections, in this order:

- `# <Component>` (single H1 — markdown lint enforces no second H1 anywhere in the file)
- One-sentence description and the underlying Radix primitive (or `"authored from scratch"` if it has no Radix equivalent), plus the molecules and atoms it composes.
- `## Import` — single line: `import { <Component> } from '@open-tomato/ui-skeleton';`
- `## Props` — table of props, types, defaults. Include the slot props (`leading`, `title`, `description`, `header`, `actions`, `footer`, `trigger`, `items`, `columns`, etc. as applicable).
- `## Variants` — table or matrix of variant values, including the **lookup-table mapping** to composed molecule / atom axes (e.g. Accordion's `size → Collapsible.size`, AlertDialog's `severity → Button.variant`). This is the organism-specific documentation surface.
- `## Composition` — **molecule and organism section.** Lists composed molecules + atoms, lookup tables, the no-`className`-downward rule, the slot-prop vocabulary, and the layer-import direction. See "The `## Composition` README section" below for the full template adapted to the organism layer.
- `## Accessibility` — keyboard, ARIA, focus, portal semantics, and `data-*` notes. For portal-based organisms, document the accessible-name requirement (`title` element, `contentProps['aria-label']`, or Radix auto-`aria-labelledby` wiring).
- `## Do / Don't` — short list reinforcing the variant-only styling rule, the slot-vs-className distinction, and any state-management pitfalls specific to the organism (e.g. AlertDialog's confirm/cancel slot mutual-exclusion with `children`).

Top-level sections are H2 (`##`); nested categories are H3 (`###`). Don't skip heading levels — `markdown/heading-increment` will fail `bun lint`. Every fenced code block needs an explicit language tag (`text` for ASCII trees, `bash` for shell, `tsx`/`ts`/`css` for code).

### 6. `index.ts` — the barrel

```ts
export * from './<Component>';
export * from './<component>.variants';
```

Two lines. Nothing else. No side effects, no default exports.

## Naming and import conventions

- **Component file**: PascalCase (`Accordion.tsx`, `DataTable.tsx`, `DropdownMenu.tsx`).
- **Variants file**: lowercase + `.variants.ts`; kebab-case for multi-word (`data-table.variants.ts`, `dropdown-menu.variants.ts`).
- **Test file**: PascalCase + `.test.tsx`.
- **Story file**: PascalCase + `.stories.tsx`.
- **Path alias**: import composed molecules from `@/molecules/<Name>`, atoms from `@/atoms/<Name>`, particles from `@/particles/...`. Never use deep relative paths like `../../molecules/Popover`. Sibling imports inside the same organism directory use `./<name>`.
- **Quotes**: single quotes in `.ts` / `.tsx`. ESLint auto-fixes — write that way to keep diffs clean.
- **Barrels**: `export *` unless there's a name collision; in that case, re-export explicitly.
- **Imports**: ESLint enforces grouping/sorting. Expect `import * as React from 'react'` and Radix imports to be grouped with third-party; `@/molecules/*`, `@/atoms/*`, and `@/particles/*` live in their own group below; relative `./...` is last. Write imports already grouped this way.

## The composition rule (cardinal)

Organisms compose molecules, atoms, and particles. They MUST NOT compose other organisms — promote to template instead.

**Three rules, enforced by ESLint `no-restricted-imports` keyed off `files: ['src/organisms/**/*.{ts,tsx}']` in `eslint.config.mjs`:**

1. **No organism-to-organism imports.** An organism MUST NOT import from `@/organisms/*`, `../organisms/*`, or any relative path that reaches another organism. When a candidate composes another organism (e.g. a Sidebar that uses Sheet, a Sheet that uses Dialog, a DatePicker that uses Calendar + Popover), promote it to template — the organism layer is single-encapsulation only. The Phase 4 templates (Sheet, Sidebar, DatePicker, NavigationMenu, Tabs) exist precisely because they sit above this boundary.
2. **No upward-layer imports.** An organism MUST NOT import from `@/templates/*`, `@/pages/*`, or `@/providers/*`. Imports go strictly downward: organism → molecule → atom → particle → token.
3. **Molecules, atoms, and particles are the only legal upstream layers.** Imports from `@/molecules/<Name>`, `@/atoms/<Name>`, and `@/particles/*` are unrestricted. Internal sibling imports inside the organism directory (`./accordion.variants`, `./useFilteredItems`) are unrestricted.

The lint guard intentionally matches the import-path string, not the resolved module — a guard fires against `@/organisms/X` even if `X` does not exist yet. This lets you add the guard before organisms ship and trust it from day one.

If you need a knob that the current layer-direction rule prevents (e.g. an organism that genuinely needs another organism's state), the answer is "promote to template" or "lift the shared surface into a particle that both organisms can consume", not "open a guard exception". The Phase 4 Sidebar / Sheet pair documents the particle-extraction path: when both wanted shared anchored-surface treatment, the answer was to lift the cva into `src/particles/anchored-surface.variants.ts` rather than have Sidebar import Sheet.

## The promote-to-template rule

The Phase 3 → Phase 4 boundary is governed by the same rule that draws atom → molecule: **composition surface**. A molecule composes atoms; the moment it would need a second molecule, it becomes an organism. An organism composes molecules + atoms; the moment it would need a second organism, it becomes a template.

Concrete heuristics for picking the right layer at design time:

- **Composes only atoms / a single Radix primitive / pure HTML?** Atom or molecule. Atom if a single rendered element; molecule if it owns a slot vocabulary and an axis lookup table.
- **Composes molecules + atoms with internal state / context but no second organism?** Organism. Accordion (composes Collapsible molecule + auto-injects chevron) and Combobox (composes Popover molecule + Input atom + filter state) are canonical.
- **Composes another organism, OR frames the page surface (sidebar / drawer / tab shell / global navigation / date picker that pairs Calendar + Popover)?** Template. Sheet composes Dialog. Sidebar would compose Sheet — but the lint guard blocks template-composes-template too, so Sidebar lifts the shared anchored-surface treatment into a particle. DatePicker composes Calendar + Popover.
- **Wraps the app tree to provide context (direction, theme, tooltip provider) with no rendered DOM beyond `children`?** Provider — see [../provider-authoring/SKILL.md](../provider-authoring/SKILL.md) when that file lands.

The rule is **not** about complexity or line count. A small organism that composes one molecule (Field → Input + Label + Typography) is fine; a large organism that composes only atoms (DataTable → Table + Pagination — wait, Pagination is an organism, so DataTable is a template? No — Pagination composes ButtonGroup molecule, atoms, and lucide icons, so it stays in the organism layer; DataTable composes Pagination organism + Table molecule + Checkbox atom, which would make it a template by the rule above) demonstrates that the rule is not always obvious at first glance. Read the PLAN's per-component classification for the iteration's intent — if a piece feels like it should promote, raise it in the planning channel rather than re-decide mid-implementation.

## The className rule (cardinal)

**Organisms MUST NOT accept `className` as a public prop.** The rule is identical to the atom and molecule layers, with one organism-specific extension: **organisms also MUST NOT pass `className` into composed molecules**. Molecules already reject `className` at the type level (their props interface uses `Omit<..., 'className'>`), so the violation surfaces at compile time, but the rule is also conceptual: an organism that needed to nudge a molecule's styling via a className string would be working around the variant system.

What this means in practice:

- Do NOT include `className` in the organism's public props interface.
- Do NOT destructure `className` from props.
- Do NOT pass a consumer-supplied string into the organism's own `cn(...)`.
- Do NOT pass `className` (consumer-supplied or organism-derived) into a composed molecule or atom (`<Card className={...} />` or `<Popover className={...} />` is wrong even if the value is a constant).
- DO add `'className'` to the existing `Omit<...>` clause when the props interface extends a React HTMLAttributes type. Without the `Omit`, `className` is implicitly inherited and would land on the rendered root via `{...rest}`.

When an organism needs to nudge a composed molecule's / atom's styling, the recipe is:

- **If the need is general** (every consumer of the molecule / atom would benefit), add a variant axis to the molecule / atom — see [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md) or [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md).
- **If the need is organism-specific** (only this organism cares), map the organism's own variant axis into an existing molecule / atom variant via a lookup table — see "Variant propagation" below.

What's still fine:

- Inside an organism, `cn()` can compose classes from a base block plus variant-driven conditions (e.g., `cn(accordionItemVariants({ size }), isDisabled && 'opacity-50')`).
- Per-state tinting of slot content via descendant selectors in the organism's own subpart cva (`'[&_[data-slot=accordion-trigger]]:text-foreground'`) is acceptable — the styling lives on the organism's element, not on a string passed into the composed molecule / atom.

**Compliance is universal as of Phase 3.** Every organism under `src/organisms/` follows this rule. Accordion is the canonical reference — open `src/organisms/Accordion/Accordion.tsx` to see the props interface using `Omit<..., 'className' | ...>` and the composed `<Collapsible>` invocation with no `className` prop.

## Variant propagation

Organisms own a **lookup table** from each public axis to each composed molecule's / atom's axis. Direct passthrough is fine when values match; explicit mapping is required when axes diverge or names differ.

Pattern (from Accordion):

```tsx
const collapsibleSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const triggerVariantForSize = { sm: 'h5', md: 'h4', lg: 'h3' } as const;

// inside the component:
return (
  <Collapsible size={collapsibleSizeForSize[resolvedSize]} trigger={...}>
    <Typography variant={triggerVariantForSize[resolvedSize]}>{trigger}</Typography>
  </Collapsible>
);
```

Rules:

- Tables are `const` records with `as const` so TypeScript narrows the result to a specific union, not `string`. Without `as const`, the composed molecule / atom rejects the result.
- Resolve defaults explicitly (`const resolvedSize = size ?? 'md';`) before indexing. Don't index with a possibly-undefined value.
- One lookup table per (organism axis × composed molecule/atom axis) pair. If an organism's `size` axis drives both `Collapsible.size` and a subpart's Typography variant, write two tables — combining them is unnecessary cleverness and harder to extend.
- The organism's variants file may emit empty class strings (when the organism delegates root styling to a composed molecule / atom) or real classes (when the organism owns visible root styling). Both shapes are valid; pick based on whether the organism's root element is a styled `<div>` it owns or a delegated composed root.
- Reflect resolved axes on the rendered root as `data-*` attributes (`data-state`, `data-size`, `data-orientation`, `data-density`) so tests and downstream styling can observe them without className introspection. The composed molecule's / atom's own data-attributes (`data-padding`, `data-variant`) propagate naturally from below.

## Slot props

The organism layer extends the molecule slot-prop vocabulary with two organism-only patterns: **items[] descriptors** and **controlled-passthrough state slots**.

| Slot | Type | Purpose |
| --- | --- | --- |
| `title` | `React.ReactNode` | Rendered inside `Typography(variant=h*)` by default (variant chosen by organism's `size` axis). |
| `description` | `React.ReactNode` | Rendered inside `Typography(variant=caption)`. |
| `leading` | `React.ReactNode` | Leading icon/avatar/badge. Wrapped in `<span aria-hidden>` when decorative. |
| `trailing` | `React.ReactNode` | Trailing actions/badges/chevrons. |
| `actions` | `React.ReactNode` | Bottom action row. |
| `header` | `React.ReactNode` | Overrides the default `leading` + `title` + `description` layout (mutually exclusive with the default). |
| `footer` | `React.ReactNode` | Bottom section. |
| `trigger` | `React.ReactElement` | Radix-trigger organisms only — see "The trigger pattern" in the molecule skill (organisms follow the same pattern). |
| `items` | `<Component>Item[]` | Data-driven organisms (Accordion, Breadcrumb, DropdownMenu, Pagination, NativeSelect, Command, Resizable). Discriminated union with required `type` tag — see "Discriminated-union items[]" below. |
| `columns` | `ColumnDef<T>[]` | DataTable-style organisms. Generic column-descriptor union over the row type. |
| `confirmAction` / `cancelAction` | `React.ReactElement` | AlertDialog-style organisms with two-button footer. Single elements so `React.cloneElement` can inject Radix state plumbing. |

Rules:

- Slot content renders raw inside the composed molecule / atom. The organism does NOT wrap it in styled containers or inject `className`.
- `header` (and similar override slots) is mutually exclusive with the default layout slots. Document this in the README's Do / Don't.
- Default-content slot props are `React.ReactNode` (allows null/false/array/string/element). `trigger`, `confirmAction`, and `cancelAction` must be a single `React.ReactElement` so `React.cloneElement` / `asChild` work.
- Type the prop interface with `Omit<HTMLAttrs, 'title' | 'className' | ...>` whenever a slot name collides with a native HTMLAttribute.

### Discriminated-union items[]

Data-driven organisms accept an `items: <Component>Item[]` prop where `<Component>Item` is a discriminated union with a required `type` tag. Examples:

- Accordion: `{ type: 'item', value, trigger, content, disabled? }`.
- Breadcrumb: `{ type: 'crumb', label, href?, current? } | { type: 'separator', icon? }`.
- DropdownMenu: `{ type: 'item', value, label, leading?, trailing?, disabled?, onSelect? } | { type: 'separator' } | { type: 'label', label } | { type: 'group', label?, items: [...] }`.
- Pagination uses a computed range internally rather than an items[] surface — the prop shape is `{ page, pageCount, onPageChange, siblingCount, showFirstLast }` and the range computation lives in a pure helper at the top of the component file.

Rules:

- **The `type` discriminator is required, not optional.** `{ type: 'item' | 'separator' }` narrows correctly in `items.map(...)`; `{ type?: 'item' }` does not.
- **Export each entry interface from the public types** (`AccordionItemEntry`, `BreadcrumbCrumbEntry`, `BreadcrumbSeparatorEntry`) so consumers building items[] dynamically can `satisfies` against the right union member.
- **Item-value-as-React-key is canonical.** Use the descriptor's `value` (or `label`/`href` when there is no `value`) as the React key. Separators have no natural identity so `key={`separator-${index}`}` is acceptable — but use a stable suffix, not the raw index alone, when the items[] array can be reordered at runtime.
- **Render branch coverage in tests.** Exercise at least one descriptor of each discriminated-union variant in the test fixture; otherwise branch coverage silently drops below the 75% threshold.
- For deeper discriminated-union pitfalls (the `type="<discriminator>" as const` requirement when forwarding into Radix, the "string is not assignable to string[]" trap when spreading a union into Radix), see the discriminated-union section of [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md) — the same rules apply at the organism layer.

## Internal state and context

Organisms are the first layer where stateful coordination across composed pieces is routine. The atom layer is stateless by design; the molecule layer ships a handful of stateful primitives (Switch, RadioGroup, Popover, Tooltip) but each owns a single coordinated state. Organisms routinely own multiple coordinated states (Combobox's open + query + selection, DataTable's sort + filter + page + selection, Calendar's month + selection).

### What's allowed

- **`React.useState`** for selection, expansion, pagination, filter, sort, and any other coordinated state. Document the controlled-passthrough pattern when the organism exposes both controlled and uncontrolled APIs (see below).
- **`React.useId()`** for accessible-name pairing across rendered children — Accordion's per-item `aria-controls`/`id` pair derives from a single base id; AlertDialog's `aria-labelledby`/`aria-describedby` derives the same way. Use the descriptor's `value` as the per-item suffix, not the array index, so re-orderings don't break the pairing mid-render.
- **`React.useContext`** for downstream data access. Organisms may consume context from providers (Direction provider, Theme provider) but MUST NOT create their own user-facing context — context creation that's part of the public API lives in the provider layer.
- **Custom hooks** colocated in the component file (`useFilteredItems`, `useSortableColumns`, `useDateRange`) or extracted into a sibling helper module inside the organism directory (`src/organisms/DataTable/useSortableColumns.ts`). Helpers do not get their own six-file treatment; they are sibling implementation details of the organism. Sibling helpers MAY import from `@/molecules/*`, `@/atoms/*`, `@/particles/*`, and other sibling helpers; the same upward-import ban applies.
- **`React.useEffect`** sparingly, and only when the effect cannot be replaced by a derived value, an event handler, or a `useMemo`. Effects that synchronize derived state from props are usually a smell — derive on render instead. Effects that sync to the DOM (scroll restoration, focus management) are fine.
- **`React.useMemo` / `React.useCallback`** for genuinely expensive computations or stable callback identities consumed by `React.memo` children. Don't sprinkle them defensively; profile first.

### Controlled-passthrough pattern

When an organism exposes both a controlled and an uncontrolled API (Accordion's `value` / `defaultValue` / `onValueChange`, AlertDialog's `open` / `defaultOpen` / `onOpenChange`, Combobox's `value` / `defaultValue` / `onValueChange`), follow the molecule layer's controlled-passthrough recipe:

```tsx
const isControlled = value !== undefined;
const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? initialValue);
const resolvedValue = isControlled ? value : uncontrolledValue;
const handleValueChange = (next: TValue) => {
  if (!isControlled) setUncontrolledValue(next);
  onValueChange?.(next);
};
```

When the organism wraps a Radix Root with both `value` and `defaultValue` exposed, do NOT also pass `defaultValue` to Radix — `value !== undefined` makes Radix treat the component as controlled and `defaultValue` becomes a no-op (with a dev warning). Consume `defaultValue` as the initial value of the internal `useState` and destructure it out of the rest spread so it does not reach Radix. Same trap as Collapsible's `defaultOpen`.

### What's not allowed

- **Cross-organism state sharing via shared context** — that's the template layer's job. If two organisms need to coordinate (Sidebar's nav state with a top-bar's breadcrumb), the template above them owns the shared context.
- **Mutating props.** Standard React rule; the organism layer just reinforces it because more state is in scope.
- **Side-effecting on render.** Same React rule; `useEffect` or event handlers, never the render body.

## The trigger pattern

For Radix-trigger organisms (Dialog, AlertDialog, Drawer, DropdownMenu, Menubar, Combobox), follow the same `trigger: React.ReactElement` + internal `<Radix*.Trigger asChild>` pattern documented in [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md). The rules carry over unchanged:

- `trigger: React.ReactElement` (not `ReactNode`).
- The `asChild` is an internal implementation detail; the consumer never sees it.
- The consumer is responsible for the trigger's accessible name.
- For tests, query the portaled content with `screen.findByRole(...)`.

Additionally, for organisms with a two-button footer (AlertDialog's `confirmAction` + `cancelAction`), the same single-element rule applies: each slot is a single `React.ReactElement` so the organism can use `React.cloneElement` to inject Radix's `<RadixAlertDialog.Action asChild>` / `<RadixAlertDialog.Cancel asChild>` semantics onto the consumer's Button.

## Authoring rules

- **Types colocated** in `<Component>.tsx` for organisms. Split into a separate `<Component>.types.ts` only when discriminated unions (DropdownMenu's nested items union, DataTable's column descriptor) are wide enough to warrant a dedicated file.
- **No default exports** anywhere under `src/organisms/`.
- **No barrel side effects** — barrels only re-export.
- **Shared helpers belong in `particles/` or sibling modules.** If two organisms need the same className helper (e.g. the anchored-surface treatment shared by Sheet and Sidebar at the template layer), lift it to `src/particles/<shape>.variants.ts` rather than copying. Helpers that are organism-specific (DataTable's `useSortableColumns`) stay as siblings inside the organism directory.
- **No `asChild` on the organism's outer API.** Organisms render multiple elements and cannot collapse to a Slot. `asChild` is reserved for the internal `trigger` / `confirmAction` / `cancelAction` pattern above.
- **Default `type='button'`** when an organism renders a native `<button>`. Atoms and molecules already handle this; organisms just need to forward correctly through `asChild`.
- **Layer direction is one-way.** Organism imports molecule / atom / particle; molecule / atom never imports organism. The lint guard fires both ways.

## The organism is also a registry item

Every organism must appear in `registry.json` `items[]` (file lives at the package root). Required fields:

- `name`: kebab-case (e.g. `accordion`, `data-table`, `dropdown-menu`).
- `type`: `registry:ui`.
- `files`: array of `{ path, type }` entries pointing at the `.tsx` and `.variants.ts` (repo-relative paths like `src/organisms/Accordion/Accordion.tsx`).
- `registryDependencies`: array of **npm package names** the wrapper imports beyond `react` and `@/particles/cn` (e.g. `@radix-ui/react-accordion`, `@radix-ui/react-dialog`, `vaul`, `cmdk`, `react-resizable-panels`, `react-day-picker`, `sonner`, `lucide-react`). Empty array for pure-composition organisms with no external imports (e.g. `empty`, `field`, `input-group`).

**Internal molecule and atom imports (e.g. an organism's tsx importing `@/molecules/Collapsible` or `@/atoms/Card`) are NOT listed in `registryDependencies`.** They resolve via the build alias / package subpath, not via npm. The convention matches the atom and molecule layers.

For registry semantics, the shadcn CLI workflow, and how `registryDependencies` differs from shadcn's evolving `radix-ui` umbrella convention, see [../shadcn-integration/SKILL.md](../shadcn-integration/SKILL.md).

## Patterns by organism shape

The organism layer covers several recurring shapes. The cardinal rules above (six-file, composition, className, slot vocabulary, promote-to-template) apply to all of them; this section documents the per-shape specifics. Many shape-specific pitfalls (portal pitfalls, surface cva siblings, accessible-name on portaled content, the `bg-popover`/`bg-card` silent token drop, `contentProps` `Omit`, `modal` defaults, the discriminated-union `as const` rule, Radix Select polyfill chain, descendant-selector cell styling, `peer-disabled` modifier limits, multi-item id derivation) carry over from the molecule layer — see the corresponding sections in [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md) and [../component-testing/SKILL.md](../component-testing/SKILL.md) before authoring.

### Composition-only organisms (Empty, Field, InputGroup, Pagination)

Organisms with no Radix dependency and no portal compose molecules + atoms directly and own their root `<div>`. The variants file emits real classes for the root layout (Empty's vertical stack + centered alignment, Field's column layout with label-above-input rhythm, InputGroup's wrapper-frame composition). No `useState` unless the organism owns coordinated state (Pagination derives its range from props with a pure helper, no internal state).

Field is the canonical demonstration of `React.useId()` for label/control id pairing — generate the base id once, expose `id` as a prop override, and derive `htmlFor` on the Label atom + `id` on the Input atom from the same base. Description and error message ids derive the same way for `aria-describedby` / `aria-errormessage` wiring.

### Items[]-driven static organisms (Breadcrumb)

Breadcrumb is a stateless items[]-driven organism: the items[] descriptor union is `{ type: 'crumb', label, href?, current? } | { type: 'separator', icon? }`, the root renders as `<nav aria-label="Breadcrumb">` with an ordered list inside, and the last crumb (or any crumb with `current: true`) is marked with `aria-current="page"` and rendered without an anchor wrapper. Default separator is lucide-react's `ChevronRight`; consumers can override per-separator via the `icon` field.

When a crumb has both `href` and `current: true`, the organism resolves the conflict by rendering the label only (no anchor) — `aria-current="page"` is mutually exclusive with link semantics. Document this precedence in the README's Do / Don't.

### Radix portal wrappers (Dialog, AlertDialog, Drawer, DropdownMenu, Menubar, Sonner, Command)

Portal-based organisms apply ALL of the portal pitfalls documented in the portal-based section of [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md) — re-emitting `data-placement` / `data-align` is forbidden, the surface cva is sibling to the sizing cva, the accessible-name-on-portaled-content rule requires `title` or `contentProps['aria-label']`, `bg-popover` / `text-popover-foreground` are silently undeclared (use `bg-background` / `text-foreground` or add the tokens), `contentProps` MUST `Omit` `'className'`, and `modal={false}` is the default for popover-style wrappers.

Two organism-specific extensions:

- **`await axe(document.body)` in tests.** Radix portals render outside the bound container; `await axe(container)` silently misses the portaled content. Every portal-based organism's a11y assertion MUST use `document.body`. This is the single most important deviation from the molecule baseline.
- **Surface cva sibling pattern is mandatory** when the portal-based organism conditionally composes Card (or another surface atom) AND falls back to inline surface styling. Pattern: keep `<organism>ContentVariants` for sizing + positioning only; export a sibling `<organism>ContentSurfaceVariants` cva for the surface (border + bg + shadow + padding); compose conditionally in `cn(base, !hasCard && surface(...))`. Dialog and AlertDialog both use this; Drawer follows the same pattern.

AlertDialog specifically: the `severity: 'info' | 'warning' | 'danger'` axis maps to the confirm Button's `variant` axis via a lookup table (`{ info: 'default', warning: 'default', danger: 'destructive' }` — adjust to match the Button atom's variant names). `confirmAction` and `cancelAction` are single `React.ReactElement` slots; the organism uses `React.cloneElement` to inject `<RadixAlertDialog.Action asChild>` / `<RadixAlertDialog.Cancel asChild>` semantics.

Sonner is the only portal-based organism with no `trigger` — it renders the global Toaster host once at the app root and exposes a `toast` helper re-export so consumers don't import `sonner` directly. Document the toast-firing pattern in the Sonner README's Do / Don't. The 9-way position grid (`top-left`, `top-center`, ..., `bottom-right`) is the canonical variant axis; `richColors`, `expand`, and `closeButton` are boolean axes on the same cva.

Drawer's `vaul` library is gesture-driven and side-anchored; document the difference vs Dialog in the README. The `side: 'top' | 'right' | 'bottom' | 'left'` axis maps to vaul's `direction` prop (note the rename — vaul uses `direction`, organisms use `side` to match the team vocabulary). The `size` axis maps to a CSS length token; vaul handles the gesture math.

### Stateful items[]-driven organisms (DropdownMenu, Menubar, Command, Combobox)

Items[]-driven organisms with internal state combine the discriminated-union items[] rule (above) with internal state coordination. DropdownMenu / Menubar / Command have no organism-owned state (Radix owns open/close, cmdk owns query); the organism just renders the items[] tree into the appropriate Radix subcomponents. Combobox owns its own open state (composes Popover molecule + Input atom + filter state via `useState`) since the Popover trigger seam doesn't expose the filter input directly.

For Command specifically: the `cmdk` library's `<CommandInput />` already wires the type-ahead filter; the organism's items[] descriptor maps each entry to the appropriate cmdk subcomponent (`<CommandItem />`, `<CommandSeparator />`, `<CommandGroup heading>`, `<CommandEmpty />`). Test the type-ahead filter by typing into the input and asserting on the rendered items[].

### Heavy stateful organisms (Calendar, DataTable)

Calendar owns the date-grid state via `react-day-picker` — the library handles month rendering, selection coordination, and keyboard navigation. The organism's job is variant propagation (`size` axis), accessible labeling, and exposing the controlled-passthrough API (`mode`, `selected`, `onSelect`, `defaultMonth`, `disabled`, `fromDate`, `toDate`). Test selection in each `mode` (`single`, `range`, `multiple`); each mode changes the `onSelect` signature so the test fixture differs per mode.

DataTable is the heaviest organism in the iteration. It composes Table (molecule) + Pagination (organism) + Checkbox (atom) + internal sort/filter/selection state, generic over a row type `<T>` on the props interface. The `ColumnDef<T>` discriminated union — `{ id, header, accessor, sortable?, filterable?, cell? }` — is wide enough to warrant a dedicated `DataTable.types.ts` file (sanctioned exception to the colocated-types rule above). Test sort, filter, page, and selection flows; the variant axes (`size`, `density`) propagate to Table's descendant-selector cell styling via lookup tables. No external `registryDependencies` — Table, Pagination, and Checkbox already pull in what they need.

### Composition-only with internal state (Accordion)

Accordion is the canonical organism (see below). It composes the Collapsible molecule, wraps `@radix-ui/react-accordion` for multi-item coordination, owns the controlled-passthrough state for `value` / `defaultValue` / `onValueChange`, and auto-injects a rotating chevron into each item's trigger via `React.cloneElement` following the Collapsible molecule's chevron-injection pattern. The discriminated `type: 'single' | 'multiple'` props follow the same `*SingleProps` / `*MultipleProps` / `*BaseProps` shape documented in the discriminated-union section of [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md) — pass `type="<discriminator>" as const` explicitly to Radix in each branch so it sees the correct narrowed shape.

## The canonical reference: Accordion

Phase 3 designates `src/organisms/Accordion/` as the canonical reference. Read all six files before authoring any other organism.

Accordion is intentionally minimal-but-representative:

- Composes one molecule (Collapsible) plus an auto-injected chevron — the canonical organism-composes-molecule demo.
- Wraps `@radix-ui/react-accordion` for multi-item coordination (`type: 'single' | 'multiple'` discriminated props).
- Has two axes (`type`, `size`) demonstrating the discriminated-union props pattern and lookup-table propagation to Collapsible (`collapsibleSizeForSize`).
- Demonstrates the items[]-descriptor pattern (`{ type: 'item', value, trigger, content, disabled? }`) with required discriminator and item-value-as-React-key.
- Demonstrates auto-injection via `React.cloneElement` (rotating chevron in each item's trigger).
- Demonstrates the controlled-passthrough state pattern for `value` / `defaultValue` / `onValueChange`.
- Demonstrates `data-state` and `data-orientation` reflection on the rendered root for testing.
- Has a Radix dependency but no portal — leaving portal-specific concerns (Dialog, DropdownMenu, etc.) to the portal-based section of this skill.

## The `## Composition` README section

Every organism's README includes a `## Composition` section between `## Variants` and `## Accessibility`. The section makes the organism's place in the layered architecture explicit. Use the following template, adapting bullets to the organism (the outer fence below uses four backticks so the inner triple-backtick `ts` block is preserved when the template is copied into a per-organism README):

````markdown
## Composition

- **Composed molecules and atoms:** `<Molecule>` provides ..., `<Atom>` renders ....
- **Variant propagation via lookup tables.** The organism owns the mapping
  from its own axes to each composed molecule's / atom's axes:

  ```ts
  const collapsibleSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const triggerVariantForSize = { sm: 'h5', md: 'h4', lg: 'h3' } as const;
  ```

  `size` maps to `<Molecule>`'s `<axis>` axis (passthrough/explicit lookup). ...
- **No `className` flows downward.** Molecules and atoms reject `className`
  both at the type level and at runtime. If a knob the variants don't cover
  is needed, add a variant axis on the molecule / atom OR on this organism —
  don't open an escape hatch.
- **Slot prop vocabulary.** `leading`, `title`, `description`, `header`,
  `actions`, plus `items[]` for the data-driven body (descriptor:
  `{ type: 'item', value, trigger, content, disabled? }`). Slot content
  renders raw inside the composed molecule / atom; the organism does not
  inject styling into consumer-supplied nodes.
- **Layer-import direction.** Imports `@/molecules/<Molecule>`,
  `@/atoms/<Atom>`, and `@/particles/cn`. Does NOT import other organisms,
  templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`. If composition of
  another organism is required, the answer is "promote to template" or
  "lift the shared surface to a particle", not "open a guard exception".
````

## Per-organism procedure (copy from Accordion)

Phase 3 chose **hand-write Accordion as the canonical reference, copy-shape for every other organism**. No code-generation script, no plop/hygen templates. Each organism is authored in its own task by reading Accordion and adapting.

### Procedure

For each new organism:

1. Open `src/organisms/Accordion/` and read all six files end-to-end. Accordion is ground truth for file layout, TSDoc style, variant naming, the items[]-descriptor pattern, lookup-table propagation, auto-injection via `React.cloneElement`, controlled-passthrough state, discriminated-union props, test structure, story structure, README structure (including the `## Composition` section).
2. Look up the organism's spec (variants, props, items[] descriptor union, underlying Radix primitive or library, composed molecules / atoms) wherever the iteration's planning lives — usually the PLAN's per-organism task or a transient planning document at the package root. That spec is the only intentional deviation from Accordion.
3. Create `src/organisms/<Component>/` with the six required files. Start each file by copying its Accordion counterpart, then adapt:
   - `<component>.variants.ts`: rename `accordionVariants` → `<component>Variants`. Decide whether the root cva emits real classes (when the organism owns visible root styling) or empty strings (when the organism delegates root styling to a composed molecule / atom). Add subpart cva blocks when the organism needs descendant-selector styling beyond what the composed pieces provide.
   - `<Component>.tsx`: rename the component and props interface. Replace the composed molecule and atoms. Replace the root render (Radix Accordion Root → the appropriate Radix Root, or a plain `<div>` for composition-only organisms). Keep the `forwardRef` shape. Add `Radix*.Trigger` / `Radix*.Portal` if the organism is Radix-state-based with a portal. Update the lookup tables to match the organism's axes. Update the items[] discriminated union to match the organism's data shape. Add internal `useState` + the controlled-passthrough pattern when the organism exposes both controlled and uncontrolled APIs.
   - **Props interface inheritance**: when the props interface extends a React HTMLAttributes type (or a Radix primitive's props), `Omit` the keys that collide with variant axes AND `'className'` AND any slot-prop names that collide with native HTMLAttributes (e.g. `'title'` on `<div>`). Accordion's canonical shape is `extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | ...>, AccordionVariants`. Replicate the pattern: keep `'className'` in every organism's `Omit<...>`, and add slot-prop or native-attribute names that collide. Without the `Omit`, the colliding key is inherited and either breaks the variant typing or leaks to the DOM via `{...rest}`.
   - `<Component>.test.tsx`: keep the same five-assertion baseline (renders all slots, composes expected molecule / atom role, variant propagation, no a11y violations, state behavior / override). For portal-based organisms, use `await axe(document.body)` instead of `await axe(container)` — the single most important deviation. Adjust the role / variant / state under test. For portaled molecules, use `screen.findByRole(...)`. Exercise one descriptor of each discriminated-union variant in the items[] fixture.
   - `<Component>.stories.tsx`: copy meta shape, retitle `Organisms/<Component>`, adjust `argTypes` and the `AllVariants` matrix. Add state-demo or slot-override stories per the organism's shape (see "File-by-file requirements" section 4). For data-driven organisms, supply a realistic fixture of at least 20 entries.
   - `README.md`: copy the section order, fill the props/variants tables, rewrite the `## Composition` section per the template above, rewrite the Do/Don't bullets if non-obvious. Document `await axe(document.body)` and the accessible-name requirement for portal-based organisms.
   - `index.ts`: re-export the component and the variants module.
4. Append the organism to `registry.json` `items[]` with `registryDependencies` listing only external npm packages (Radix primitives, `vaul`, `cmdk`, `react-resizable-panels`, `react-day-picker`, `sonner`, `lucide-react`). Internal `@/molecules/*` and `@/atoms/*` imports are NOT registry deps.
5. Add the organism to `src/organisms/index.ts` (the layer barrel) and to `vite.config.ts` `build.lib.entry` (per-organism entry under `organisms/<Name>`).
6. Run `bun run check-types && bun run test && bun run lint` locally. Do not move on while any of them fails.

## Layer overview (where organisms sit)

```text
src/
├── index.ts                 # top-level barrel — re-exports every layer
├── styles/globals.css       # Tailwind v4 entry + @theme tokens
├── particles/               # shared helpers (cn, variants, tokens, wrapper-frame, ...)
├── atoms/                   # 18 single-entry wrappers
├── molecules/               # 15 atom-composing wrappers
├── organisms/               # THIS FILE'S DOMAIN — 17 molecule-composing wrappers
├── templates/               # 5 organism-composing surfaces (Phase 4)
├── providers/               # context-only wrappers (Phase 5)
└── pages/                   # placeholder barrel
```

Import direction is strictly one-way and bounded by the ESLint `no-restricted-imports` guard:

- organism → molecule: OK (`@/molecules/Collapsible`, `@/molecules/Popover`).
- organism → atom: OK (`@/atoms/Card`, `@/atoms/Button`).
- organism → particle: OK (`@/particles/cn`, `@/particles/wrapper-frame.variants`).
- organism → organism: BLOCKED. Promote to template OR lift the shared surface to a particle.
- organism → template / page / provider: BLOCKED.
- molecule → organism: BLOCKED. Molecules don't compose organisms; if shared logic is needed, lift it to a particle.

When in doubt about which layer something belongs in, ask: does it compose another organism? Yes → template. Does it compose molecules + atoms with internal state / context? Yes → organism. Does it compose only atoms / pure-HTML / a single Radix primitive? Yes → molecule. Does it render a single element / wrap a single Radix primitive without composition? Yes → atom.

## When in doubt

- Open Accordion and read it.
- The relevant skill (linked from each section above) has the deeper context.
- If a convention here conflicts with a transient planning doc (iteration plan, ticket spec), the planning doc wins for scope; this skill wins for file layout, naming, and the cardinal rules (className, composition, promote-to-template, portal-axe-on-document.body).
