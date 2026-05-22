# UI Skeleton — Phase 2: Molecules + Atom `className` Refactor

## Context

Phase 1 of [`packages/ui-skeleton/`](./) shipped 18 atoms, 6 particle modules, 9 domain skills, and the supporting build/test/Storybook infrastructure. The atom layer was authored under a strict six-file convention (`<Component>.tsx`, `<component>.variants.ts`, `<Component>.test.tsx`, `<Component>.stories.tsx`, `README.md`, `index.ts`) but one cardinal rule from [`AGENTS.md`](./AGENTS.md) — "variants are the only public styling surface" — is violated by every atom because the canonical Button reference encoded the old `className`-as-escape-hatch pattern, which propagated.

Phase 2 has two interlocked goals:

1. **Build the molecule layer.** The downstream component-library agent needs single-encapsulated wrappers for shadcn's stateful primitives (Popover, Tooltip, Switch, Select, RadioGroup, etc.) and for atom-composed patterns (Alert, ButtonGroup, Item, Table). 15 molecules in total, plus one new authoring skill, plus an `Alert` canonical reference that the remaining 14 copy.

2. **Eliminate the atom `className` escape hatch before molecules are authored.** Molecules compose atoms and the project rule is that no consumer-supplied class string crosses the public API. If atoms still accept `className`, every molecule that composes them will inherit and re-emit the violation. The refactor is tracked as [`NEXT-ITERATIONS.md`](./NEXT-ITERATIONS.md) #1 + #2; this plan folds them in.

Additional in-scope items from the backlog: NEXT-ITERATIONS #5 (wire `package.json` `exports` map to the multi-entry build output). Deferred: #9 (design-system stylesheet import), #6 (workspace registration), #3 (Storybook/Vite peer-dep), #4 (Vite chunking), #7 (pre-existing lint cleanup is opportunistic, not required), #8 (Progress indeterminate animation).

Taxonomy audit promotes **Calendar** and **Combobox** from the README's Molecules list to Organisms (Calendar owns date-grid state, Combobox composes Popover-molecule + Input-atom + filter list — both violate the molecule rule). Net molecule count: **15**.

## Scope summary

- Refactor 18 atoms to drop public `className`. Add explicit variant axes for Input/Textarea (`density`, `tone`), explicit dimension props for Skeleton (`width`/`height`/`size`), and per-part variant axes for ScrollArea (`frame`, `viewportPadding`).
- Extract a shared wrapper-frame variants particle so Input, Textarea, NativeSelect, and Select share the frame shape.
- Author the molecule layer: **15 molecules** under a six-file convention adapted for composition.
- Add 10 npm dependencies (9 Radix primitives + `input-otp`).
- Create [`skills/molecule-authoring/SKILL.md`](./skills/molecule-authoring/SKILL.md) and update [`skills/atom-authoring/SKILL.md`](./skills/atom-authoring/SKILL.md).
- Update [`AGENTS.md`](./AGENTS.md) (cardinal rules, skill index, workflow, pitfalls) and [`README.md`](./README.md) (taxonomy reclassifications).
- Wire `vite.config.ts` multi-entry build + `package.json` `exports` map for the new molecules layer.
- Append 15 molecule entries to [`registry.json`](./registry.json).
- Add ESLint `no-restricted-imports` config to enforce layer-import rules.

Out of scope: organisms, providers, templates, pages, design-system stylesheet integration (#9), workspace registration (#6).

---

## Tasks

```text
# Stage: Pre-flight
```

- [x] Read [`AGENTS.md`](./AGENTS.md), [`NEXT-ITERATIONS.md`](./NEXT-ITERATIONS.md), and [`skills/atom-authoring/SKILL.md`](./skills/atom-authoring/SKILL.md) end-to-end before any code change
- [x] Confirm phase 1 baseline: `bun install && bun run check-types && bun run test && bun run build && bun run build-storybook` all exit 0 from [`packages/ui-skeleton/`](./)
- [BLOCKED] Confirm `bun run lint` failures are limited to the pre-existing [`README.md`](./README.md) heading violations and not in atom code

```text
# Stage: Atom className refactor — wrapper-frame particle extraction
```

- [x] Create `src/particles/wrapper-frame.variants.ts` exporting `wrapperFrameVariants` (cva) and `WrapperFrameVariants` type with `variant`, `size`, `density`, `tone` axes per the Technical context Section A2
- [x] Add wrapper-frame particle export to [`src/particles/index.ts`](./src/particles/index.ts)
- [x] Add unit tests for the particle under `src/particles/__tests__/wrapper-frame.variants.test.ts`

```text
# Stage: Atom className refactor — simple atoms (A1 recipe)
```

- [x] Refactor [`src/atoms/Button/Button.tsx`](./src/atoms/Button/Button.tsx) per A1 recipe, update `Button.test.tsx`, `Button.stories.tsx`, `README.md`
- [x] Refactor [`src/atoms/Badge/`](./src/atoms/Badge/) per A1 recipe (component, tests, story, README)
- [x] Refactor [`src/atoms/Toggle/`](./src/atoms/Toggle/) per A1 recipe
- [x] Refactor [`src/atoms/Avatar/`](./src/atoms/Avatar/) per A1 recipe
- [x] Refactor [`src/atoms/AspectRatio/`](./src/atoms/AspectRatio/) per A1 recipe
- [x] Refactor [`src/atoms/Label/`](./src/atoms/Label/) per A1 recipe
- [x] Refactor [`src/atoms/Separator/`](./src/atoms/Separator/) per A1 recipe
- [x] Refactor [`src/atoms/Spinner/`](./src/atoms/Spinner/) per A1 recipe
- [x] Refactor [`src/atoms/Typography/`](./src/atoms/Typography/) per A1 recipe
- [x] Refactor [`src/atoms/Kbd/`](./src/atoms/Kbd/) per A1 recipe
- [x] Refactor [`src/atoms/Checkbox/`](./src/atoms/Checkbox/) per A1 recipe
- [x] Refactor [`src/atoms/Slider/`](./src/atoms/Slider/) per A1 recipe
- [x] Refactor [`src/atoms/Progress/`](./src/atoms/Progress/) per A1 recipe
- [x] Refactor [`src/atoms/Card/`](./src/atoms/Card/) per A1 recipe (multi-part internally, but no per-part className exposed)

```text
# Stage: Atom className refactor — wrapper-frame atoms (A2 recipe)
```

- [x] Rewrite [`src/atoms/Input/input.variants.ts`](./src/atoms/Input/input.variants.ts) to consume `wrapperFrameVariants` with added `density` + `tone` axes
- [x] Update [`src/atoms/Input/Input.tsx`](./src/atoms/Input/Input.tsx) to drop `className`, accept the new axes
- [x] Update [`src/atoms/Input/Input.test.tsx`](./src/atoms/Input/Input.test.tsx) (drop className assertions, add density/tone propagation assertions)
- [x] Update [`src/atoms/Input/Input.stories.tsx`](./src/atoms/Input/Input.stories.tsx) (drop className argType, add density/tone argTypes and matrix story)
- [x] Update [`src/atoms/Input/README.md`](./src/atoms/Input/README.md) (drop className row, add density/tone variant rows, rewrite Do/Don't)
- [x] Repeat A2 sequence for [`src/atoms/Textarea/`](./src/atoms/Textarea/), substituting `min-h-*` for `h-*` in density-compact branch

```text
# Stage: Atom className refactor — Skeleton sizing (A3 recipe)
```

- [x] Replace `className` channel with `width?: string | number`, `height?: string | number`, `size?: string | number` props on [`src/atoms/Skeleton/Skeleton.tsx`](./src/atoms/Skeleton/Skeleton.tsx)
- [x] Add `'style'` to the props interface `Omit<...>` clause so consumers cannot supply a raw `style` prop that races with the emitted inline styles
- [x] Update Skeleton test (assertions for px-emission of numeric props and pass-through of string props)
- [x] Update Skeleton story (drop className argType, add width/height/size argTypes)
- [x] Rewrite Skeleton README `## Sizing` section to use the new props

```text
# Stage: Atom className refactor — multi-part atoms (A4 recipe)
```

- [x] Add `frame` axis to [`src/atoms/ScrollArea/scroll-area.variants.ts`](./src/atoms/ScrollArea/scroll-area.variants.ts) and add `scrollAreaViewportVariants` with `padding` axis
- [x] Update [`src/atoms/ScrollArea/ScrollArea.tsx`](./src/atoms/ScrollArea/ScrollArea.tsx): strip root `className`, strip `className` from `viewportProps` and `scrollbarProps` bag types, accept new `frame` + `viewportPadding` props
- [x] Update ScrollArea test, story, and README to reflect new API (drop className tests, add frame/viewportPadding stories and variant rows)

```text
# Stage: Atom-authoring skill update
```

- [x] Update [`skills/atom-authoring/SKILL.md`](./skills/atom-authoring/SKILL.md) "The className rule (cardinal)" section to the post-refactor wording in the Technical context Section A6 (declare universal compliance, drop the "existing atoms still violate" paragraph, add the `Omit<..., 'className'>` bullet)
- [x] Add a bullet to the per-atom procedure note clarifying the `Omit<HTMLAttrs, 'color' | 'className'>` inheritance pattern
- [x] Remove NEXT-ITERATIONS #1 and #2 entries from [`NEXT-ITERATIONS.md`](./NEXT-ITERATIONS.md)

```text
# Stage: Atom refactor verification
```

- [x] Run `bun run check-types && bun run test && bun run lint` — all three must pass
- [x] Run `bun run test:coverage` and confirm 80/80/75/80 thresholds still hold after deleted className-merging tests
- [x] Run `bun run build && bun run build-storybook` for sanity

```text
# Stage: Molecule infrastructure — ESLint layer guard
```

- [x] Add `no-restricted-imports` rule for `src/molecules/**` and `src/atoms/**` in [`eslint.config.mjs`](./eslint.config.mjs) per Technical context Section C3
- [x] Verify the rule fires by adding a temporary molecule-imports-molecule case and confirming `bun run lint` reports it, then revert

```text
# Stage: Molecule infrastructure — npm dependencies
```

- [x] Add 10 new dependencies to [`package.json`](./package.json) `dependencies`: `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-popover`, `@radix-ui/react-radio-group`, `@radix-ui/react-select`, `@radix-ui/react-switch`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, `input-otp`
- [x] Run `bun install` and confirm clean resolution

```text
# Stage: Molecule canonical reference — Alert
```

- [x] Create [`src/molecules/Alert/Alert.tsx`](./src/molecules/Alert/Alert.tsx) per Technical context Section C-Alert
- [x] Create `src/molecules/Alert/alert.variants.ts` with empty-root cva + `alertHeaderVariants`
- [x] Create `src/molecules/Alert/Alert.test.tsx` with the five molecule-minimum assertions
- [x] Create `src/molecules/Alert/Alert.stories.tsx` with `Default`, `AllVariants`, `WithCustomHeader`, `WithActions` stories
- [x] Create `src/molecules/Alert/README.md` with the new `## Composition` section
- [x] Create `src/molecules/Alert/index.ts` with two-line barrel

```text
# Stage: Molecule-authoring skill
```

- [x] Create [`skills/molecule-authoring/SKILL.md`](./skills/molecule-authoring/SKILL.md) following the structure in Technical context Section E (mirror atom-authoring; add composition rule, variant propagation, slot props, trigger pattern, expanded test minimums, README `## Composition` section)

```text
# Stage: AGENTS.md updates
```

- [x] Edit cardinal rule #1 to apply to molecules and declare universal `className` compliance
- [x] Edit cardinal rule #2 to apply to molecules ("Six files per atom or molecule")
- [x] Edit cardinal rule #3 to apply to molecules ("No default exports under `src/atoms/` or `src/molecules/`")
- [x] Add cardinal rule #11 enforcing layer-import direction (molecules import atoms + particles only)
- [x] Add `molecule-authoring` row to the skill-index table
- [x] Update "Where things live" tree to remove the `# placeholder barrel` comment on `molecules/`
- [x] Add "Adding a new molecule" subsection under "Day-to-day workflow"
- [x] Add molecule-specific pitfalls (portal testing via `findByRole`, `trigger` slot typing, ESLint layer guard, Tooltip Provider semantics)

```text
# Stage: Remaining molecules — stateless composition
```

- [x] Create [`src/molecules/ButtonGroup/`](./src/molecules/ButtonGroup/) per Section D #2 (composes Button via `React.cloneElement` for size/variant propagation)
- [x] Create [`src/molecules/Item/`](./src/molecules/Item/) per Section D #7 (polymorphic `as` axis)
- [x] Create [`src/molecules/Table/`](./src/molecules/Table/) per Section D #13 (slot props for caption/headers/rows/footer)

```text
# Stage: Remaining molecules — Radix stateful
```

- [x] Create [`src/molecules/Collapsible/`](./src/molecules/Collapsible/) per Section D #3
- [x] Create [`src/molecules/Switch/`](./src/molecules/Switch/) per Section D #12 (inline-label pattern)
- [x] Create [`src/molecules/RadioGroup/`](./src/molecules/RadioGroup/) per Section D #10 (`React.useId()` for label/item pairing)
- [x] Create [`src/molecules/ToggleGroup/`](./src/molecules/ToggleGroup/) per Section D #14 (composes Toggle atom via `asChild`)

```text
# Stage: Remaining molecules — portal-based
```

- [x] Create [`src/molecules/Popover/`](./src/molecules/Popover/) per Section D #9 (`trigger` slot prop, portal)
- [x] Create [`src/molecules/Tooltip/`](./src/molecules/Tooltip/) per Section D #15 (internal `RadixTooltip.Provider`, `delayDuration={300}` default)
- [x] Create [`src/molecules/HoverCard/`](./src/molecules/HoverCard/) per Section D #5
- [BLOCKED] Create [`src/molecules/ContextMenu/`](./src/molecules/ContextMenu/) per Section D #4 (discriminated `items` union)
- [x] Create [`src/molecules/Select/`](./src/molecules/Select/) per Section D #11 (wrapper-frame particle for trigger)

```text
# Stage: Remaining molecules — specialty
```

- [x] Create [`src/molecules/NativeSelect/`](./src/molecules/NativeSelect/) per Section D #8 (wrapper-frame particle, `appearance-none` + chevron)
- [x] Create [`src/molecules/InputOTP/`](./src/molecules/InputOTP/) per Section D #6 (uses `input-otp` package; `inputMode="numeric"`, `autoComplete="one-time-code"`)

```text
# Stage: Registry + barrel + build wiring
```

- [x] Append 15 molecule entries to [`registry.json`](./registry.json) per Technical context Section G2 with the listed `registryDependencies`
- [x] Confirm `bun -e "const r = await Bun.file('registry.json').json(); console.log(r.items.length)"` reports `33`
- [x] Replace [`src/molecules/index.ts`](./src/molecules/index.ts) placeholder with the 15-line real barrel
- [x] Remove the `eslint-disable-next-line import/export -- placeholder barrel until molecules ship` comment on the `./molecules` re-export in [`src/index.ts`](./src/index.ts)
- [x] Add `molecules` const + per-molecule entry expansion in [`vite.config.ts`](./vite.config.ts) `build.lib.entry` per Technical context Section G1
- [x] Add `atoms` and `molecules` layer-barrel entries (`src/atoms/index.ts` and `src/molecules/index.ts`) to the same entry map

```text
# Stage: package.json exports map (NEXT-ITERATIONS #5)
```

- [x] Replace the single-entry `exports` in [`package.json`](./package.json) with the full subpath exports object per Technical context Section G3 (root, `./particles`, `./atoms`, per-atom × 18, `./molecules`, per-molecule × 15)
- [x] Note: `import` and `types` paths do NOT share a stem — `dist/atoms/Button.js` is a sibling of `dist/atoms/Button/index.d.ts`. Verify per-entry
- [x] Remove NEXT-ITERATIONS #5 entry from [`NEXT-ITERATIONS.md`](./NEXT-ITERATIONS.md)

```text
# Stage: Taxonomy + README updates
```

- [x] Move `Calendar` from `### Molecules` to `### Organisms` in [`README.md`](./README.md)
- [x] Move `Combobox` from `### Molecules` to `### Organisms` in [`README.md`](./README.md)
- [x] Annotate the README's atomic-design section noting the audit happened in phase 2 if the existing notes feel stale

```text
# Stage: Final verification
```

- [x] `bun install`
- [x] `bun run check-types`
- [x] `bun run lint`
- [x] `bun run test`
- [x] `bun run test:coverage` — confirm 80/80/75/80 thresholds hold package-wide
- [x] `bun run build` — confirm `dist/molecules/<Each>.js` files emitted, `dist/molecules/<Each>/index.d.ts` declarations preserved, `dist/molecules.js` layer barrel exists
- [ ] `bun run build-storybook` — confirm `storybook-static/index.json` includes all 15 molecules
- [ ] Run the consumer-side import verification snippets from Technical context Section G3 against a scratch directory or sibling package

---

## Technical context

### Section A — atom `className` refactor

#### A1. Simple atoms (12 of 18) — mechanical recipe

The change is type-level + body-level. Apply to Button, Badge, Toggle, Avatar, AspectRatio, Label, Separator, Spinner, Typography, Kbd, Checkbox, Slider, Progress, Card.

Before (canonical pattern in [`Button.tsx`](./src/atoms/Button/Button.tsx)):

```tsx
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
  ButtonVariants {
  // ...
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...rest }, ref) => {
    // ...
    className={cn(buttonVariants({ variant: resolvedVariant, size: resolvedSize }), className)}
```

After:

```tsx
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'className'>,
  ButtonVariants {
  // ...
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, asChild, ...rest }, ref) => {
    // ...
    className={cn(buttonVariants({ variant: resolvedVariant, size: resolvedSize }))}
```

Two changes per atom:

1. Add `'className'` to the existing `Omit<...>` clause on the props interface. Without this, `className` is inherited from `*HTMLAttributes` and would land on the DOM via `{...rest}`.
2. Drop `className` from the destructure and from the `cn(...)` call.

Radix `Slot` interaction is unaffected — `Slot` reads the `className` we pass it (the `cn(buttonVariants(...))` result), not the removed public prop. `Slottable` continues to wrap children.

#### A2. Wrapper-frame atoms (Input, Textarea) — new axes

Extract a shared particle so Input/Textarea/NativeSelect/Select all consume the same frame shape.

```ts
// src/particles/wrapper-frame.variants.ts
import { cva, type VariantProps } from 'class-variance-authority';

export const wrapperFrameVariants = cva(
  'flex w-full items-center gap-2 rounded-md text-sm transition-colors '
  + 'focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-input focus-within:ring-ring',
        error: 'border-destructive focus-within:ring-destructive',
        success: 'border-emerald-500 focus-within:ring-emerald-500',
      },
      size: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-3.5 text-base',
      },
      density: {
        comfortable: '',
        compact: '[&]:h-7 py-0',
      },
      tone: {
        neutral: 'border bg-background',
        subtle: 'border-0 bg-muted/40',
        inverted: 'border border-foreground/20 bg-foreground text-background',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      density: 'comfortable',
      tone: 'neutral',
    },
  },
);

export type WrapperFrameVariants = VariantProps<typeof wrapperFrameVariants>;
```

`density` covers the "fit inside a tighter row" use case. `tone` covers the "lives over a dark hero / borderless inside a card header" use case. Both today are satisfied with `className` strings. Textarea reuses the same particle but its compact density toggles `min-h-*` instead of `h-*`.

Concerns dropped entirely: none. If a consumer needs a knob outside the four axes (3×3×2×3 = 54 combinations), the answer is "add an axis", not "open a className escape hatch".

#### A3. Skeleton sizing — explicit dimension props

```ts
export interface SkeletonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color' | 'className' | 'style'>,
    SkeletonVariants {
  width?: string | number;
  height?: string | number;
  size?: string | number;
}
```

Body:

```tsx
const toCss = (v: string | number | undefined): string | undefined => {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
};

const resolvedWidth = size !== undefined ? toCss(size) : toCss(width);
const resolvedHeight = size !== undefined ? toCss(size) : toCss(height);

const style: React.CSSProperties = {};
if (resolvedWidth !== undefined) style.width = resolvedWidth;
if (resolvedHeight !== undefined) style.height = resolvedHeight;
```

`size` overrides `width` + `height`. `style` is omitted from the props interface to prevent races with the emitted inline styles. Numbers are emitted as `${n}px`; strings pass through unchanged. No migration concern — the package is private, consumers are zero.

#### A4. ScrollArea per-part axes

```ts
export interface ScrollAreaProps
  extends Omit<RadixScrollAreaProps, 'dir' | 'className' | 'children'>,
    ScrollAreaVariants {
  dir?: RadixScrollAreaProps['dir'];
  children?: React.ReactNode;
  viewportProps?: Omit<RadixScrollAreaViewportProps, 'children' | 'className'>;
  scrollbarProps?: Omit<RadixScrollAreaScrollbarProps, 'orientation' | 'children' | 'className'>;
}
```

```ts
export const scrollAreaVariants = cva('relative overflow-hidden', {
  variants: {
    orientation: { /* unchanged */ },
    frame: {
      none: '',
      bordered: 'border rounded-md',
      card: 'border rounded-md bg-card',
    },
  },
  defaultVariants: { orientation: 'vertical', frame: 'none' },
});

export const scrollAreaViewportVariants = cva(
  'size-full rounded-[inherit] outline-none transition-[color,box-shadow] '
  + 'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-1',
  {
    variants: {
      padding: { none: '', sm: 'p-2', md: 'p-4', lg: 'p-6' },
    },
    defaultVariants: { padding: 'none' },
  },
);
```

Verdicts on per-part knobs ScrollArea exposes today: root `className` → `frame` variant; viewport padding `className` → `viewportPadding` variant; viewport non-styling props (tabIndex, ARIA) → kept on `viewportProps` minus `className`; scrollbar styling `className` → dropped entirely; root width/height `className` → dropped (consumer wraps in a sized container).

Card has no per-part className exposure today; treat with A1 recipe.

#### A5. Tests / stories / READMEs per atom

For each refactored atom:

- Tests: delete "applies custom className" / "merges consumer className with variants" cases. Don't add a "rejects className" test (TypeScript handles that at compile time). Keep the three mandatory assertions.
- Stories: drop `className` from `argTypes` and `args`. Add new variant argTypes for A2 (`density`, `tone`), A3 (`width`, `height`, `size`), A4 (`frame`, `viewportPadding`).
- README: drop the `className` row from the Props table. Rewrite `## Do / Don't` with positive guidance ("DO compose with parent wrappers for sizing/positioning" instead of "DO use variants, DON'T pass className").

#### A6. atom-authoring SKILL updated wording

Replace "The className rule (cardinal)" body (currently lines 104–121 of [`atom-authoring/SKILL.md`](./skills/atom-authoring/SKILL.md)) with:

```markdown
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
```

### Section B — taxonomy audit result

15 molecules remain after the audit:

| # | Molecule | Rationale |
|---|---|---|
| 1 | Alert | Canonical reference — Card + Typography + icon slot, no state |
| 2 | ButtonGroup | Composes N Button atoms with shared spacing/radius rules |
| 3 | Collapsible | Radix Collapsible, single trigger + content, show/hide only |
| 4 | ContextMenu | Single Radix primitive + portal + items |
| 5 | HoverCard | Single Radix primitive + portal, hover state only |
| 6 | InputOTP | Composes N Input atoms with internal focus-index |
| 7 | Item | Horizontal row with leading/title/description/trailing slots |
| 8 | NativeSelect | Native `<select>` with wrapper-frame styling |
| 9 | Popover | Single Radix primitive, show/hide state |
| 10 | RadioGroup | Radix RadioGroup composing Label atoms |
| 11 | Select | Single Radix Select primitive (its own portal dropdown) |
| 12 | Switch | Radix Switch + optional Label atom (inline-label) |
| 13 | Table | Pure HTML composition, no state |
| 14 | ToggleGroup | Radix ToggleGroup composing Toggle atom via `asChild` |
| 15 | Tooltip | Single Radix primitive, hover state |

Promoted to organism (out of phase 2 scope):

- **Calendar** — owns date-grid state and month navigation context; later composed inside the Date Picker organism along with Popover.
- **Combobox** — composes Popover (a molecule) + Input atom + filter list; molecule-of-molecule violates the layer rule.

No demotions needed from the existing organism list.

### Section C — molecule six-file convention

#### C3. Layer-import rule

Molecules MUST NOT import other molecules. They MAY import `@/atoms/*` and `@/particles/*`. Same idea applied to atoms: atoms import particles only.

ESLint enforcement (add to [`eslint.config.mjs`](./eslint.config.mjs)):

```js
{
  files: ['src/molecules/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['@/molecules/*', '../molecules/*', './**/molecules/*'],
          message: 'Molecules MUST NOT import other molecules. Promote to organism instead.' },
        { group: ['@/organisms/*', '@/templates/*', '@/pages/*', '@/providers/*'],
          message: 'Molecules MUST NOT import upward layers.' },
      ],
    }],
  },
},
{
  files: ['src/atoms/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['@/atoms/*'],
          message: 'Atoms MUST NOT import other atoms. Use @/particles or fold into one atom.' },
        { group: ['@/molecules/*', '@/organisms/*', '@/templates/*', '@/pages/*', '@/providers/*'],
          message: 'Atoms MUST NOT import upward layers.' },
      ],
    }],
  },
},
```

#### C4–C5. className rules in molecules

- Molecules MUST NOT accept public `className` (same rule as atoms).
- Molecules MUST NOT pass `className` into composed atoms (atoms refuse it post-Section A).
- When a molecule needs to nudge a composed atom's styling, the recipe is: add a variant axis to the atom (if the need is general) OR map the molecule's own axis into an existing atom variant (if the need is molecule-specific).

#### C6. Standard slot prop vocabulary

Across all molecules:

- `title?: React.ReactNode` — rendered inside Typography(variant=h4) by default.
- `description?: React.ReactNode` — rendered inside Typography(variant=caption).
- `leading?: React.ReactNode` — leading icon/avatar/badge.
- `trailing?: React.ReactNode` — trailing actions/badges/chevrons.
- `actions?: React.ReactNode` — bottom action row.
- `header?: React.ReactNode` — overrides default title+description rendering (mutually exclusive).
- `footer?: React.ReactNode` — bottom section.
- `trigger: React.ReactElement` (only for Radix-trigger molecules) — wrapped internally via `<Radix*.Trigger asChild>`.

Molecules do NOT inject styling into slot content; the consumer's nodes render raw inside the composed atoms.

#### C7. Variant propagation pattern

```tsx
const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const titleVariantForSize = { sm: 'h5', md: 'h4', lg: 'h3' } as const;
// ...
return (
  <Card padding={cardPaddingForSize[resolvedSize]} ...>
    <Typography variant={titleVariantForSize[resolvedSize]}>{title}</Typography>
  </Card>
);
```

The molecule owns the lookup table from its own axis to each composed atom's axis. Direct passthrough is fine when values match; explicit mapping is required when axes diverge.

#### C8. Polymorphism (`asChild`) on molecules

Default: no `asChild` on the molecule's outer API. Molecules render multiple elements and cannot collapse to a Slot.

For Radix-trigger molecules (Popover, Tooltip, ContextMenu, HoverCard, Collapsible), expose a `trigger: React.ReactElement` prop and internally call `<Radix*.Trigger asChild>{trigger}</Radix*.Trigger>`. The `asChild` is an internal implementation detail; the consumer never sees it.

#### C9. Test minimums (five assertions for molecules)

1. Renders all slots (via `data-slot=` query or `getByText`).
2. Composes the expected atom roles (e.g., `getByRole('alert')` for Alert, `getByRole('switch')` for Switch).
3. Variant propagation works (passing `size="lg"` produces the resolved atom's `data-size="lg"` or equivalent).
4. No a11y violations (`await axe(container)`).
5. State behavior (for stateful molecules: open/close, hover, checked, etc.). Use `screen.findByRole(...)` for portaled molecules — the portal renders outside `container`.

#### C-Alert. Canonical reference

`alert.variants.ts`:

```ts
import { cva, type VariantProps } from 'class-variance-authority';

export const alertVariants = cva('', {
  variants: {
    severity: { info: '', success: '', warning: '', error: '' },
    size: { sm: '', md: '', lg: '' },
  },
  defaultVariants: { severity: 'info', size: 'md' },
});
export type AlertVariants = VariantProps<typeof alertVariants>;

export const alertHeaderVariants = cva('flex items-start gap-3', {
  variants: {
    severity: {
      info: '[&_[data-slot=alert-leading]]:text-foreground',
      success: '[&_[data-slot=alert-leading]]:text-emerald-600',
      warning: '[&_[data-slot=alert-leading]]:text-amber-600',
      error: '[&_[data-slot=alert-leading]]:text-destructive',
    },
  },
  defaultVariants: { severity: 'info' },
});
```

`alertVariants` root carries no class output — all visible styling comes from composed Card + per-severity leading-icon tint via `alertHeaderVariants`. The empty root cva still exists so `VariantProps<typeof alertVariants>` produces the public type. `data-severity` and `data-size` attributes on the rendered root give consumers and tests observable hooks.

`Alert.tsx`:

```tsx
import * as React from 'react';

import { Card } from '@/atoms/Card';
import { Typography } from '@/atoms/Typography';
import { cn } from '@/particles/cn';

import { alertHeaderVariants, type AlertVariants } from './alert.variants';

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'className'>,
    AlertVariants {
  leading?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  header?: React.ReactNode;
  actions?: React.ReactNode;
}

const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const titleVariantForSize = { sm: 'h5', md: 'h4', lg: 'h3' } as const;

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ severity, size, leading, title, description, header, actions, children, ...rest }, ref) => {
    const resolvedSeverity = severity ?? 'info';
    const resolvedSize = size ?? 'md';
    const hasDefaultHeader = title !== undefined || description !== undefined || leading !== undefined;

    const resolvedHeader = header ?? (hasDefaultHeader
      ? (
        <div className={cn(alertHeaderVariants({ severity: resolvedSeverity }))}>
          {leading !== undefined
            ? <span data-slot="alert-leading" aria-hidden>{leading}</span>
            : null}
          <div data-slot="alert-titles">
            {title !== undefined
              ? <Typography as="div" variant={titleVariantForSize[resolvedSize]}>{title}</Typography>
              : null}
            {description !== undefined
              ? <Typography variant="caption">{description}</Typography>
              : null}
          </div>
        </div>
      )
      : undefined);

    return (
      <Card
        ref={ref}
        variant="default"
        padding={cardPaddingForSize[resolvedSize]}
        role="alert"
        data-slot="alert-root"
        data-severity={resolvedSeverity}
        data-size={resolvedSize}
        header={resolvedHeader}
        footer={actions}
        {...rest}
      >
        {children}
      </Card>
    );
  },
);
Alert.displayName = 'Alert';
```

No `className` passed into Card. Variant propagation lives in the two lookup tables. The `header` slot prop overrides the default rendering. `data-severity` / `data-size` attributes on the rendered Card root are the testable observation points.

### Section D — per-molecule sketches

| # | Molecule | Primitive | Composed atoms | Variants | Slot props | State | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Alert | scratch | Card, Typography | severity, size | leading, title, description, header, actions | none | Canonical reference; `role="alert"` |
| 2 | ButtonGroup | scratch | Button (N) | orientation, attached, size, variant | children (Button) | none | Clone children with `React.cloneElement` to inject size/variant; `role="group"`; attached uses neighbor-sibling Tailwind |
| 3 | Collapsible | `@radix-ui/react-collapsible` | Button | size, chevron | trigger, children | open/close (`data-state`) | Trigger uses `asChild` over Button; chevron via Button leading/trailing icon |
| 4 | ContextMenu | `@radix-ui/react-context-menu` | Typography, Separator | size | trigger, items (discriminated union) | open/close | Portal; tests use `screen.findByRole('menu')` |
| 5 | HoverCard | `@radix-ui/react-hover-card` | Card | size, placement | trigger, content | open/close | Portal; tests pass `openDelay={0}` |
| 6 | InputOTP | `input-otp` package | Input (N) | length (4\|6\|8), size | none (controlled value) | controlled value + focus index | `inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength={1}` per slot |
| 7 | Item | scratch | Typography | size, interactive, as | leading, title, description, trailing | none | Polymorphic `as: 'div'\|'li'\|'button'\|'a'` constrained union |
| 8 | NativeSelect | native `<select>` | none (uses wrapper-frame particle) | variant, size, density, tone | leading, options or `<option>` children | native form control | `appearance-none` + decorative chevron (`aria-hidden`); `Omit<...,'size'\|'className'>` |
| 9 | Popover | `@radix-ui/react-popover` | Card (optional) | size, placement, align | trigger, children, title?, description? | open/close | Portal; `modal={false}` default |
| 10 | RadioGroup | `@radix-ui/react-radio-group` | Label | orientation, size | items[] (value, label, description?, disabled?) | controlled value | `React.useId()` for label/item pairing; `aria-label` on Root |
| 11 | Select | `@radix-ui/react-select` | Typography (items), wrapper-frame particle (trigger) | variant, size, density, tone | trigger?, placeholder, items (discriminated) | controlled value + open | Portal; trigger reuses wrapper-frame for visual parity with Input |
| 12 | Switch | `@radix-ui/react-switch` | Label (optional) | size, variant | label? | controlled checked | Inline-label pattern with `useId`; `peer` + `peer-disabled` |
| 13 | Table | scratch (`<table>`) | Typography | variant (default\|striped\|bordered), size, density | caption?, headers[], rows[][], footer? | none | `data-slot="table-head"`/`"table-cell"` on cells; consumer wraps in ScrollArea for overflow |
| 14 | ToggleGroup | `@radix-ui/react-toggle-group` | Toggle | type (single\|multiple), variant, size | items[] (value, label, ariaLabel?, disabled?) | controlled value | `<RadixToggleGroup.Item asChild value={...}><Toggle ...>...</Toggle></...>` |
| 15 | Tooltip | `@radix-ui/react-tooltip` | Typography | size, placement, align | trigger, content | controlled open | Renders internal `RadixTooltip.Provider delayDuration={300}`; tests pass `delayDuration={0}` |

### Section E — molecule-authoring skill structure

New file at [`skills/molecule-authoring/SKILL.md`](./skills/molecule-authoring/SKILL.md). Mirrors atom-authoring sections, with these divergences:

- `## The contract: six files, one directory, no exceptions` — same set, different content.
- `## File-by-file requirements` — same six sub-sections; emphasize no-className-in-props-interface from day one; note the slot-prop pattern in section 1; reference cva-variants skill in section 2; expand section 3 to the five-assertion baseline; expand section 4 with state-demo stories; expand section 5 with the `## Composition` README section.
- `## Naming and import conventions` — same as atoms; molecules import from `@/atoms/<Name>`.
- `## The composition rule (cardinal)` — **new section.** Three rules: no molecule-to-molecule imports, no upward-layer imports, may import atoms + particles. Reference the ESLint enforcement.
- `## The className rule (cardinal)` — reference atom-authoring's section; add the rule that molecules cannot pass `className` to composed atoms either.
- `## Variant propagation` — **new section.** Show the Alert lookup-table pattern.
- `## Slot props` — **new section.** Document the standard vocabulary (leading, title, description, header, actions, footer, trigger).
- `## The trigger pattern (for Radix-trigger molecules)` — **new section.** Popover/Tooltip/ContextMenu/HoverCard/Collapsible all use `trigger: React.ReactElement` + internal `asChild`.
- `## Authoring rules` — same as atoms.
- `## The molecule is also a registry item` — same shape; internal atom imports are NOT in `registryDependencies`.
- `## Per-molecule procedure (copy from Alert)` — six-step recipe; Alert is canonical.
- `## Layer overview` — same diagram with `molecules/` highlighted; note import direction.

### Section F — AGENTS.md additions

Edit cardinal rule #1:

> 1. **Variants are the only public styling surface.** Atoms **and molecules** MUST NOT accept `className` as a public prop. Inside an atom or molecule, `cn()` may compose classes from a base block plus variant-driven conditions, but a consumer-supplied class string is not forwarded to the rendered element. See [skills/atom-authoring/SKILL.md](./skills/atom-authoring/SKILL.md) and [skills/molecule-authoring/SKILL.md](./skills/molecule-authoring/SKILL.md). **As of phase 2, compliance is universal across atoms and molecules.**

Edit rule #2: "Six files per atom **or molecule**, no exceptions."

Edit rule #3: "No default exports under `src/atoms/` **or `src/molecules/`**."

Add rule #11: "Molecules import atoms and particles only. Molecules MUST NOT import other molecules, organisms, templates, pages, or providers. Enforced by ESLint `no-restricted-imports`. When a candidate composes another molecule, promote it to organism instead."

Skill index: add a `molecule-authoring` row immediately after `atom-authoring`.

Tree: change `molecules/` line from `# placeholder barrel` to `# 15 molecules, one directory per molecule, 6 files each`.

Workflow: add "Adding a new molecule" subsection between "Adding a new atom" and "Editing an existing atom".

Pitfalls: add four entries — portal testing via `screen.findByRole`, `trigger` slot typing constraint, ESLint layer guard, Tooltip Provider semantics.

### Section G — build, registry, exports

#### G1. vite.config.ts molecules entry

```ts
const atoms = [
  'AspectRatio', 'Avatar', 'Badge', 'Button', 'Card', 'Checkbox', 'Input',
  'Kbd', 'Label', 'Progress', 'ScrollArea', 'Separator', 'Skeleton', 'Slider',
  'Spinner', 'Textarea', 'Toggle', 'Typography',
] as const;

const molecules = [
  'Alert', 'ButtonGroup', 'Collapsible', 'ContextMenu', 'HoverCard',
  'InputOTP', 'Item', 'NativeSelect', 'Popover', 'RadioGroup', 'Select',
  'Switch', 'Table', 'ToggleGroup', 'Tooltip',
] as const;

// build.lib.entry:
{
  index: resolve(rootDir, 'src/index.ts'),
  particles: resolve(rootDir, 'src/particles/index.ts'),
  atoms: resolve(rootDir, 'src/atoms/index.ts'),
  molecules: resolve(rootDir, 'src/molecules/index.ts'),
  ...Object.fromEntries(atoms.map((a) => [`atoms/${a}`, resolve(rootDir, `src/atoms/${a}/index.ts`)])),
  ...Object.fromEntries(molecules.map((m) => [`molecules/${m}`, resolve(rootDir, `src/molecules/${m}/index.ts`)])),
}
```

Result: `dist/molecules/Alert.js`, `dist/molecules/Popover.js`, etc., plus `dist/atoms.js` and `dist/molecules.js` layer barrels.

#### G2. registry.json molecule entries

Example for Alert:

```json
{
  "name": "alert",
  "type": "registry:ui",
  "files": [
    { "path": "src/molecules/Alert/Alert.tsx", "type": "registry:ui" },
    { "path": "src/molecules/Alert/alert.variants.ts", "type": "registry:ui" }
  ],
  "registryDependencies": ["lucide-react"]
}
```

Per-molecule `registryDependencies`:

- alert: `["lucide-react"]`
- button-group: `[]`
- collapsible: `["@radix-ui/react-collapsible"]`
- context-menu: `["@radix-ui/react-context-menu", "lucide-react"]`
- hover-card: `["@radix-ui/react-hover-card"]`
- input-otp: `["input-otp"]`
- item: `[]`
- native-select: `["lucide-react"]`
- popover: `["@radix-ui/react-popover"]`
- radio-group: `["@radix-ui/react-radio-group"]`
- select: `["@radix-ui/react-select", "lucide-react"]`
- switch: `["@radix-ui/react-switch"]`
- table: `[]`
- toggle-group: `["@radix-ui/react-toggle-group"]`
- tooltip: `["@radix-ui/react-tooltip"]`

Internal atom imports (e.g., a molecule's tsx importing `@/atoms/Card`) are NOT listed in `registryDependencies` — they resolve via the build alias, not via npm. The convention is preserved from atoms.

#### G3. package.json exports map

Replace the single `"."` mapping with a full subpath exports object. Stem mismatch is intentional: `import` points at the flat per-entry JS file emitted by Vite (`entryFileNames: '[name].js'`), `types` points at the nested `.d.ts` preserved by `vite-plugin-dts`.

Per-entry shape (example for Button and Alert):

```json
"./atoms/Button": {
  "types": "./dist/atoms/Button/index.d.ts",
  "import": "./dist/atoms/Button.js"
},
"./molecules/Alert": {
  "types": "./dist/molecules/Alert/index.d.ts",
  "import": "./dist/molecules/Alert.js"
}
```

Full map: root `.`, `./particles`, `./atoms`, 18 atom subpaths, `./molecules`, 15 molecule subpaths.

Consumer verification (from a scratch directory after `bun pm pack --dry-run`):

```bash
bun -e "import { Button } from '@open-tomato/ui-skeleton/atoms/Button'; console.log(Button.displayName)"
bun -e "import { Alert } from '@open-tomato/ui-skeleton/molecules/Alert'; console.log(Alert.displayName)"
bun -e "import { Card, ScrollArea } from '@open-tomato/ui-skeleton/atoms'; console.log(Card.displayName, ScrollArea.displayName)"
bun -e "import { Popover } from '@open-tomato/ui-skeleton/molecules'; console.log(Popover.displayName)"
bun -e "import { Tooltip } from '@open-tomato/ui-skeleton'; console.log(Tooltip.displayName)"
```

If any subpath resolves to undefined or throws `ERR_PACKAGE_PATH_NOT_EXPORTED`, the corresponding exports entry has a stem mismatch — fix it before merging.

#### G4. Barrels

[`src/molecules/index.ts`](./src/molecules/index.ts) becomes a real 15-line barrel:

```ts
export * from './Alert';
export * from './ButtonGroup';
export * from './Collapsible';
export * from './ContextMenu';
export * from './HoverCard';
export * from './InputOTP';
export * from './Item';
export * from './NativeSelect';
export * from './Popover';
export * from './RadioGroup';
export * from './Select';
export * from './Switch';
export * from './Table';
export * from './ToggleGroup';
export * from './Tooltip';
```

[`src/index.ts`](./src/index.ts): remove the `eslint-disable-next-line import/export -- placeholder barrel until molecules ship` comment on the `./molecules` re-export.

---

## Critical files

Files to modify:

- [`AGENTS.md`](./AGENTS.md)
- [`README.md`](./README.md)
- [`NEXT-ITERATIONS.md`](./NEXT-ITERATIONS.md)
- [`PREREQUISITES.md`](./PREREQUISITES.md)
- [`package.json`](./package.json)
- [`vite.config.ts`](./vite.config.ts)
- [`eslint.config.mjs`](./eslint.config.mjs)
- [`registry.json`](./registry.json)
- [`skills/atom-authoring/SKILL.md`](./skills/atom-authoring/SKILL.md)
- [`src/index.ts`](./src/index.ts)
- [`src/molecules/index.ts`](./src/molecules/index.ts)
- All 18 atom directories under [`src/atoms/`](./src/atoms/) (six files each touched)
- [`src/particles/index.ts`](./src/particles/index.ts)

Files to create:

- `src/particles/wrapper-frame.variants.ts`
- `src/particles/__tests__/wrapper-frame.variants.test.ts`
- `skills/molecule-authoring/SKILL.md`
- 15 molecule directories under `src/molecules/<Name>/` (six files each = 90 files)

Existing references to reuse:

- [`src/atoms/Button/`](./src/atoms/Button/) — canonical atom reference (Button.tsx forwardRef + Slot/Slottable pattern, button.variants.ts shape, Button.test.tsx three-assertion baseline, Button.stories.tsx Default+AllVariants, README structure)
- [`src/atoms/Input/`](./src/atoms/Input/) and [`Textarea/`](./src/atoms/Textarea/) — wrapper-frame baseline for the particle extraction
- [`src/atoms/Card/Card.tsx`](./src/atoms/Card/Card.tsx) — slot prop pattern (`header`/`footer` override semantics) reused by molecules
- [`src/particles/cn.ts`](./src/particles/cn.ts) — sole class-merging utility
- [`skills/cva-variants/SKILL.md`](./skills/cva-variants/SKILL.md) — variant-axis patterns, `Omit<...,'size'>` trap
- [`skills/radix-wrappers/SKILL.md`](./skills/radix-wrappers/SKILL.md) — Slot/Slottable, multi-thumb role pattern, inline-label pattern
- [`skills/component-testing/SKILL.md`](./skills/component-testing/SKILL.md) — jsdom limitations, `ResizeObserver` polyfill, `bun test` vs `bun run test`
- [`vitest.setup.ts`](./vitest.setup.ts) — already polyfills `ResizeObserver`; no changes expected

---

## Verification

Run after each major batch (atom refactor, molecule canonical, molecule batches, exports wiring) and once as a consolidated pass before merge:

1. `bun install` — confirms new Radix deps + `input-otp` resolve cleanly.
2. `bun run check-types` — catches the `Omit<..., 'className'>` cascade and every molecule's slot-prop typing.
3. `bun run lint` — the new `no-restricted-imports` rule fires here; auto-formats.
4. `bun run test` — Vitest runs atom + molecule tests.
5. `bun run test:coverage` — confirm 80/80/75/80 thresholds hold package-wide after deleted className tests.
6. Registry sanity: `bun -e "const r = await Bun.file('registry.json').json(); console.log(r.items.length)"` expects `33`.
7. `bun run build` — confirms `vite.config.ts` resolves, `dist/molecules/<Each>.js` files emit, `dist/molecules/<Each>/index.d.ts` declarations preserved.
8. `bun run build-storybook` — confirms `storybook-static/index.json` includes all 15 molecules.
9. Exports verification: run the `bun -e "import {...} from '@open-tomato/ui-skeleton/...'"` snippets from Section G3 against a scratch directory or sibling consumer.
10. Final repeat: `bun run check-types && bun run test && bun run lint`.

If any step fails, fix and re-run from that step (cascade-aware: type errors block tests, lint failures may block test imports, build failures block exports check).

---

## Execution sequencing (suggested batch order)

The phase splits cleanly into five sequenced batches; each is independently verifiable. The PR-per-batch shape from NEXT-ITERATIONS #1 ("one PR per atom, in the order they were authored") scales up:

1. **Atom refactor** — wrapper-frame particle + 18 atom updates + atom-authoring skill update + NEXT-ITERATIONS #1/#2 cleanup. Verify with the gates above before moving on.
2. **Molecule canonical Alert** — author Alert end-to-end, write molecule-authoring skill, update AGENTS.md (cardinal rules, skill index, workflow), add ESLint `no-restricted-imports`.
3. **Remaining 14 molecules** — author by copying Alert, in three sub-batches: stateless first (ButtonGroup, Item, Table), then Radix-state (Collapsible, Switch, RadioGroup, ToggleGroup), then portal-based (Popover, Tooltip, HoverCard, ContextMenu, Select), then specialty (NativeSelect, InputOTP). Add Radix + `input-otp` deps to package.json incrementally so each batch installs cleanly.
4. **Build + exports + registry** — update `vite.config.ts`, rewrite `package.json` `exports`, populate `src/molecules/index.ts`, remove placeholder eslint-disable on `src/index.ts`, append registry entries. Run consumer verification.
5. **Taxonomy doc fixes** — move Calendar + Combobox in README. Final verification pass.
