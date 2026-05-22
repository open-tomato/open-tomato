---
name: cva-variants
description: Use when writing or modifying any <component>.variants.ts file, designing a variant axis, dealing with size collision against native attributes, or handling axes that map to non-className payloads (numeric props, multi-element styling, polymorphic tag selection).
---

# CVA Variants

This skill covers the mechanics inside `*.variants.ts` files and the variant API every atom exposes to consumers. For the file layout, naming, and where this file sits within the six-file convention, see [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md). For the underlying token vocabulary (`bg-primary`, `text-foreground`, ...) referenced from variant blocks, see [../styling/SKILL.md](../styling/SKILL.md).

## Anatomy of a `<component>.variants.ts` file

```ts
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  // Base classes — applied to every variant
  'inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
  'transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        // ...
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

### Required shape

- Use single quotes (ESLint enforces).
- Order inside the cva block: base classes string → `variants` object → `defaultVariants` object. Don't shuffle.
- Export the cva call as `<component>Variants` and the type as `<Component>Variants` (note the case difference; the type is what the component file consumes via `VariantProps`).
- Only this file and `src/particles/` may call `cva` directly. The component file imports the call expression; it never builds variants inline.

## The `size` collision (and friends)

Several native HTML attributes use names that collide with categorical variant axes. The most common is `size` on input controls, where the native attribute is `number` and the variant value is a `'sm' | 'md' | 'lg'` union.

Atoms whose `<Component>Props` extends `React.InputHTMLAttributes<HTMLInputElement>`, `TextareaHTMLAttributes`, or `SelectHTMLAttributes` MUST use `Omit<..., 'size'>` to shadow the native attribute:

```ts
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    InputVariants {
  // ...
}
```

**Same trap will recur for any atom whose categorical variant prop reuses a native-attribute name.** Known examples to watch for:

| Variant name | Collides with on |
|---|---|
| `size` | `<input>`, `<textarea>`, `<select>` |
| `color` | `<input type="color">` (and stricter rules under some lints) |
| `title` | every HTML element (`HTMLAttributes` declares `title: string`) |
| `value` | form controls, `<meter>`, `<progress>` |
| `default` | rare, but appears in some Radix prop types |

For elements that don't carry the colliding attribute (Label extending `LabelHTMLAttributes<HTMLLabelElement>`; div/span generic wrappers), no `Omit` is needed. The collision is per-element-type, not per-variant.

## Variant maps for non-className payloads

Some variant axes don't reduce to a class string. The canonical example is a wrapper around a Radix primitive that takes a numeric prop (`AspectRatio`'s `ratio: number`, `Progress`'s `value: number`) but you want a categorical variant API (`ratio: 'square' | 'video' | 'portrait'`).

**Pattern:** export a `<component>Map` const next to the cva call. cva generates class strings; the map is a parallel lookup the component file reads.

```ts
export const aspectRatioVariants = cva('relative w-full overflow-hidden', {
  variants: {
    ratio: {
      square: 'aspect-[1/1]',
      video: 'aspect-[16/9]',
      portrait: 'aspect-[3/4]',
    },
  },
  defaultVariants: { ratio: 'square' },
});

export const aspectRatioMap: Record<NonNullable<AspectRatioVariants['ratio']>, number> = {
  square: 1,
  video: 16 / 9,
  portrait: 3 / 4,
};

export type AspectRatioVariants = VariantProps<typeof aspectRatioVariants>;
```

The component reads the map to pass `ratio={aspectRatioMap[resolvedRatio]}` into the Radix primitive, while cva applies the class string for styling hooks.

**Even when the variant key produces the same visual styling** (e.g., AspectRatio where the ratio name maps to a numeric prop, not a paint change), still emit a small marker class per variant (`aspect-[1/1]` / `aspect-[16/9]` / `aspect-[3/4]`) and a `data-<variant>="<name>"` attribute on the rendered element. The class satisfies the "applies a variant class for at least one non-default variant" test requirement; the data-attribute gives consumers and tests an observable hook.

Same pattern recurs for slider thumb counts (`Array.isArray(value) ? value : [fallback...]`), for any wrapper that needs to project a variant key into a non-className value.

## Boolean variant axes

CVA supports boolean axes by declaring `variants: { <name>: { true: '<classes>', false: '<classes>' } }` and `defaultVariants: { <name>: false }`.

```ts
export const cardVariants = cva('rounded-lg border bg-card text-card-foreground', {
  variants: {
    interactive: {
      true: 'hover:shadow-elev-2 cursor-pointer transition-shadow',
      false: '',
    },
  },
  defaultVariants: { interactive: false },
});
```

**Even when both branches resolve to empty class strings** (because the visual effect lives in a separately-rendered sub-element rather than a class on the root), keep the boolean variant declared so it remains part of `VariantProps<typeof xVariants>` and stays discoverable through the public type. Pair it with a corresponding `data-<name>` attribute on the rendered root (set to `''` for true, `undefined` for false) so consumers and tests have an observable hook even when the variant has no direct className impact.

## Multi-element variants — split into multiple cva blocks

When a single categorical variant axis needs to drive className subsets on multiple sub-elements of one wrapper (e.g. `Progress`'s `variant` colors both the track and the inner indicator with different but coordinated palettes; Avatar's `variant` themes the root, image, and fallback), split into multiple cva blocks where each declares **only** the variant keys it needs.

```ts
export const progressVariants = cva('relative w-full overflow-hidden rounded-full', {
  variants: {
    variant: {
      default: 'bg-secondary',
      success: 'bg-emerald-100',
    },
    size: { sm: 'h-1', md: 'h-2', lg: 'h-3' },
  },
  defaultVariants: { variant: 'default', size: 'md' },
});

export const progressIndicatorVariants = cva('h-full w-full transition-transform', {
  variants: {
    variant: {
      default: 'bg-primary',
      success: 'bg-emerald-500',
    },
  },
  defaultVariants: { variant: 'default' },
});

export type ProgressVariants = VariantProps<typeof progressVariants>;
```

- The root's `VariantProps` is the **public** type — that's what the component's props interface extends.
- The inner blocks are internal styling helpers. They do not contribute to the public API.
- Pass the same resolved variant value to both calls in the component file so they stay coordinated.

Same shape applies any time a "look" axis projects into more than one rendered element — Toggle pressed-state ring + label, Slider track + range, Avatar root + image + fallback, etc.

## Don't set `defaultVariants` for augmenting axes

For axes that **augment** another axis's styling (Typography's `weight` augments `variant`'s default weight; Toggle's `pressed` augments `variant`'s default tone), don't set a `defaultVariants` entry for the augmenting axis. Leaving it undefined means cva emits no augment class, so the base variant's default styling holds.

```ts
export const typographyVariants = cva('font-sans', {
  variants: {
    variant: { display: 'text-4xl font-bold', body: 'text-base font-normal' },
    weight: { regular: 'font-normal', medium: 'font-medium', bold: 'font-bold' },
  },
  defaultVariants: {
    variant: 'body',
    // weight intentionally not set — the variant's default weight wins
  },
});
```

`tailwind-merge` would resolve the conflict anyway via `cn()`, but skipping the default keeps the resolved className string shorter and the variant intent more obvious in the DOM.

## Inline mapping vs. particle extraction

For CVA axes where every variant key maps to a single utility class (e.g. `weight: { light: 'font-light', regular: 'font-normal', medium: 'font-medium', semibold: 'font-semibold', bold: 'font-bold' }` and `align: { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify' }`), inline them in the cva block rather than reaching for `particles/` helpers. The mapping IS the contract; there's no shared logic to extract.

Reserve `src/particles/` for **cross-component** class strings (focus rings, disabled states, animation tokens that aren't pure utility classes) where dedup across multiple atoms matters.

## Particle composition pattern (Input, Textarea, NativeSelect)

When an atom needs the shared `wrapperFrameVariants` particle plus its own element-specific selectors (e.g. Input's `has-[input:disabled]:*`, Textarea's per-density min-height), do NOT re-declare a sibling cva with the same axes — duplication drifts. Instead, wrap the particle in a function that returns `cn(particle(props), atomSpecificClasses)` and re-export the variant type:

```ts
import { wrapperFrameVariants, type WrapperFrameVariants } from '@/particles/wrapper-frame.variants';
import { cn } from '@/particles/cn';

export const inputVariants = (props: InputVariants) =>
  cn(
    wrapperFrameVariants(props),
    'has-[input:disabled]:opacity-50 has-[input:disabled]:cursor-not-allowed',
  );

export type InputVariants = WrapperFrameVariants;
```

To "substitute" a single particle axis branch (e.g. Textarea swapping `h-7` for `min-h-7` in `density='compact'`), pass the neutral value (`density: 'comfortable'`) to the particle so its branch emits nothing, then append the atom-specific replacement string conditionally in `cn(...)`. This avoids `tailwind-merge` mismatches across `h-*` / `min-h-*` groups (which live in different merge groups and would otherwise both survive) and keeps the substitution intentional rather than additive.

## Segmented-control compound variants (ButtonGroup, ToggleGroup)

Wrapper molecules that collapse neighboring child borders into a single segmented look (`attached` axis) MUST express the neighbor-sibling Tailwind selectors as cva `compoundVariants` keyed on `orientation` + `attached`, not bake them into each composed child atom. Pattern:

```ts
compoundVariants: [
  {
    orientation: 'horizontal',
    attached: true,
    class:
      '[&>*]:rounded-none [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md ' +
      '[&>*:not(:first-child)]:-ml-px ' +
      '[&>*:focus-visible]:relative [&>*:focus-visible]:z-10',
  },
  {
    orientation: 'vertical',
    attached: true,
    class:
      '[&>*]:rounded-none [&>*:first-child]:rounded-t-md [&>*:last-child]:rounded-b-md ' +
      '[&>*:not(:first-child)]:-mt-px ' +
      '[&>*:focus-visible]:relative [&>*:focus-visible]:z-10',
  },
],
```

The `[&>*:focus-visible]:relative` + `z-10` pair is mandatory — without it, the focused child's ring is clipped by the next sibling's negative margin and the visual focus indicator disappears.

## Polymorphic atoms (Typography-style)

For atoms that render as one of N possible HTML tags (Typography being the canonical example), keep the `as` prop constrained to a **closed string union** rather than the generic `<T extends ElementType>` dance.

```ts
type TypographyAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'code' | 'kbd';

export interface TypographyProps extends TypographyVariants {
  as?: TypographyAs;
  // ... rest of props
}
```

### Why the constrained union over the generic pattern

- Plays nicely with `forwardRef<HTMLElement, ...>` without complex `ComponentPropsWithoutRef<T>` generics.
- Storybook controls stay usable (you get a dropdown of valid values).
- Matches design-system intent — consumers shouldn't be rendering Typography as a `<div>` or `<table>`.
- One cast inside the component is enough: `const Component = resolvedAs as React.ElementType;` collapses the union to the contract React expects without losing the ref type.

### Variant-to-tag default mapping

For atoms whose visual axis (`variant`) and semantic axis (`as` tag) are decoupled, expose a `variantToTag` lookup const next to the component:

```ts
export const typographyVariantToTag: Record<TypographyVariant, TypographyAs> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  caption: 'span',
  code: 'code',
};
```

The component defaults `as` via `as ?? typographyVariantToTag[resolvedVariant]` so consumers get correct semantics for free, but can override when document outline rules require divergence (e.g. `variant="h2" as="h1"`).

Reflect both on the DOM as `data-variant` and `data-as` so downstream code and tests can read the resolved values.

### Cross-element-type polymorphism (`AllHTMLAttributes`)

When a polymorphic component's `as` prop spans elements with DIVERGENT attribute surfaces (e.g. Item's `'div' | 'li' | 'button' | 'a'` accepts `href` for `a`, `type` / `disabled` for `button`), extend `React.AllHTMLAttributes<HTMLElement>` instead of `React.HTMLAttributes<HTMLElement>`. `AllHTMLAttributes` is React's union-of-all-HTML-element-attrs type — it surfaces `href`, `target`, `rel`, `type`, `disabled`, `name`, `value`, etc. on the same props interface without needing a discriminated union.

The cost is that consumer-supplied attrs are NOT narrowed per-element: a `href` on `as='div'` type-checks but renders as an invalid DOM attribute. Document supported per-element attrs in the README rather than encoding them as a discriminated union — the runtime cost of a stray attribute is just a React warning, not a render failure.

### `Omit` clause for polymorphic props

`AllHTMLAttributes` carries `size?: number` (form attribute), `color?: string`, plus the categorical-collision suspects from the table above. The `Omit<...>` clause on a polymorphic props interface must include at minimum `'title' | 'className' | 'size' | 'color' | 'as'`:

- `'as'` collides with the polymorphic prop the interface declares itself.
- `'size'` / `'color'` / `'title'` collide as documented in the categorical-axis table.
- `'className'` is the cardinal rule.

### Inject `type='button'` when polymorphic renders a native `<button>`

When a polymorphic component may render as `<button>` (e.g. Item with `as='button'`), inject `type='button'` by default to prevent accidental form submission. Spread the injection BEFORE `{...rest}` so consumers can still override to `type='submit'` when the row genuinely lives inside a `<form>`:

```tsx
const buttonTypeProps = resolvedAs === 'button' ? { type: 'button' as const } : {};

return <Component {...buttonTypeProps} {...rest} />;
```

### Typography children inside polymorphic roots

When the polymorphic root may render as `<button>` or `<a>`, force any composed Typography's `as` prop to `'span'`. Typography's default tag mapping (e.g. `variant='body'` → `<p>`, `variant='h4'` → `<h4>`) produces invalid HTML — `<p>` and `<h*>` cannot appear inside `<button>` per the HTML spec. The runtime tolerates it but axe and screen readers do not.

### Variant name vs. atom name collision

When a `variant` axis name collides with another atom's *name* (e.g. Typography's `kbd` variant vs. the dedicated `Kbd` atom that renders `<kbd>`), still ship the variant — but document the divergence explicitly in the README so consumers pick the right tool:

- The standalone atom for the semantic element.
- The variant for the visual treatment applied to a different (typically non-semantic) tag.

Pattern recurs whenever a visual-style axis shares vocabulary with a semantic primitive (`code`, `mark`, `samp`, etc.).

## Numeric prop collision when wrapping Radix

Several Radix primitives accept a numeric prop (`AspectRatio`'s `ratio`, `Progress`'s `value`, `Slider`'s `min`/`max`). The wrapper's categorical variant API needs to project to that numeric value (see "Variant maps" above), but the Radix prop type may also be exposed if the wrapper extends Radix's props.

When a wrapper's variant axis shares a name with a Radix primitive prop (e.g. Separator's `orientation` axis collides with Radix's `orientation` prop), use `Omit<RadixProps, '<axis>'>` in the wrapper's props interface — even though the value unions look identical. cva's resolved `VariantProps` type widens to `T | null | undefined`, but Radix typically accepts only `T | undefined`. The `Omit` lets the wrapper's resolved-then-passed value satisfy Radix's stricter type after the local `?? 'default'` normalization, with no `as` cast required.

## ESLint friction to expect

`@stylistic/multiline-ternary` will auto-format short inline ternaries across multiple lines on `bun lint`. Examples:

```tsx
// You write:
const Comp = asChild ? Slot : 'button';

// After bun lint:
const Comp = asChild
  ? Slot
  : 'button';
```

Don't fight the auto-format. Expect ternary JSX attribute values like `{cond ? 'a' : undefined}` to be wrapped over three lines after lint. Write them inline and let lint reformat — the resulting diff is cosmetic, not semantic.
