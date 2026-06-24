---
name: template-authoring
description: Use when adding a new template, editing an existing template's file layout, or anything that touches the six-file convention under src/templates/<Component>/. Covers naming, displayName, forwardRef, the no-public-className rule, the layer-import (composition) rule, the README's loose "Templates" deviation, slot-prop vocabulary, variant propagation, internal hooks/state/context, the template-composes-template ban + particle-extraction escape, and the per-template generation procedure.
---

# Template Authoring

This skill is the canonical source for "how a template is built" in `packages/ui-skeleton/`. Read it end-to-end before adding or restructuring any template. Atoms (single-element wrappers) are covered in [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md); molecules (atom-composing wrappers) are covered in [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md); organisms (molecule-composing wrappers with internal state / context) are covered in [../organism-authoring/SKILL.md](../organism-authoring/SKILL.md). Read all three first if you have not yet. The template layer composes organisms, molecules, atoms, and particles; everything that holds for organisms holds for templates unless this file overrides it.

## What "template" means in this package (deviation from textbook atomic design)

The package's `README.md` defines a Template as **"a group of organisms that form a page"** — the textbook Brad Frost / atomic design definition. The four canonical templates this iteration ships (`NavigationMenu`, `Sheet`, `Sidebar`, `Tabs`) **frame the page surface** but do not, by themselves, "form a page" in the strict sense:

- `NavigationMenu` is a top-level nav shell — it frames the page chrome but isn't the page.
- `Sheet` is a side-anchored overlay that wraps a Dialog — it frames a page-edge surface but isn't the page either.
- `Sidebar` is a desktop-persistent + mobile-collapsible nav rail — same shape.
- `Tabs` is a section-level orientation surface that organizes content within a page — closer to a complex organism in the textbook reading.
- `DatePicker` (added by the Phase 3 → Phase 4 promotion rule) is the most interesting deviation: it isn't a page surface at all — it composes the Popover molecule + the Calendar organism. It lives in the template layer purely because the layer-import guard forbids organism-composes-organism. See "The composition rule" below.

This deviation from textbook atomic design is **intentional** and matches how the README's "Suggested component organization for shadcn based components" inventory lays things out. The template layer in this package is best read as **"the layer that may compose organisms"** rather than as "page-layout shells". The same convention is documented in `README.md`'s Phase 4 audit bullet.

When a future template clearly *is* a page-layout shell (a marketing landing scaffold, an auth-flow shell, a settings-page scaffold), the textbook reading kicks back in — but the file shape, the composition rules, and the cardinal rules in this skill are the same either way.

## The contract: six files, one directory, no exceptions

Every template lives in its own directory under `src/templates/<Component>/` and contains exactly six files. The set is identical to the atom, molecule, and organism layers; the contents differ.

```text
src/templates/<Component>/
├── <Component>.tsx              # React component (PascalCase) — composes organisms + molecules + atoms
├── <component>.variants.ts      # CVA variants (lowercase / kebab-case)
├── <Component>.test.tsx         # Vitest + Testing Library + jest-axe
├── <Component>.stories.tsx      # Storybook 8 stories with autodocs
├── README.md                    # per-component documentation (includes ## Composition)
└── index.ts                     # barrel re-exporting the component + variants
```

The set is enforced by tooling (registry.json schema, downstream consumers, the lint pipeline) and by team convention. Six files in, six files out. No exceptions for "wraps a single Radix primitive" or "thin-shell template that delegates everything to a composed organism" — the size threshold is the layer's composition surface, not the per-file count. (The provider layer is the only layer with a sanctioned six-file deviation; see [../provider-authoring/SKILL.md](../provider-authoring/SKILL.md) when that file lands.)

## File-by-file requirements

### 1. `<Component>.tsx` — the component

- PascalCase filename matching the directory name.
- **No default exports.** Use a named export wrapped in `React.forwardRef`.
- Set `<Component>.displayName = "<Component>";` immediately after `forwardRef`.
- **Generic-over-T templates** (future list-of-T scaffolds, paginated grid shells) follow the same plain-function + cast pattern documented for DataTable in [../organism-authoring/SKILL.md](../organism-authoring/SKILL.md): author `<Component>Impl<T>(props: <Component>Props<T>): React.JSX.Element` as a plain function and bind the public export through a one-step `as` assertion. Refs are not forwarded in this mode; document the no-ref behavior in the README. `react/display-name` is off in the package's ESLint config so the cast pattern lints cleanly without further annotation.
- TSDoc on the exported component: one-line summary, `@remarks` (call out variant-propagation lookup tables, which organisms / molecules / atoms are composed, any internal state / context the template owns, and — for templates that frame the page surface — the layout role), `@example`.
- Props declared as a named `interface <Component>Props` that extends the rendered root element's attrs (or the Radix root primitive's props) **plus** the `VariantProps` derived from the variants file.
- **No `className` in the props interface.** Add `'className'` to the `Omit<...>` clause on every HTMLAttributes-derived parent type. The className rule (cardinal) below has the full rationale.
- Standard slot-prop vocabulary lives on the public API (see "Slot props" below). Slot content renders raw inside composed organisms / molecules / atoms — templates do NOT inject styling into consumer-supplied nodes.
- All template styling MUST flow through the variants call: `cn(<component>Variants({ ... }))` for the root and/or `cn(<componentSubpart>Variants({ ... }))` for header/content/footer/rail subparts. Do NOT accept a public `className` prop and do NOT pass a `className` string into a composed organism / molecule / atom — see the className rule below.
- Variant propagation from the template's axes to each composed organism's / molecule's / atom's axes lives in **lookup tables** colocated with the component (see "Variant propagation" below).
- Import composed organisms from `@/organisms/<Name>`, molecules from `@/molecules/<Name>`, atoms from `@/atoms/<Name>`. Import the variants from the sibling `<component>.variants.ts`. Never re-derive variant logic inline.
- **Internal hooks, state, and context are allowed**, and template-owned context is the first place where it is sanctioned as part of the public API. Templates that frame a page surface (Sidebar, NavigationMenu) routinely expose context to nested children (active route, current section, collapse state). Templates that pair an organism with a popover (DatePicker) own controlled-passthrough state coordinating both pieces. See "Internal state and context" below.

### 2. `<component>.variants.ts` — the variants

- Lowercase filename (`tabs.variants.ts`); kebab-case for multi-word names (`navigation-menu.variants.ts`, `date-picker.variants.ts`).
- Exports `<component>Variants` built with `cva(...)` and a sibling type `<Component>Variants = VariantProps<typeof <component>Variants>`.
- A template's root cva may emit real classes (when the template owns visible root styling, e.g. Sidebar's persistent-rail frame, Tabs' orientation-aware container) or empty strings (when the template delegates all root styling to a composed organism / molecule, e.g. Sheet delegates to Dialog's surface). Both shapes are valid; the choice mirrors the molecule and organism layers' empty-root-cva patterns. The cva still exists so `VariantProps<typeof <component>Variants>` produces the public type that the props interface extends.
- For subpart styling that the template owns (e.g. a Tabs trigger rail, a Sidebar header band, a NavigationMenu viewport floor), export additional cva blocks from the same file (`<component><Subpart>Variants`).
- Order inside each cva block: base classes first, then `variants`, then `defaultVariants`.
- Use design-system tokens from `@/styles/globals.css` (e.g. `bg-primary`, `text-foreground`, `ring-ring`, `shadow-elev-1`) — never raw colors. See [../styling/SKILL.md](../styling/SKILL.md) for the token contract.
- Only this file and `src/particles/` may call `cva` directly. The component file imports the call expression; it never builds its own variants inline.
- For deeper CVA patterns (variant maps, boolean axes, multi-element variants, polymorphic axes, the `Omit<...,'size'>` trap), see [../cva-variants/SKILL.md](../cva-variants/SKILL.md).
- When a template would like to share a layout-frame cva with another template (the Sidebar / Sheet anchored-surface case), **lift the shared cva to `src/particles/<shape>.variants.ts`** and have both templates consume the particle. The template-composes-template ban makes this the only sanctioned shape-sharing path.

### 3. `<Component>.test.tsx` — the tests

Template tests have the **five-assertion baseline** inherited from the organism layer, including the `document.body` axe scan rule for portal-based templates:

1. **Renders all slots.** Query each slot (`leading`, `title`, `description`, body `children`, `header`, `footer`, `nav`, items[] descriptors, etc.) via `getByText`, `getByTestId`, `data-slot=...` selectors, or — for items[]-driven templates — by asserting one element per descriptor index. A missing slot is a silent regression.
2. **Composes the expected organism / molecule / atom role(s).** Use `getByRole('tablist')` for Tabs, `getByRole('navigation')` for NavigationMenu / Sidebar, `getByRole('dialog')` for Sheet, `getByRole('combobox')` for DatePicker's trigger button, etc. Confirms the template actually delegates to the expected composed piece and not a generic `<div>`.
3. **Variant propagation.** Pass a non-default value on the template's axis (e.g. `size="lg"`, `orientation="vertical"`, `side="right"`, `density="compact"`) and assert that the composed organisms / molecules / atoms receive the mapped variant — query via `data-*` attributes on the rendered composed root (e.g. `toHaveAttribute('data-side', 'right')` on the Dialog root that Sheet delegates to). Avoid brittle className introspection.
4. **No a11y violations.** `await axe(container)` returns `toHaveNoViolations()` — **except for portal-based templates.** Sheet, NavigationMenu (when the viewport portals), DatePicker, and any future Radix-portal-rendering template MUST call `await axe(document.body)` instead. Same rule, same rationale as the organism layer: Radix portals into `document.body`, and a container-scoped axe scan silently misses the portaled content. This is the single most important deviation from the organism baseline (which inherits it from the molecule baseline).
5. **State behavior.** For stateful templates (Tabs' active-tab switching, Sheet's open/close, DatePicker's open + select + close + display-format, Sidebar's collapse/expand), verify the controlled/uncontrolled flow. Use `screen.findByRole(...)` (the `find*` family) for portaled content. For items[]-driven templates with discriminated unions (NavigationMenu's `link | menu | separator`), exercise at least one descriptor of each variant in the test fixture so the rendering branch coverage holds.

Use `@testing-library/jest-dom/vitest` matchers (registered in `vitest.setup.ts`). Coverage thresholds apply per-package, not per-file: 80% lines / 80% statements / 75% branches / 80% functions.

For testing pitfalls (jsdom limits, Radix gated behaviors, `ResizeObserver` polyfill, `bun test` vs `bun run test`, the portal/`findByRole` rule, axe `region` workarounds), see [../component-testing/SKILL.md](../component-testing/SKILL.md).

### 4. `<Component>.stories.tsx` — the stories

- `title: 'Templates/<Component>'`
- `component: <Component>`
- `tags: ['autodocs']`
- Minimum stories:
  - `Default` — the simplest meaningful invocation.
  - `AllVariants` — matrix rendering every variant value side-by-side. For items[]-driven templates (NavigationMenu), include at least one descriptor of each discriminated-union variant.
  - For stateful templates: at least one state-demo story (`Open`, `Vertical`, `Collapsed`, `WithRange`) that exercises the controlled API or interactive flow.
  - For slot-heavy templates: at least one story that exercises a non-default slot override (`WithCustomHeader`, `WithFooter`, `WithoutTrigger`).
  - For templates that frame the page surface (Sidebar, NavigationMenu): include a realistic story with a fake page body (a `<main>` placeholder, a Lorem-ipsum article block) so the autodocs visual matches the in-product framing.
- Declare `argTypes` for every variant prop so controls are usable; declaring `argTypes: { className: { table: { disable: true } } }` is **not** needed — templates don't expose `className`, so it simply isn't in the props interface.

For Storybook configuration, headless verification, and the addon stack, see [../storybook/SKILL.md](../storybook/SKILL.md).

### 5. `README.md` — per-component documentation

Sections, in this order:

- `# <Component>` (single H1 — markdown lint enforces no second H1 anywhere in the file)
- One-sentence description and the underlying Radix primitive (or `"authored from scratch"` if it has no Radix equivalent), plus the organisms / molecules / atoms it composes.
- `## Import` — single line: `import { <Component> } from '@open-tomato/ui-skeleton';`
- `## Props` — table of props, types, defaults. Include the slot props (`leading`, `title`, `description`, `header`, `footer`, `trigger`, `nav`, `items`, etc. as applicable).
- `## Variants` — table or matrix of variant values, including the **lookup-table mapping** to composed organism / molecule / atom axes (e.g. Tabs' `size → Button.size`, Sheet's `side → Dialog.contentProps.side`, DatePicker's `size → Calendar.size` + `size → Popover.size`). This is the template-specific documentation surface.
- `## Composition` — **template section.** Lists composed organisms + molecules + atoms, lookup tables, the no-`className`-downward rule, the slot-prop vocabulary, the layer-import direction, and — when applicable — the rationale for compose-via-particle (Sidebar / Sheet anchored-surface case). See "The `## Composition` README section" below for the full template adapted to the template layer.
- `## Accessibility` — keyboard, ARIA, focus, portal semantics, and `data-*` notes. For portal-based templates, document the accessible-name requirement (`title` element, `contentProps['aria-label']`, or Radix auto-`aria-labelledby` wiring). For templates that frame the page surface, document landmark roles (`<nav>`, `<aside>`, `<main>`-sibling expectations).
- `## Do / Don't` — short list reinforcing the variant-only styling rule, the slot-vs-className distinction, the template-composes-template ban with the particle-extraction escape, and any state-management pitfalls specific to the template (e.g. DatePicker's controlled-passthrough between Popover and Calendar, Sidebar's collapsed-state context).

Top-level sections are H2 (`##`); nested categories are H3 (`###`). Don't skip heading levels — `markdown/heading-increment` will fail `bun lint`. Every fenced code block needs an explicit language tag (`text` for ASCII trees, `bash` for shell, `tsx`/`ts`/`css` for code).

### 6. `index.ts` — the barrel

```ts
export * from './<Component>';
export * from './<component>.variants';
```

Two lines. Nothing else. No side effects, no default exports.

## Naming and import conventions

- **Component file**: PascalCase (`Tabs.tsx`, `NavigationMenu.tsx`, `DatePicker.tsx`).
- **Variants file**: lowercase + `.variants.ts`; kebab-case for multi-word (`navigation-menu.variants.ts`, `date-picker.variants.ts`).
- **Test file**: PascalCase + `.test.tsx`.
- **Story file**: PascalCase + `.stories.tsx`.
- **Path alias**: import composed organisms from `@/organisms/<Name>`, molecules from `@/molecules/<Name>`, atoms from `@/atoms/<Name>`, particles from `@/particles/...`. Never use deep relative paths like `../../organisms/Dialog`. Sibling imports inside the same template directory use `./<name>`.
- **Quotes**: single quotes in `.ts` / `.tsx`. ESLint auto-fixes — write that way to keep diffs clean.
- **Barrels**: `export *` unless there's a name collision; in that case, re-export explicitly.
- **Imports**: ESLint enforces grouping/sorting. Expect `import * as React from 'react'` and Radix imports to be grouped with third-party; `@/organisms/*`, `@/molecules/*`, `@/atoms/*`, and `@/particles/*` live in their own group below; relative `./...` is last. Write imports already grouped this way.

## The composition rule (cardinal)

Templates compose organisms, molecules, atoms, and particles. They MUST NOT compose other templates — if two templates would share a frame, lift the shared frame into a particle.

**Three rules, enforced by ESLint `no-restricted-imports` keyed off `files: ['src/templates/**/*.{ts,tsx}']` in `eslint.config.mjs`:**

1. **No template-to-template imports.** A template MUST NOT import from `@/templates/*`, `../templates/*`, or any relative path that reaches another template. When a candidate composes another template (e.g. a Sidebar that would use Sheet to render its mobile-collapsed drawer), **lift the shared anchored-surface treatment to `src/particles/anchored-surface.variants.ts`** and have both templates consume the particle. The template-composes-template ban is the single most important rule at this layer; it is what keeps the template layer composable rather than a tangled DAG.
2. **No upward-layer imports.** A template MUST NOT import from `@/pages/*` or `@/providers/*`. Imports go strictly downward: template → organism → molecule → atom → particle → token. Providers are intentionally above templates in the import hierarchy — they wrap the app tree, and a template that imported a provider would create a cycle.
3. **Organisms, molecules, atoms, and particles are the only legal upstream layers.** Imports from `@/organisms/<Name>`, `@/molecules/<Name>`, `@/atoms/<Name>`, and `@/particles/*` are unrestricted. Internal sibling imports inside the template directory (`./tabs.variants`, `./useTabHistory`) are unrestricted.

The lint guard intentionally matches the import-path string, not the resolved module — a guard fires against `@/templates/X` even if `X` does not exist yet. This lets you add the guard before templates ship and trust it from day one.

**Template-may-compose-organism is the headline upgrade vs the organism layer.** The Phase 3 organism layer explicitly forbids organism-composes-organism precisely so the work-around (Sheet composing Dialog, DatePicker composing Popover + Calendar) lands cleanly in the template layer. This is also the reason DatePicker was promoted from Organism to Template in the Phase 3 close-out — it needed to compose Calendar (an organism) and Popover (a molecule), and the organism layer's guard blocked the first half.

### The Sheet / Sidebar particle-extraction precedent

The canonical demonstration of the template-composes-template ban + particle-extraction escape is the Sheet / Sidebar pair:

- Both templates want a **side-anchored, slide-in surface treatment** (border + bg + shadow + entrance animation + side-specific positioning).
- Sheet composes the **Dialog organism**, so its surface treatment is largely delegated to Dialog's portal-based content.
- Sidebar would *like* to compose Sheet for its mobile-collapsed drawer mode, but the layer guard blocks `@/templates/Sheet` from inside `src/templates/Sidebar/`.
- The answer is **NOT** to add a guard exception, NOT to copy-paste the cva, and NOT to import Sheet via a relative path that bypasses the alias guard. The answer is to lift the shared anchored-surface cva to `src/particles/anchored-surface.variants.ts` and have both Sheet and Sidebar consume the particle directly. Sheet still composes the Dialog organism for its portal + accessibility machinery; Sidebar consumes the particle in its mobile-collapsed branch and falls back to its persistent-rail frame in the desktop branch.

The precedent generalizes: **any visual treatment two templates would share is a particle candidate.** Don't optimize for one-off duplication — the moment a second template wants the same frame, lift to particle.

## The README's "Templates form a page" deviation (and why this skill overrides it)

The `README.md` "Atomic Design System" section currently reads:

> A **Template** is a group of organisms that form a page. It is a high-level component that defines the overall structure and layout of a page, but does not include any specific content.

The four canonical templates in this iteration **do not** strictly fit that definition:

- `NavigationMenu`, `Sheet`, `Sidebar`, and `Tabs` are **page-surface frames** — they organize content within a page rather than constituting the page itself.
- `DatePicker` is **not even a page-surface frame** — it's a compound widget. It lives at the template layer purely because the organism-composes-organism ban forced the promotion.

Both deviations are intentional and documented in `README.md`'s Phase 4 audit bullet (dated annotation, the original prose is preserved). The operational definition this skill enforces is **"the layer that may compose organisms"** — file shape, composition rules, and cardinal rules in this skill take precedence over the README's textbook prose.

If a future template clearly *is* a page-layout shell (a marketing landing scaffold, an auth-flow shell, a settings-page scaffold) and matches the textbook reading, nothing in this skill changes — the file shape, the composition rules, and the cardinal rules are the same. The README's prose simply becomes accurate again for that template.

## The className rule (cardinal)

**Templates MUST NOT accept `className` as a public prop.** The rule is identical to the atom, molecule, and organism layers, with one template-specific extension: **templates also MUST NOT pass `className` into composed organisms or molecules**. Organisms and molecules already reject `className` at the type level (their props interfaces use `Omit<..., 'className'>`), so the violation surfaces at compile time, but the rule is also conceptual: a template that needed to nudge an organism's styling via a className string would be working around the variant system.

What this means in practice:

- Do NOT include `className` in the template's public props interface.
- Do NOT destructure `className` from props.
- Do NOT pass a consumer-supplied string into the template's own `cn(...)`.
- Do NOT pass `className` (consumer-supplied or template-derived) into a composed organism, molecule, or atom (`<Dialog className={...} />`, `<Popover className={...} />`, or `<Card className={...} />` is wrong even if the value is a constant).
- DO add `'className'` to the existing `Omit<...>` clause when the props interface extends a React HTMLAttributes type. Without the `Omit`, `className` is implicitly inherited and would land on the rendered root via `{...rest}`.

When a template needs to nudge a composed organism's / molecule's / atom's styling, the recipe is:

- **If the need is general** (every consumer of the organism / molecule / atom would benefit), add a variant axis to the organism / molecule / atom — see [../organism-authoring/SKILL.md](../organism-authoring/SKILL.md), [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md), or [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md).
- **If the need is template-specific** (only this template cares), map the template's own variant axis into an existing organism / molecule / atom variant via a lookup table — see "Variant propagation" below.
- **If the need is layout-level granularity** (a Sidebar that wants a wider rail than the rail variant axis offers), add a new variant axis to the template itself — layout-level granularity flows through variant axes only, never through className.

What's still fine:

- Inside a template, `cn()` can compose classes from a base block plus variant-driven conditions (e.g., `cn(sidebarFrameVariants({ side, collapsed }), isMobile && 'pointer-events-auto')`).
- Per-state tinting of slot content via descendant selectors in the template's own subpart cva (`'[&_[data-slot=sidebar-nav-link]]:text-foreground'`) is acceptable — the styling lives on the template's element, not on a string passed into the composed organism / molecule / atom.

**Compliance is universal as of Phase 4.** Every template under `src/templates/` follows this rule. Tabs is the canonical reference — open `src/templates/Tabs/Tabs.tsx` to see the props interface using `Omit<..., 'className' | ...>` and the composed `<Button>` and Radix `<TabsContent>` invocations with no `className` prop.

## Variant propagation

Templates own a **lookup table** from each public axis to each composed organism's / molecule's / atom's axis. Direct passthrough is fine when values match; explicit mapping is required when axes diverge or names differ.

Pattern (from Tabs):

```tsx
const buttonSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const buttonVariantForActive = { active: 'default', inactive: 'ghost' } as const;

// inside the component:
return (
  <RadixTabs.Trigger asChild value={item.value}>
    <Button
      size={buttonSizeForSize[resolvedSize]}
      variant={buttonVariantForActive[isActive ? 'active' : 'inactive']}
    >
      {item.trigger}
    </Button>
  </RadixTabs.Trigger>
);
```

Rules:

- Tables are `const` records with `as const` so TypeScript narrows the result to a specific union, not `string`. Without `as const`, the composed organism / molecule / atom rejects the result.
- Resolve defaults explicitly (`const resolvedSize = size ?? 'md';`) before indexing. Don't index with a possibly-undefined value.
- One lookup table per (template axis × composed piece's axis) pair. If a template's `size` axis drives both `Calendar.size` and `Popover.size` (DatePicker), write two tables — combining them is unnecessary cleverness and harder to extend.
- The template's variants file may emit empty class strings (when the template delegates root styling to a composed organism / molecule) or real classes (when the template owns visible root styling). Both shapes are valid; pick based on whether the template's root element is a styled `<div>` / `<nav>` / `<aside>` it owns or a delegated composed root.
- Reflect resolved axes on the rendered root as `data-*` attributes (`data-state`, `data-size`, `data-orientation`, `data-side`, `data-collapsed`) so tests and downstream styling can observe them without className introspection. The composed organism's / molecule's own data-attributes (`data-padding`, `data-variant`) propagate naturally from below.

**Layout-level granularity propagates only through variant axes.** When a template needs to expose more granular layout control than its composed organism's axes provide (a Sidebar that wants both a `collapsed` boolean axis and a fine-grained `density: 'compact' | 'comfortable' | 'spacious'` axis on the rail), add the new axis to the template's own cva — do not surface a passthrough `className` or `style` prop. This is the template-layer extension of the className cardinal rule.

## Slot props

The template layer inherits the molecule + organism slot-prop vocabulary unchanged, plus two template-specific patterns: **page-surface landmark slots** (`nav`, `header`, `footer` as `<nav>` / `<header>` / `<footer>` rather than generic content wrappers) and **controlled-passthrough state slots** for compound-widget templates.

| Slot | Type | Purpose |
| --- | --- | --- |
| `title` | `React.ReactNode` | Rendered inside `Typography(variant=h*)` by default (variant chosen by template's `size` axis). |
| `description` | `React.ReactNode` | Rendered inside `Typography(variant=caption)`. |
| `leading` | `React.ReactNode` | Leading icon/avatar/badge. Wrapped in `<span aria-hidden>` when decorative. |
| `trailing` | `React.ReactNode` | Trailing actions/badges/chevrons. |
| `header` | `React.ReactNode` | Page-surface templates render this inside `<header>`; widget templates use it to override the default `leading` + `title` + `description` layout. |
| `footer` | `React.ReactNode` | Page-surface templates render this inside `<footer>`; widget templates use it as the bottom action row. |
| `nav` | `<NavItem>[]` or `React.ReactNode` | Page-surface templates only (Sidebar, NavigationMenu). Renders inside `<nav>` with the appropriate `aria-label`. |
| `trigger` | `React.ReactElement` | Radix-trigger templates (Sheet, DatePicker) — see "The trigger pattern" in the organism skill (templates follow the same pattern). |
| `items` | `<Component>Item[]` | Data-driven templates (Tabs, NavigationMenu). Discriminated union with required `type` tag — see "Discriminated-union items[]" below. |
| `content` | `React.ReactNode` | Tabs uses this per-item (each Tabs item has its own `content` field). |

Rules:

- Slot content renders raw inside the composed organism / molecule / atom. The template does NOT wrap it in styled containers or inject `className`.
- `header` (and similar override slots) is mutually exclusive with the default layout slots in widget mode (DatePicker). In page-surface mode (Sidebar, NavigationMenu), `header` is additive — it always renders inside `<header>` alongside the default `nav` / body / `footer` slots.
- Default-content slot props are `React.ReactNode` (allows null/false/array/string/element). `trigger` must be a single `React.ReactElement` so `React.cloneElement` / `asChild` work.
- Type the prop interface with `Omit<HTMLAttrs, 'title' | 'className' | ...>` whenever a slot name collides with a native HTMLAttribute.

### Discriminated-union items[]

Data-driven templates accept an `items: <Component>Item[]` prop where `<Component>Item` is a discriminated union with a required `type` tag (for templates with multiple item shapes) or a plain interface (for templates with a single item shape). Examples:

- Tabs: `{ value, trigger, content, disabled? }` — single shape, no discriminator needed.
- NavigationMenu: `{ type: 'link', label, href, leading? } | { type: 'menu', label, content } | { type: 'separator' }` — three shapes, required `type` discriminator.
- Sidebar's `nav` items: `{ label, href, leading?, trailing?, active? }` — single shape, no discriminator.

Rules:

- **The `type` discriminator is required when there are multiple item shapes.** `{ type: 'link' | 'menu' | 'separator' }` narrows correctly in `items.map(...)`; `{ type?: 'link' }` does not. Single-shape items don't need a discriminator.
- **Export each entry interface from the public types** (`NavigationMenuLinkEntry`, `NavigationMenuMenuEntry`, `NavigationMenuSeparatorEntry`) so consumers building items[] dynamically can `satisfies` against the right union member.
- **Item-value-as-React-key is canonical** (or `label` / `href` when there is no `value`). Separators have no natural identity so `key={`separator-${index}`}` is acceptable — but use a stable suffix when items[] can be reordered at runtime.
- **Render branch coverage in tests.** Exercise at least one descriptor of each discriminated-union variant in the test fixture; otherwise branch coverage silently drops below the 75% threshold.
- For deeper discriminated-union pitfalls (the `type="<discriminator>" as const` requirement when forwarding into Radix, the "string is not assignable to string[]" trap when spreading a union into Radix), see the discriminated-union section of [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md) — the same rules apply at the template layer.

## Internal state and context

Templates inherit the full organism-layer state allowance (see [../organism-authoring/SKILL.md](../organism-authoring/SKILL.md)). Two template-specific extensions:

### Template-owned public context is allowed

Unlike organisms (which can consume context but must NOT create user-facing context), **templates MAY create context that is part of the public API**. Examples:

- Sidebar exposes a `SidebarContext` so deeply-nested nav items can read the collapsed state without prop drilling.
- NavigationMenu exposes a `NavigationMenuContext` for the active-section indicator.
- Tabs delegates its context to Radix Tabs — Radix owns the active-tab state context, and consumers query it via `data-state="active"` on the rendered trigger.

The provider layer (`src/providers/`) is for **app-tree-wide** context (Direction, Theme); templates own **section-scoped** context. The two are distinct concerns and do not overlap.

When a template creates context:

- Export the context's hook (`useSidebar`, `useNavigationMenu`) from the template's barrel so consumers don't import the raw `React.Context` object.
- The hook MUST throw a descriptive error when called outside the template's provider tree (`'useSidebar must be used inside <Sidebar>'`). This catches missing-provider bugs at the first render call.
- The context type lives in the same `.tsx` file as the template; do not split into a `.types.ts` file unless the type is wide enough to warrant it (Sidebar's context isn't; DataTable's `ColumnDef<T>` discriminated union is, hence DataTable's organism-layer `DataTable.types.ts` precedent).

### Controlled-passthrough across two composed pieces

When a template composes two stateful pieces and exposes a unified controlled API across both (DatePicker's `value` / `onValueChange` that drives both the Popover's open/close and the Calendar's selected date), follow the molecule layer's controlled-passthrough recipe — but apply it **twice**, once per composed piece:

```tsx
const isValueControlled = value !== undefined;
const [uncontrolledValue, setUncontrolledValue] = React.useState<Date | undefined>(defaultValue);
const resolvedValue = isValueControlled ? value : uncontrolledValue;

const [isOpen, setIsOpen] = React.useState(false);

const handleValueChange = (next: Date | undefined) => {
  if (!isValueControlled) setUncontrolledValue(next);
  onValueChange?.(next);
  setIsOpen(false); // close popover on selection
};
```

The two state machines (date selection, popover open/close) are coordinated by the template — the consumer sees a single `value` / `onValueChange` surface. Document the coordination in the README's `## Composition` section so consumers understand the template's responsibility for the two-piece dance.

## The trigger pattern

For Radix-trigger templates (Sheet, DatePicker — and any future template with a popover/dialog seam), follow the same `trigger: React.ReactElement` + internal `<Radix*.Trigger asChild>` pattern documented in [../organism-authoring/SKILL.md](../organism-authoring/SKILL.md) and [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md). The rules carry over unchanged:

- `trigger: React.ReactElement` (not `ReactNode`).
- The `asChild` is an internal implementation detail; the consumer never sees it.
- The consumer is responsible for the trigger's accessible name.
- For tests, query the portaled content with `screen.findByRole(...)`.

When a template composes an organism that already owns its own `trigger` slot (Sheet composes Dialog, and Dialog already exposes `trigger`), the template's `trigger` prop is **forwarded** to the composed organism's `trigger` slot — the template does NOT re-wrap or re-implement the trigger pattern. The single source of truth lives one layer down.

## Authoring rules

- **Types colocated** in `<Component>.tsx` for templates. Split into a separate `<Component>.types.ts` only when discriminated unions (NavigationMenu's `link | menu | separator` if it grows nested children, a future template's column descriptor) are wide enough to warrant a dedicated file.
- **No default exports** anywhere under `src/templates/`.
- **No barrel side effects** — barrels only re-export. Re-export the template's context hook (e.g. `useSidebar`) alongside the component and variants.
- **Shared helpers belong in `particles/` or sibling modules.** If two templates need the same className helper (the Sidebar / Sheet anchored-surface case), lift it to `src/particles/<shape>.variants.ts` rather than copying. Helpers that are template-specific (DatePicker's date-formatter) stay as siblings inside the template directory.
- **No `asChild` on the template's outer API.** Templates render multiple elements and cannot collapse to a Slot. `asChild` is reserved for the internal `trigger` pattern above.
- **Default `type='button'`** when a template renders a native `<button>`. Atoms, molecules, and organisms already handle this; templates just need to forward correctly through `asChild`.
- **Layer direction is one-way.** Template imports organism / molecule / atom / particle; organism / molecule / atom never imports template. The lint guard fires both ways.

## The template is also a registry item

Every template must appear in `registry.json` `items[]` (file lives at the package root). Required fields:

- `name`: kebab-case (e.g. `tabs`, `navigation-menu`, `date-picker`).
- `type`: `registry:ui`.
- `files`: array of `{ path, type }` entries pointing at the `.tsx` and `.variants.ts` (repo-relative paths like `src/templates/Tabs/Tabs.tsx`).
- `registryDependencies`: array of **npm package names** the wrapper imports beyond `react` and `@/particles/cn` (e.g. `@radix-ui/react-tabs`, `@radix-ui/react-navigation-menu`). Empty array for templates that pull in no new external deps beyond what their composed organisms / molecules already declare (e.g. `sheet` composes Dialog and adds no new external deps; `date-picker` composes Popover + Calendar and adds no new external deps).

**Internal organism, molecule, and atom imports (e.g. a template's tsx importing `@/organisms/Dialog`, `@/molecules/Popover`, or `@/atoms/Card`) are NOT listed in `registryDependencies`.** They resolve via the build alias / package subpath, not via npm. The convention matches the atom, molecule, and organism layers.

For registry semantics, the shadcn CLI workflow, and how `registryDependencies` differs from shadcn's evolving `radix-ui` umbrella convention, see [../shadcn-integration/SKILL.md](../shadcn-integration/SKILL.md).

## Patterns by template shape

The template layer covers several recurring shapes. The cardinal rules above (six-file, composition, className, slot vocabulary, template-composes-template ban) apply to all of them; this section documents the per-shape specifics. Many shape-specific pitfalls (portal pitfalls, surface cva siblings, accessible-name on portaled content, the `bg-popover`/`bg-card` silent token drop, `contentProps` `Omit`, `modal` defaults, the discriminated-union `as const` rule, descendant-selector cell styling, multi-item id derivation) carry over from the molecule and organism layers — see the corresponding sections in [../organism-authoring/SKILL.md](../organism-authoring/SKILL.md), [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md), and [../component-testing/SKILL.md](../component-testing/SKILL.md) before authoring.

### Radix orientation-aware templates (Tabs)

Tabs is the canonical reference (see below). The `orientation: 'horizontal' | 'vertical'` axis drives both the Radix Tabs `orientation` prop and the template's own root cva (flex-row vs flex-col, trigger rail along the top vs along the left edge). The `size` and `density` axes map to the composed Button atom's axes via lookup tables. Internal `useState` for the active tab implements the controlled-passthrough pattern (`value` / `defaultValue` / `onValueChange`); when `value !== undefined`, do NOT also pass `defaultValue` to Radix.

### Page-surface frame templates (NavigationMenu, Sidebar)

Page-surface frames own their landmark roles (`<nav>` for NavigationMenu, `<aside>` for Sidebar) and own a context that downstream children can read (active section, collapse state). The `header` / `nav` / `footer` slots are additive (not mutually exclusive) — each renders inside its own landmark element with the appropriate `aria-label` or default semantic role.

For NavigationMenu specifically: when the viewport-based Content portals, apply ALL of the portal pitfalls documented in the portal-based section of [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md) and the organism-layer extensions (`await axe(document.body)`, surface cva sibling pattern, accessible-name on portaled content, `bg-popover`/`bg-card` silent token drop, `contentProps` `Omit<..., 'className'>`).

For Sidebar specifically: the desktop-persistent + mobile-collapsible split is the canonical demonstration of the **two-branch template** pattern. The desktop branch renders an inline `<aside>` with the rail frame; the mobile branch renders the same content into a side-anchored overlay using the particle-extracted anchored-surface cva (see the Sheet / Sidebar precedent under "The composition rule" above). Test both branches: at desktop viewport width and at mobile viewport width with `collapsed={true}` and `collapsed={false}` toggled.

### Organism-composing wrapper templates (Sheet)

Sheet composes the Dialog organism for its portal + accessibility machinery + surface treatment, and only owns the side-anchoring axis (`side: 'top' | 'right' | 'bottom' | 'left'`) and the size axis (`size: 'sm' | 'md' | 'lg' | 'xl'`). The slot vocabulary mirrors Dialog (`trigger`, `title`, `description`, `header`, `footer`, `children`) and is forwarded one-to-one. The template's own root cva is largely empty — Dialog owns the visible root styling — except for the side-positioning classes that anchor Dialog's content to the appropriate viewport edge.

The shared anchored-surface treatment with Sidebar is lifted to `src/particles/anchored-surface.variants.ts`; both templates consume the particle. This is the canonical particle-extraction precedent.

**Transitional escape: `contentProps.style` + `contentProps['data-side']`.** Until the particle is extracted, Sheet projects its side-anchoring through `contentProps.style` (inline CSS overrides Dialog's centered `left-1/2 top-1/2 -translate-x-* -translate-y-*` via specificity) plus `contentProps['data-side']` for test introspection. Dialog's `contentProps` type omits `'className'` per the no-className-downward cardinal rule but does NOT omit `'style'` or `'data-*'`, so the projection is type-safe. Sheet's own public `contentProps` type then `Omit`s `'style'` and `'data-side'` so consumers cannot undo the template-projected positioning. The `transform: 'translate(0, 0)'` reset is required to undo Dialog's centering translate; this trades away Dialog's zoom/fade entrance animation, which the particle-extracted version restores via dedicated slide-in keyframes per side. See `src/templates/Sheet/README.md` for the full rationale. The same `contentProps.style` + `data-*` escape generalizes to any future template composing a portal-based organism with a strict-no-`className` `contentProps` (a future template composing DropdownMenu / AlertDialog with non-default positioning would use the same projection path).

### Compound-widget templates (DatePicker)

DatePicker is the deviation: it isn't a page-surface frame at all. It composes the Popover molecule + the Calendar organism + internal controlled-passthrough state coordinating both pieces. The `size` axis maps to both `Popover.size` (if Popover exposes a size axis) and `Calendar.size` via two separate lookup tables. The `value` / `onValueChange` API is controlled-passthrough across two state machines (date selection, popover open/close) — see "Controlled-passthrough across two composed pieces" above.

DatePicker is the demonstration of the **promote-to-template-because-organism-can't-compose-organism** path. It would have lived as an organism if the layer guard allowed Calendar (organism) + Popover (molecule) composition; the organism layer's ban forced the promotion. Document this in the DatePicker README's `## Composition` section so future authors understand why DatePicker isn't an organism even though it doesn't frame a page.

## The canonical reference: Tabs

Phase 4 designates `src/templates/Tabs/` as the canonical reference. Read all six files before authoring any other template.

Tabs is intentionally minimal-but-representative:

- Wraps a single Radix primitive (`@radix-ui/react-tabs`) — no portal, no organism composition, no two-piece state coordination. The simplest of the four template-group primitives.
- Composes the Button atom for triggers — the canonical demo of variant propagation through a lookup table (`buttonSizeForSize`).
- Has three axes (`orientation`, `size`, `density`) demonstrating both Radix-passthrough (`orientation`) and template-owned (`size`, `density`) variant patterns.
- Demonstrates the items[]-descriptor pattern (`{ value, trigger, content, disabled? }`) with a single shape (no discriminator needed at this scale).
- Demonstrates the controlled-passthrough state pattern for `value` / `defaultValue` / `onValueChange`.
- Demonstrates `data-state` and `data-orientation` reflection on the rendered root for testing.
- Has a Radix dependency but no portal — leaving portal-specific concerns (NavigationMenu viewport, Sheet via Dialog) to the per-shape sections of this skill.
- Has no template-owned public context — leaving context-creation concerns to Sidebar and NavigationMenu.

## The `## Composition` README section

Every template's README includes a `## Composition` section between `## Variants` and `## Accessibility`. The section makes the template's place in the layered architecture explicit. Use the following template, adapting bullets to the template (the outer fence below uses four backticks so the inner triple-backtick `ts` block is preserved when the template is copied into a per-template README):

````markdown
## Composition

- **Composed organisms, molecules, and atoms:** `<Organism>` provides ...,
  `<Molecule>` provides ..., `<Atom>` renders ....
- **Variant propagation via lookup tables.** The template owns the mapping
  from its own axes to each composed piece's axes:

  ```ts
  const buttonSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const buttonVariantForActive = { active: 'default', inactive: 'ghost' } as const;
  ```

  `size` maps to `<Atom>`'s `<axis>` axis (passthrough/explicit lookup). ...
- **No `className` flows downward.** Organisms, molecules, and atoms reject
  `className` both at the type level and at runtime. If a knob the variants
  don't cover is needed, add a variant axis on the organism / molecule / atom
  OR on this template — don't open an escape hatch. Layout-level granularity
  flows through variant axes only.
- **Slot prop vocabulary.** `leading`, `title`, `description`, `header`,
  `footer`, plus `items[]` for the data-driven body (descriptor:
  `{ value, trigger, content, disabled? }`). Slot content renders raw inside
  the composed organism / molecule / atom; the template does not inject
  styling into consumer-supplied nodes.
- **Layer-import direction.** Imports `@/organisms/<Organism>`,
  `@/molecules/<Molecule>`, `@/atoms/<Atom>`, and `@/particles/cn`. Does NOT
  import other templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`. If composition of
  another template is required, the answer is "lift the shared surface to a
  particle" (see the Sheet / Sidebar precedent), not "open a guard exception".
````

## Per-template procedure (copy from Tabs)

Phase 4 chose **hand-write Tabs as the canonical reference, copy-shape for every other template**. No code-generation script, no plop/hygen templates. Each template is authored in its own task by reading Tabs and adapting.

### Procedure

For each new template:

1. Open `src/templates/Tabs/` and read all six files end-to-end. Tabs is ground truth for file layout, TSDoc style, variant naming, the items[]-descriptor pattern, lookup-table propagation, controlled-passthrough state, test structure, story structure, README structure (including the `## Composition` section).
2. Look up the template's spec (variants, props, items[] descriptor union, underlying Radix primitive or library, composed organisms / molecules / atoms, owned context if any) wherever the iteration's planning lives — usually the PLAN's per-template task or a transient planning document at the package root. That spec is the only intentional deviation from Tabs.
3. Create `src/templates/<Component>/` with the six required files. Start each file by copying its Tabs counterpart, then adapt:
   - `<component>.variants.ts`: rename `tabsVariants` → `<component>Variants`. Decide whether the root cva emits real classes (when the template owns visible root styling) or empty strings (when the template delegates root styling to a composed organism / molecule). Add subpart cva blocks when the template needs descendant-selector styling beyond what the composed pieces provide. When two templates share a layout frame, lift the cva to a particle (see the Sheet / Sidebar precedent).
   - `<Component>.tsx`: rename the component and props interface. Replace the composed organism / molecule / atom. Replace the root render (Radix Tabs Root → the appropriate Radix Root, or a plain `<div>` / `<nav>` / `<aside>` for compose-only templates). Keep the `forwardRef` shape. Add `Radix*.Trigger` / `Radix*.Portal` if the template is Radix-state-based with a portal. Update the lookup tables to match the template's axes. Update the items[] descriptor (single shape or discriminated union) to match the template's data shape. Add internal `useState` + the controlled-passthrough pattern when the template exposes both controlled and uncontrolled APIs. Add a `React.createContext` + hook when the template owns public context (Sidebar, NavigationMenu).
   - **Props interface inheritance**: when the props interface extends a React HTMLAttributes type (or a Radix primitive's props), `Omit` the keys that collide with variant axes AND `'className'` AND any slot-prop names that collide with native HTMLAttributes (e.g. `'title'` on `<div>`). Tabs' canonical shape is `extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | ...>, TabsVariants`. Replicate the pattern: keep `'className'` in every template's `Omit<...>`, and add slot-prop or native-attribute names that collide. Without the `Omit`, the colliding key is inherited and either breaks the variant typing or leaks to the DOM via `{...rest}`.
   - `<Component>.test.tsx`: keep the same five-assertion baseline (renders all slots, composes expected organism / molecule / atom role, variant propagation, no a11y violations, state behavior / override). For portal-based templates, use `await axe(document.body)` instead of `await axe(container)` — the single most important deviation. Adjust the role / variant / state under test. For portaled content, use `screen.findByRole(...)`. Exercise one descriptor of each discriminated-union variant in the items[] fixture. For two-branch templates (Sidebar's desktop vs mobile), test both branches.
   - `<Component>.stories.tsx`: copy meta shape, retitle `Templates/<Component>`, adjust `argTypes` and the `AllVariants` matrix. Add state-demo or slot-override stories per the template's shape (see "File-by-file requirements" section 4). For page-surface templates (Sidebar, NavigationMenu), include a realistic story with a fake page body.
   - `README.md`: copy the section order, fill the props/variants tables, rewrite the `## Composition` section per the template above, rewrite the Do/Don't bullets if non-obvious. Document `await axe(document.body)` and the accessible-name requirement for portal-based templates. Document the particle-extraction precedent when applicable.
   - `index.ts`: re-export the component and the variants module. Also re-export the template's context hook (e.g. `useSidebar`) when the template owns public context.
4. Append the template to `registry.json` `items[]` with `registryDependencies` listing only external npm packages (Radix primitives, etc.). Internal `@/organisms/*`, `@/molecules/*`, and `@/atoms/*` imports are NOT registry deps.
5. Add the template to `src/templates/index.ts` (the layer barrel) and to `vite.config.ts` `build.lib.entry` (per-template entry under `templates/<Name>`).
6. Run `bun run check-types && bun run test && bun run lint` locally. Do not move on while any of them fails.

## Layer overview (where templates sit)

```text
src/
├── index.ts                 # top-level barrel — re-exports every layer
├── styles/globals.css       # Tailwind v4 entry + @theme tokens
├── particles/               # shared helpers (cn, variants, tokens, wrapper-frame, anchored-surface, ...)
├── atoms/                   # 18 single-entry wrappers
├── molecules/               # 15 atom-composing wrappers
├── organisms/               # 17 molecule-composing wrappers
├── templates/               # THIS FILE'S DOMAIN — 5 organism-composing surfaces
├── providers/               # context-only wrappers (Phase 5)
└── pages/                   # placeholder barrel
```

Import direction is strictly one-way and bounded by the ESLint `no-restricted-imports` guard:

- template → organism: OK (`@/organisms/Dialog`, `@/organisms/Calendar`).
- template → molecule: OK (`@/molecules/Popover`, `@/molecules/Tooltip`).
- template → atom: OK (`@/atoms/Button`, `@/atoms/Card`).
- template → particle: OK (`@/particles/cn`, `@/particles/anchored-surface.variants`).
- template → template: BLOCKED. Lift the shared surface to a particle (see the Sheet / Sidebar precedent).
- template → page / provider: BLOCKED.
- organism → template: BLOCKED (enforced by the organism layer's guard). If an organism needs functionality currently in a template, the organism is mis-classified — promote it or lift a particle.

When in doubt about which layer something belongs in, ask: does it compose another template? Yes → lift the shared surface to a particle and consume from both templates. Does it compose organisms + molecules + atoms with internal state / context? Yes → template (this layer). Does it compose molecules + atoms with internal state / context but no organism? Yes → organism. Does it compose only atoms / pure-HTML / a single Radix primitive? Yes → molecule. Does it render a single element / wrap a single Radix primitive without composition? Yes → atom.

## When in doubt

- Open Tabs and read it.
- The relevant skill (linked from each section above) has the deeper context.
- If a convention here conflicts with a transient planning doc (iteration plan, ticket spec), the planning doc wins for scope; this skill wins for file layout, naming, and the cardinal rules (className, composition, template-composes-template ban, portal-axe-on-document.body).
- If the README's "Templates form a page" prose conflicts with what you are building, this skill wins — the README's prose is preserved for historical context but is annotated by the Phase 4 audit bullet.
