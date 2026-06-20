---
name: provider-authoring
description: Use when adding a new provider, editing an existing provider's file layout, or anything that touches the collapsed file convention under src/providers/<Component>/. Covers naming, displayName, the sanctioned six-file deviation (variants file omitted, stories optional), the no-rendered-DOM-beyond-children rule, the no-`className`-surface rule, the layer-import (particles-only) rule, the public-context-as-API pattern, the provider hook contract, and the per-provider generation procedure.
---

# Provider Authoring

This skill is the canonical source for "how a provider is built" in `packages/ui-skeleton/`. Read it end-to-end before adding or restructuring any provider. Atoms (single-element wrappers) are covered in [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md); molecules (atom-composing wrappers) in [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md); organisms (molecule-composing wrappers with internal state / context) in [../organism-authoring/SKILL.md](../organism-authoring/SKILL.md); templates (organism-composing surfaces and compound widgets) in [../template-authoring/SKILL.md](../template-authoring/SKILL.md). The provider layer is **structurally different** from every layer below it: providers expose context, not visual output, and the file-shape contract collapses accordingly. Read this file before assuming any of the four layered conventions still applies — most of them do, but the deviations matter.

## What "provider" means in this package

A provider wraps the app tree (or a subtree) to expose **app-tree-wide context** to its descendants. Examples:

- `Direction` (Phase 5) — provides `dir: 'ltr' | 'rtl'` via `@radix-ui/react-direction`'s `DirectionProvider`, flipping Radix primitives' directional behavior (Popover `side`, Slider thumb direction, ContextMenu alignment, Tabs orientation).
- Future: `Theme` (light/dark/system mode), `TooltipProvider` (shared `delayDuration` defaults), `Toaster` (sonner host — but Sonner is currently an organism because it renders a visible host).

The provider layer sits **above** templates in the import hierarchy and **below** the consuming app. Providers are mounted once near the root of the consuming app; they never appear inline inside a template, organism, molecule, or atom. The whole point of the layer is to expose context without competing with the visual layers for styling surface.

The line between "template-owned section-scoped context" (Sidebar's `useSidebar`, NavigationMenu's active-section context — see [../template-authoring/SKILL.md](../template-authoring/SKILL.md)) and "provider-layer app-tree-wide context" (Direction, Theme) is the **rendering surface**. Templates render visible markup and own context as a side effect of that markup; providers render `children` and own context as their entire reason for existing.

## The contract: the only sanctioned six-file deviation

Every other layer in the package ships exactly six files per component (`<Component>.tsx`, `<component>.variants.ts`, `<Component>.test.tsx`, `<Component>.stories.tsx`, `README.md`, `index.ts`). The provider layer is the **only** sanctioned deviation, and the deviation is bounded: the variants file is omitted, and the stories file is optional. Nothing else collapses.

```text
src/providers/<Component>/
├── <Component>.tsx              # React component (PascalCase) — wraps children and exposes context
├── <Component>.test.tsx         # Vitest + Testing Library + jest-axe
├── <Component>.stories.tsx      # OPTIONAL — see "When to include stories" below
├── README.md                    # per-component documentation
└── index.ts                     # barrel re-exporting the component + context hook (if any)
```

### Exact conditions under which the file shape collapses

The collapse is conditional, not automatic. Both conditions below must hold for a provider to ship as four (or five with stories) files instead of six:

1. **The provider has no variants.** No public axis maps to a CVA block — the provider's API is exactly `children` plus one or more raw scalar / union props (`dir: 'ltr' | 'rtl'`, `theme: 'light' | 'dark' | 'system'`, `delayDuration: number`) that flow straight through to the wrapped library (Radix, sonner, etc.) without traversing a `cva(...)` call. **If a provider ever needs to emit a class string** — even a single base class on a passthrough wrapper element — the variants file comes back and so does the six-file shape. The condition is "no cva", not "no styling decisions".
2. **The provider renders no visible markup of its own.** Its rendered output is exactly `children` wrapped in zero or more invisible context providers (Radix `DirectionProvider`, a sonner Toaster mounted via portal, a React `Context.Provider`). The component returns `children` (possibly wrapped) and nothing else. If a provider grows a visible mount point (a toast host, a debug banner, a focus-trap region), it ceases to be a pure context wrapper and must add a variants file + stories file — promote it to organism / template in that case rather than expanding the provider's file shape.

When both conditions hold, the file shape is:

- `<Component>.tsx` — required.
- `<Component>.test.tsx` — required.
- `<Component>.stories.tsx` — **optional.** Include it when the provider's effect on descendants is visible in Storybook autodocs and worth demonstrating (e.g. a `Direction` story showing two side-by-side trees, one `ltr` and one `rtl`, each containing a Popover-trigger button so the side-flip is observable). Skip it when the provider's effect is invisible in isolation (a `Theme` provider whose effect is the theme tokens applied at the `<html>` level — there's nothing to render in a story that wouldn't be better demonstrated at the app level).
- `README.md` — required.
- `index.ts` — required.

When **either** condition fails, the standard six-file contract applies — variants file back, stories file required. Promote the candidate out of `src/providers/` if it grew a visible mount point or a variant axis; don't expand the provider's file shape past the collapsed form.

### When the variants file would come back

The variants file comes back the moment a provider needs to:

- Emit a class string on a wrapping element (a `Theme` provider that applies `data-theme={theme}` plus a base `min-h-screen` class on a wrapping `<div>` — this is a sign the provider is becoming a template; re-evaluate the layer).
- Expose a public axis with multiple values that map to anything class-like (a `Density` provider with `density: 'compact' | 'comfortable' | 'spacious'` axes mapped to CSS custom properties on a wrapping element).

In both cases, the answer is **not** "add a variants file to the provider"; the answer is "this is not a pure context wrapper anymore, re-evaluate the layer". Theme tokens are applied via `globals.css` `@theme` blocks (see [../styling/SKILL.md](../styling/SKILL.md)); density axes belong on the consuming organism / template's variant axes. The provider layer's collapsed file shape is a structural signal — when the signal stops fitting, the layer stops fitting.

## File-by-file requirements

### 1. `<Component>.tsx` — the component

- PascalCase filename matching the directory name (`Direction.tsx`).
- **No default exports.** Use a named export.
- **Do NOT wrap in `React.forwardRef`.** Providers do not render a ref-target element; they render `children` (possibly wrapped in zero or more invisible Context providers). Refs have no meaningful target. If a future provider grows a real ref-target (a focus-trap region, a toast-host element), it is not a pure provider anymore — re-evaluate the layer per the rules above.
- Set `<Component>.displayName = "<Component>";` immediately after the function declaration. The displayName helps React DevTools and Storybook controls render the provider name correctly.
- TSDoc on the exported component: one-line summary, `@remarks` (call out which library context the provider wraps — `@radix-ui/react-direction`, `next-themes`, `sonner`, etc. — and what the visible effect on descendants is), `@example`.
- Props declared as a named `interface <Component>Props`. **Do NOT extend any HTMLAttributes type** — the provider renders no rendered root element, so HTML attributes have nowhere to land. The props interface is exactly `{ children: React.ReactNode; <scalar props> }`.
- **No `className` in the props interface.** Same cardinal rule as every other layer, with one provider-specific extension: there is no rendered element to apply a className to even if you wanted to. Do not add `className` to the props; do not destructure `className`; do not include `'className'` in any `Omit<...>` clause (there's no HTMLAttributes type to omit from). The rule is structural rather than configurational at this layer.
- The component body is exactly:

  ```tsx
  export function <Component>({ children, ...props }: <Component>Props): React.JSX.Element {
    return (
      <Library.Provider {...props}>
        {children}
      </Library.Provider>
    );
  }
  ```

  Or, for providers that wrap multiple libraries' contexts or apply a React `Context.Provider`:

  ```tsx
  export function <Component>({ children, ...props }: <Component>Props): React.JSX.Element {
    return (
      <FirstLibrary.Provider {...firstProps}>
        <SecondLibrary.Provider {...secondProps}>
          <InternalContext.Provider value={memoizedValue}>
            {children}
          </InternalContext.Provider>
        </SecondLibrary.Provider>
      </FirstLibrary.Provider>
    );
  }
  ```

- **No styling logic.** No `cn(...)` calls, no class strings, no inline styles. The component file imports React + the wrapped library + (optionally) `@/particles/cn` for context-value memoization helpers and nothing else.
- **Internal `React.useMemo` for context values.** Whenever the provider passes an object literal into a Context.Provider's `value`, wrap it in `useMemo` keyed on the public props. Without the memo, every render produces a fresh object reference and every consumer re-renders. This is the canonical React provider pitfall; it matters more here than in any other layer because providers sit near the root and every consumer is a descendant.
- **Provider hooks colocated.** When the provider exposes a hook for consumers (`useDirection()`, `useTheme()`), the hook is declared in the same `.tsx` file alongside the component and the context object. Export the hook from the barrel; do NOT export the raw `React.Context` object — consumers should always go through the hook so the missing-provider guard fires.

### 2. (omitted) `<component>.variants.ts`

There is no variants file at the provider layer when the collapse conditions hold. The variants file is the only file in the six-file contract that the provider layer drops. Every other layer keeps its variants file regardless of cva content (atoms and molecules with empty-class-string cva blocks still ship a variants file because `VariantProps<typeof <component>Variants>` is part of the public props interface). Providers have no public variant axes by definition — their public API is the wrapped library's scalar props — so the variants file has nothing to declare.

When a provider candidate grows a variant axis, the file shape stops collapsing and the layer designation comes under review. See "When the variants file would come back" above.

### 3. `<Component>.test.tsx` — the tests

Provider tests have a **three-assertion baseline** — closer to the atom layer's three-assertion baseline than to the molecule / organism / template five-assertion baseline. The reason is structural: providers have no slots beyond `children`, no composed organism / molecule / atom roles, and no variant propagation. The five-assertion baseline doesn't apply because three of its five assertions reduce to "renders children" at this layer.

1. **Renders children.** Render the provider with a known-text child and assert the text appears. Confirms the component is not silently swallowing `children` (which is surprisingly easy to do when the wrapped library's `Provider` doesn't render children by default — `next-themes` does, `@radix-ui/react-direction` does, but third-party providers sometimes don't). Use `getByText` or `getByTestId` on the child fixture.
2. **Applies the wrapped library's context to descendants.** This is the provider-specific assertion. Mount a **test-only consumer** under the provider that reads the context via the library's official hook (or the provider's own exported hook), and assert that the consumer observes the expected value. Two recipes, depending on which kind of context the provider wraps:

   - **Library-wrapped context (Direction wraps Radix DirectionProvider):** import the library's read-side hook (`useDirection` from `@radix-ui/react-direction`) inside a test-local consumer component, render it under the provider, and assert the hook's return value matches the public prop:

     ```tsx
     function Consumer() {
       const dir = useDirection();
       return <span data-testid="observed-dir">{dir}</span>;
     }

     render(<Direction dir="rtl"><Consumer /></Direction>);
     expect(screen.getByTestId('observed-dir')).toHaveTextContent('rtl');
     ```

   - **Provider-owned context (a future provider that creates a React.Context internally):** import the provider's own exported hook (`useTheme`, `useDensity`) inside the test-local consumer. Same shape as above; the hook is the public API.

   **Do NOT introspect the wrapped library's internals** (do NOT reach into the Radix portal, do NOT poke at `data-*` attributes the library may or may not set). The hook is the contract; the hook is what the test should assert against.

3. **No a11y violations.** `await axe(container)` returns `toHaveNoViolations()`. Providers don't render visible markup of their own, so axe scans pass through `children`. There is no portal-based deviation at this layer (the `await axe(document.body)` rule from the organism / template layers does not apply, because providers don't render portals — they wrap libraries that may render portals, but the portal is the library's concern and is covered by the consuming organism's / template's tests).

   When the provider wraps a library that internally sets `dir` / `lang` / similar attributes on a child element, jest-axe may flag a `region` or `landmark-one-main` violation in the test fixture if the children don't include any landmark. Wrap the test child in a `<main>` or pass `axe(container, { rules: { region: { enabled: false } } })` per the `region` workaround in [../component-testing/SKILL.md](../component-testing/SKILL.md). The same convention applies as in the other layers.

Coverage thresholds apply per-package, not per-file: 80% lines / 80% statements / 75% branches / 80% functions. Providers are small (often 10–20 lines of component code) and tend to hit 100% coverage easily — but the per-file thresholds aren't enforced, so a 50%-covered provider that drops the package below the per-package threshold will block the gate.

For testing pitfalls (jsdom limits, `bun test` vs `bun run test`, axe `region` workarounds, the React-19 `act()` rules around context updates), see [../component-testing/SKILL.md](../component-testing/SKILL.md).

### 4. `<Component>.stories.tsx` — the stories (optional)

The stories file is optional at the provider layer. Include it when:

- The provider's visible effect on descendants is observable in isolation (a `Direction` story rendering two trees side-by-side with `dir="ltr"` and `dir="rtl"` each containing a Popover-trigger button so the side-flip is visible).
- The provider has a meaningful default prop that consumers may want to inspect in autodocs.
- The provider is part of the public consumer-facing surface (every provider that ships in `registry.json` is, so this is almost always true).

Skip it when:

- The provider's effect is invisible in isolation (a `Theme` provider whose effect is the theme tokens applied at `<html>` — a story would render an unstyled tree because the theme markup lives one layer up).
- Adding a story would require fabricating a fake consumer tree complex enough to demonstrate the effect — at that point the story is more illustrative of the wrapped library than of the provider itself, and the README's `## Effect on descendants` section carries the demonstration better.

When the stories file IS included, the standard convention applies:

- `title: 'Providers/<Component>'`.
- `component: <Component>`.
- `tags: ['autodocs']`.
- Minimum stories:
  - `Default` — the simplest meaningful invocation (typically `<Component>` wrapping a single demonstration child).
  - For providers with one or more scalar axes: at least one story per value of the axis (a `Ltr` and `Rtl` story for `Direction`) demonstrating the visible effect on descendants. There is no `AllVariants` story because there are no variants — but a `BothDirections` (side-by-side) story is the canonical replacement.
- Declare `argTypes` for every scalar prop so controls are usable.

For Storybook configuration, headless verification, and the addon stack, see [../storybook/SKILL.md](../storybook/SKILL.md).

### 5. `README.md` — per-component documentation

Sections, in this order:

- `# <Component>` (single H1 — markdown lint enforces no second H1 anywhere in the file).
- One-sentence description and the underlying library or React context (e.g. `"Wraps @radix-ui/react-direction's DirectionProvider"` or `"Provides theme mode via next-themes"`). State explicitly that this is a provider with no rendered DOM beyond `children`.
- `## Import` — single line: `import { <Component> } from '@open-tomato/ui-skeleton';`. If the provider exposes a hook, include a second line: `import { use<Component> } from '@open-tomato/ui-skeleton';`.
- `## Props` — table of props, types, defaults. Props are exactly `children: React.ReactNode` plus the wrapped library's scalar props (`dir: 'ltr' | 'rtl'`, default `'ltr'`).
- `## Effect on descendants` — **provider-specific section.** What context is exposed, what library hooks (or the provider's own hook) read it, and what visible effect descendants experience. Be concrete: for Direction, list the Radix primitives that respect `dir` (Popover `side`, Slider thumb direction, ContextMenu alignment, Tabs orientation in vertical mode), not just "Radix primitives respect direction". The README is the single source of truth for what a consumer should expect; vague prose forces the consumer to read library docs.
- `## Hook (if any)` — when the provider exports a hook (`useDirection`), document its signature, return type, and what happens when called outside the provider tree (the hook MUST throw a descriptive error; the README should state the error message verbatim so consumers can grep for it).
- `## Accessibility` — landmark and ARIA implications of the context. For Direction, document that `dir='rtl'` does NOT set the `dir` attribute on the HTML root — Radix consumes it via context only; if the consuming app also needs `<html dir="rtl">`, the app is responsible for that (and the README should say so explicitly).
- `## Mounting` — where in the consuming app's tree the provider should be mounted (typically near the root, inside the consuming app's layout component, outside any template / organism that consumes the context). Concrete code example showing a realistic mount point.
- `## Do / Don't` — short list reinforcing the "providers are mounted once near the root" rule, the "use the hook, not the raw Context" rule, and any provider-specific pitfalls (e.g. Direction's "does not set `<html dir>`" gotcha).

Top-level sections are H2 (`##`); nested categories are H3 (`###`). Don't skip heading levels — `markdown/heading-increment` will fail `bun lint`. Every fenced code block needs an explicit language tag (`text` for ASCII trees, `bash` for shell, `tsx`/`ts` for code).

### 6. `index.ts` — the barrel

```ts
export * from './<Component>';
```

One line when the provider exposes only the component. If the provider exposes a hook, the hook is already re-exported via `export *` because it lives in the same `.tsx` file as the component. Do NOT add a separate line for the hook — `export *` already covers it. Do NOT add a `export * from './<component>.variants'` line — the variants file does not exist at this layer.

No side effects, no default exports.

## Naming and import conventions

- **Component file**: PascalCase (`Direction.tsx`, `Theme.tsx` if it were to ship).
- **Test file**: PascalCase + `.test.tsx`.
- **Story file (optional)**: PascalCase + `.stories.tsx`.
- **Path alias**: providers MAY import only from `@/particles/*` and from third-party libraries (`react`, `@radix-ui/react-direction`, `next-themes`). Never use deep relative paths. Sibling imports inside the same provider directory use `./<name>`.
- **Quotes**: single quotes in `.ts` / `.tsx`. ESLint auto-fixes — write that way to keep diffs clean.
- **Barrels**: `export *` unless there's a name collision; in that case, re-export explicitly.
- **Imports**: ESLint enforces grouping/sorting. Expect `import * as React from 'react'` and the wrapped library's imports to be grouped with third-party; `@/particles/*` lives in its own group below; relative `./...` is last. Write imports already grouped this way.

## The composition rule (cardinal)

Providers MAY import only from `@/particles/*` and third-party libraries. **This is the most restrictive layer-import rule in the package** — providers cannot compose atoms, molecules, organisms, or templates.

**The rule, enforced by ESLint `no-restricted-imports` keyed off `files: ['src/providers/**/*.{ts,tsx}']` in `eslint.config.mjs`:**

1. **No imports from `@/atoms/*`, `@/molecules/*`, `@/organisms/*`, `@/templates/*`, `@/pages/*`, or `@/providers/*`.** A provider that needed to render an atom (a debug banner Button, a Toast surface) is not a pure context wrapper anymore — re-evaluate the layer. The Sonner organism (Phase 3) is the canonical example of "this looks like a provider but renders a visible host, so it lives in the organism layer instead".
2. **No upward-layer imports.** A provider sits at the top of the layered DAG; there's no layer above it to import from. Providers wrap the consuming app's root.
3. **Particles are the only legal upstream package layer.** Imports from `@/particles/cn` (for memoization helpers, if any) and `@/particles/*.variants` (none in the current iteration, but reserved) are unrestricted. Third-party imports (`react`, `@radix-ui/react-direction`, `next-themes`, `sonner`) are unrestricted.

The lint guard intentionally matches the import-path string, not the resolved module — a guard fires against `@/atoms/X` even if `X` does not exist yet. This lets the guard land before providers ship and trust it from day one.

**Why the restriction is this tight.** Providers sit near the root of the consuming app and wrap every descendant. If a provider imported a template, the bundle graph would pull the entire template subtree into every consuming entry — and worse, the provider could create a cycle if any descendant of that template eventually consumed the provider's own context. The particles-only restriction makes the cycle structurally impossible. Atoms / molecules / organisms / templates can freely consume provider context (via the provider's exported hook), but the provider itself stays narrow.

## The no-rendered-DOM-beyond-children rule (cardinal)

**A provider's rendered output is exactly `children` wrapped in zero or more invisible context providers.** No `<div>` wrappers, no `<main>` landmarks, no decorative `<span>`, no focus-trap regions, no toast hosts.

What this means in practice:

- The component body returns `<Library.Provider>{children}</Library.Provider>` or nested `Provider` wrappers around `{children}`. Nothing else.
- Do NOT add a wrapping `<div>` even for "clean structure" — Radix context providers and React Context providers render no DOM of their own. Adding a wrapping element is a regression that breaks consumer layout assumptions (a wrapping `<div>` becomes a flex / grid child the consumer didn't expect).
- Do NOT add `data-*` attributes via a wrapping element. If the wrapped library doesn't already set the attribute on a child, the attribute is the consumer's concern (a `Theme` provider that wants `<html data-theme>` is mounting at the wrong level — that's a `next-themes` / app-level concern).
- Do NOT add inline `<style>` blocks. Theme tokens belong in `globals.css` `@theme` blocks; per-provider runtime styles belong in the wrapped library.
- Do NOT add `<Suspense>` fallbacks, error boundaries, or any other wrapping React component that affects rendering semantics. If a provider's wrapped library throws during initialization, the consuming app's existing error boundary catches it — the provider should not add a second one.

When a provider candidate needs to render visible markup of its own (a Toast host, a debug banner, a focus-trap region), it is structurally an organism or template, not a provider. Sonner (Phase 3) is the canonical example: it provides a context-like `toast()` helper, but it also renders a visible `<Toaster />` host into a portal, so it lives in the organism layer. Don't fight the layer designation — promote.

## The className rule (cardinal)

**Providers MUST NOT accept `className` as a public prop, and the rule is structural rather than configurational at this layer.** Atoms, molecules, organisms, and templates all reject `className` via an explicit `Omit<..., 'className'>` clause on their props interface. Providers have no HTMLAttributes type to omit from — the props interface is exactly `{ children: React.ReactNode; <scalar props> }`, not extending anything — so `className` simply cannot land in the type signature.

What this means in practice:

- Do NOT add `className?: string` to the provider's props interface.
- Do NOT destructure `className` in the component function — there is no `className` to destructure.
- Do NOT add `'className'` to an `Omit<...>` clause — there is no HTMLAttributes parent type to omit from.
- Do NOT pass a `className` string to the wrapped library's `Provider` component, even if the library accepts one. Radix `DirectionProvider` doesn't accept `className` (it renders no DOM), but if a future library does, the provider does not forward it. Providers don't render — there's nowhere for the class to land that isn't a wrapping element, and wrapping elements are banned per the no-rendered-DOM rule above.

The className rule is the structural manifestation of the same constraint the atom / molecule / organism / template layers enforce configurationally. Every layer in the package has one variants-shaped styling surface; the provider layer's surface is empty by design.

## Slot props

Providers expose exactly one slot: `children`. No `leading`, no `trailing`, no `title`, no `description`, no `header`, no `footer`, no `trigger`, no `items`, no `actions`. The slot-prop vocabulary the molecule / organism / template layers inherit (see [../molecule-authoring/SKILL.md](../molecule-authoring/SKILL.md)) does not apply at this layer because providers have no rendered surface to slot content into.

If a provider candidate grows a second slot, it is rendering visible markup — promote to organism / template.

## Internal state and context

Providers' entire reason for existing is to expose context. The internal-state and context allowance from the organism and template layers is not just "allowed" here — it's the **public API**.

### Context as the public API

The pattern is:

```tsx
const InternalContext = React.createContext<<Component>ContextValue | null>(null);

export function <Component>({ children, ...props }: <Component>Props): React.JSX.Element {
  const value = React.useMemo<<Component>ContextValue>(
    () => ({ /* derived from props */ }),
    [/* prop dependencies */],
  );

  return (
    <InternalContext.Provider value={value}>
      {children}
    </InternalContext.Provider>
  );
}

export function use<Component>(): <Component>ContextValue {
  const value = React.useContext(InternalContext);
  if (value === null) {
    throw new Error('use<Component> must be used inside <<Component>>');
  }
  return value;
}
```

When the provider wraps a third-party library's context (Radix `DirectionProvider`, next-themes' provider), the wrapped library owns the context and exposes its own hook (`useDirection` from `@radix-ui/react-direction`). The package re-exports nothing — consumers import the library's hook directly. The provider's job is to mount the library's `Provider` with the right props.

When the provider creates its own React.Context, the hook is part of the provider's exported surface and the rules above apply:

- The hook MUST throw a descriptive error when called outside the provider tree (`'use<Component> must be used inside <<Component>>'`). This catches missing-provider bugs at the first render call instead of surfacing as `Cannot read property 'X' of null` deep in a child.
- Do NOT export the raw `React.Context` object — consumers should always go through the hook so the missing-provider guard fires. Exporting the raw Context is a hatch that consumers will use, and the guard becomes opt-in.
- The context type lives in the same `.tsx` file as the component and hook. Do not split into a `.types.ts` file unless the type is wide enough to warrant it (Direction's context is a single string union; a future Theme provider's context might be wide enough — but the test of "is it worth a separate file" is the same as the organism / template layers).

### Memoize context values

When a provider's `value` is an object literal, **always** wrap it in `React.useMemo` keyed on the props that derive it. Without the memo, every render of the provider creates a fresh object reference and every consumer re-renders. This matters more at the provider layer than at any other layer because providers sit near the root and every consumer is a descendant.

Exception: when the value is a primitive (a single string union like `'ltr' | 'rtl'`), no memo is needed — primitive identity is value-equal. Direction passes its `dir` prop straight through to Radix's `DirectionProvider`, so the memoization concern doesn't arise.

### The provider-vs-template-context boundary

The template layer also allows context-as-public-API (see "Template-owned public context is allowed" in [../template-authoring/SKILL.md](../template-authoring/SKILL.md)) — Sidebar exposes `useSidebar`, NavigationMenu exposes `useNavigationMenu`. The difference is **scope**:

- **Template context is section-scoped.** Sidebar's context is read by nav items inside the Sidebar; nothing above Sidebar reads it. The template renders visible markup that owns the section, and the context is a side effect of that markup.
- **Provider context is app-tree-scoped.** Direction's context is read by Radix primitives anywhere in the descendant tree (a Popover inside a Tabs inside a Dialog inside a Sidebar all respect the same `dir`). The provider's only reason for existing is the context.

When a candidate is unclear (a future `BreadcrumbProvider` that exposes the current breadcrumb trail?), ask: does the candidate render visible markup? If yes, it's a template (or organism); the context is colocated with the markup. If no, it's a provider; the context is the entire surface.

## Per-provider procedure

Phase 5 chose **hand-write Direction as the canonical reference, copy-shape for every future provider**. No code-generation script. Each provider is authored in its own task by reading Direction and adapting.

### Procedure

For each new provider:

1. Open `src/providers/Direction/` and read all four (or five with stories) files end-to-end. Direction is ground truth for file layout, TSDoc style, hook contract, test structure, README structure.
2. Look up the provider's spec (wrapped library or own context, public scalar props, default values, visible effect on descendants) wherever the iteration's planning lives — usually the PLAN's per-provider task or a transient planning document at the package root. That spec is the only intentional deviation from Direction.
3. Create `src/providers/<Component>/` with the four (or five) required files. Start each file by copying its Direction counterpart, then adapt:
   - `<Component>.tsx`: rename the component and props interface. Replace the wrapped library import (`@radix-ui/react-direction` → the new library). Replace the `<Library.Provider>` invocation. If the provider creates its own React.Context, add the `React.createContext` + `React.useMemo` + hook block alongside the component. Keep the props interface narrow — `children` plus the wrapped library's scalar props, nothing else.
   - `<Component>.test.tsx`: keep the same three-assertion baseline (renders children, applies context to descendants via the library / hook, no a11y violations). Adjust the test-only consumer component to read the new context via the new library's hook (or the provider's own exported hook). Do not introspect library internals; the hook is the contract.
   - `<Component>.stories.tsx` (optional): copy meta shape, retitle `Providers/<Component>`, adjust `argTypes` and the per-value stories. Skip the file when the provider's effect is invisible in isolation.
   - `README.md`: copy the section order, fill the props table, rewrite the `## Effect on descendants` section with concrete consumer-observable effects, document the hook signature and the missing-provider error message verbatim, write the `## Mounting` section with a realistic mount-point example.
   - `index.ts`: re-export the component (and the hook, if applicable — already covered by `export *`).
4. Append the provider to `registry.json` `items[]` with `registryDependencies` listing only the external npm packages the provider imports beyond `react` and `@/particles/cn` (e.g. `@radix-ui/react-direction`, `next-themes`).
5. Add the provider to `src/providers/index.ts` (the layer barrel) and to `vite.config.ts` `build.lib.entry` (per-provider entry under `providers/<Name>`). Re-export from `src/index.ts` so the top-level package barrel includes the provider.
6. Run `bun run check-types && bun run test && bun run lint` locally. Do not move on while any of them fails.

## The provider is also a registry item

Every provider must appear in `registry.json` `items[]` (file lives at the package root). Required fields:

- `name`: kebab-case (e.g. `direction`).
- `type`: `registry:ui`.
- `files`: array of `{ path, type }` entries pointing at the `.tsx` (repo-relative paths like `src/providers/Direction/Direction.tsx`). **No `.variants.ts` entry** — the variants file doesn't exist at this layer.
- `registryDependencies`: array of **npm package names** the wrapper imports beyond `react` and `@/particles/cn` (e.g. `@radix-ui/react-direction`, `next-themes`). Empty array for providers that wrap only React's own Context API (no library dep).

For registry semantics, the shadcn CLI workflow, and how `registryDependencies` differs from shadcn's evolving `radix-ui` umbrella convention, see [../shadcn-integration/SKILL.md](../shadcn-integration/SKILL.md).

## The canonical reference: Direction

Phase 5 designates `src/providers/Direction/` as the canonical reference. Read all four (or five with stories) files before authoring any other provider.

Direction is intentionally minimal-but-representative:

- Wraps a single library's context provider (`@radix-ui/react-direction`'s `DirectionProvider`) — no own-context creation, no memoization concern (the prop is primitive), no portal.
- Public prop is a single scalar union (`dir: 'ltr' | 'rtl'`, default `'ltr'`) — the simplest possible provider API.
- Demonstrates the test pattern with a library-supplied read-side hook (`useDirection` from `@radix-ui/react-direction`) inside a test-only consumer component.
- Demonstrates the visible-effect-on-descendants documentation pattern (Popover `side` flip, Slider thumb direction, ContextMenu alignment).
- Demonstrates the `## Mounting` README section with a realistic mount point near the root of a consuming app.

When a future provider creates its own React.Context, the canonical reference for that pattern is whichever provider lands first with that shape (the iteration's planning doc will name it). Until then, the rules in "Context as the public API" and "Memoize context values" above are the contract.

## Layer overview (where providers sit)

```text
src/
├── index.ts                 # top-level barrel — re-exports every layer
├── styles/globals.css       # Tailwind v4 entry + @theme tokens
├── particles/               # shared helpers (cn, variants, tokens)
├── atoms/                   # 18 single-entry wrappers
├── molecules/               # 15 atom-composing wrappers
├── organisms/               # 17 molecule-composing wrappers
├── templates/               # 5 organism-composing surfaces
├── providers/               # THIS FILE'S DOMAIN — context-only wrappers
└── pages/                   # placeholder barrel
```

Import direction is strictly one-way and bounded by the ESLint `no-restricted-imports` guard:

- provider → particle: OK (`@/particles/cn`).
- provider → third-party library: OK (`react`, `@radix-ui/react-direction`, `next-themes`).
- provider → atom / molecule / organism / template / page / provider: BLOCKED. Providers stay narrow; visible markup belongs in lower layers.
- atom / molecule / organism / template → provider: BLOCKED via the lower layer's own guard. Consumers of provider context (a Popover that respects `dir`) read the context through the library's hook (`useDirection`), not by importing the provider — and the library's hook works regardless of whether a `Direction` provider is mounted (Radix falls back to a sensible default when no provider is present).

When in doubt about which layer something belongs in, ask: does it render visible markup beyond `children`? Yes → not a provider (organism or template). Does it expose context that descendants read via a hook with no rendered surface of its own? Yes → provider (this layer). Does it have variant axes that map to class strings? Yes → not a provider (re-evaluate the layer — the variants file would come back, and that's a signal).

## When in doubt

- Open Direction and read it.
- The relevant skill (linked from each section above) has the deeper context. The closest siblings are [../template-authoring/SKILL.md](../template-authoring/SKILL.md) (template-owned context vs provider-layer context) and [../styling/SKILL.md](../styling/SKILL.md) (theme tokens vs provider-applied styles).
- If a convention here conflicts with a transient planning doc (iteration plan, ticket spec), the planning doc wins for scope; this skill wins for file layout, naming, and the cardinal rules (no rendered DOM beyond children, no className surface, particles-only imports, hook-not-Context export).
- If a provider candidate feels like it should grow visible markup or a variants axis, **promote it to organism / template** rather than expanding the provider's file shape. The collapsed four-file shape is structural; deviations from it are a layer-designation signal, not a file-count concern.
