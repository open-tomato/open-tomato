---
name: radix-wrappers
description: Use when wrapping a Radix primitive into an atom, dealing with Slot/Slottable polymorphism, multi-part wrappers (Card/Avatar/Accordion/Dialog shape), *Indicator sub-components, or any Radix-specific footgun (data-state styling, role propagation, prop-name collisions, decorative toggles).
---

# Radix Wrappers

This skill covers the patterns for wrapping `@radix-ui/react-*` primitives into single-entry atom wrappers. For the file/test/story scaffolding around the wrapper, see [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md). For variant-axis design, see [../cva-variants/SKILL.md](../cva-variants/SKILL.md). For accessibility-specific patterns (`aria-*`, label association, decorative markers), see [../accessibility/SKILL.md](../accessibility/SKILL.md).

## Core principle: fold parts into slot props

Multi-part Radix primitives (Card = header + content + footer; Avatar = root + image + fallback; Accordion = root + item + trigger + content; Dialog = root + trigger + portal + overlay + content + title + description + close; etc.) fold into the **single-entry wrapper** convention via slot props rather than sub-component exports.

The wrapper renders all parts internally; consumers supply data via flat props:

```tsx
// NOT this:
<Avatar.Root>
  <Avatar.Image src="..." alt="..." />
  <Avatar.Fallback>JS</Avatar.Fallback>
</Avatar.Root>

// THIS:
<Avatar src="..." alt="..." fallback="JS" />
```

This keeps the consumer's import surface flat (one named export per atom) and matches the project's "small context surface per component" goal.

## `Slot` and `Slottable` (asChild polymorphism)

For atoms that need to render as something other than their default tag (a `<Button>` as `<a>`, Next `<Link>`, etc.), use the Radix `Slot` pattern via `asChild?: boolean`.

```tsx
import { Slot, Slottable } from '@radix-ui/react-slot';

const Comp = asChild ? Slot : 'button';

return (
  <Comp ref={ref} {...rest}>
    {leadingIcon}
    <Slottable>{children}</Slottable>
    {trailingIcon}
  </Comp>
);
```

### The Slot single-child trap

`Slot` requires **exactly one child** to merge with the user's element. If you also expose icon slot props (`leadingIcon` / `trailingIcon`) and you render them as siblings of `children`, raw `Slot` will throw at runtime when `asChild=true` because there are now three children.

**Fix:** wrap the main `children` in `<Slottable>{children}</Slottable>` and place the icon nodes as raw siblings. `Slottable` (also from `@radix-ui/react-slot`) marks the single mergeable slot and lets other sibling children render alongside without violating the constraint. Under a native element (`asChild=false`), `Slottable` is a transparent Fragment, so the pattern is safe in both branches.

Without `Slottable`, `<Slot>` + multiple children throws at runtime when `asChild` is true.

### Default `type='button'` (and the asChild exception)

When the underlying element is `<button>`, default the `type` attribute to `'button'` (allow override via the prop) so the component doesn't accidentally submit ancestor forms.

Skip the default when `asChild={true}` because the rendered element may not be a `<button>` (passing `type='button'` onto an `<a>` is invalid HTML and triggers React warnings):

```tsx
type={asChild ? undefined : (type ?? 'button')}
```

## Where props land — wrapper vs. inner element

Radix primitives render the wrapper element as `<Primitive.Root>` plus inner elements as `<Primitive.Image>`, `<Primitive.Trigger>`, etc. Props you pass typically target the **primary** primitive slot (the one carrying the public role/aria), not the surrounding wrapper.

### AspectRatio example (two-element render)

Radix `AspectRatio` renders TWO divs:

- An **outer wrapper** with `data-radix-aspect-ratio-wrapper=""` and an inline `padding-bottom` style.
- An **inner `Primitive.div`** that receives the forwarded ref, `className`, and other props.

When testing or styling, find the inner element by the `className` / data-attribute you set, not by the outer wrapper. Same shape applies broadly across Radix primitives — props you pass typically target the primary `Primitive.<tag>` slot.

### Per-part escape-hatch props (multi-part wrappers)

For multi-part Radix wrappers where consumers may need to pass per-part attributes (`viewportProps` for ScrollArea's viewport, `imageProps` for Avatar's image), expose escape-hatch props typed as `Omit<RadixSubProps, 'children' | 'controlled-by-wrapper-keys'>`.

**Important: per-part bag props MUST also `Omit` `'className'`.** Per the [../atom-authoring/SKILL.md](../atom-authoring/SKILL.md) className rule, atoms reject `className` on the public API; per-part bag props that forward `{...bag}` to an inner sub-component re-open the same escape hatch if they don't omit it. The omission applies universally: Avatar's `imageProps`, ScrollArea's `viewportProps` / `scrollbarProps`, Select / Popover / Tooltip / HoverCard `contentProps` and `triggerProps`, and any future per-part bag. Same rule for molecule-layer per-part bags. If the consumer needs to tune a per-part visual, add a per-part variant axis at the wrapper level instead.

Document in the README which prop targets which DOM node.

## The `data-slot` convention for multi-part wrappers

Mark each rendered section of a multi-part wrapper with `data-slot="<component>-<part>"`:

```tsx
return (
  <div data-slot="card-root" {...rootProps}>
    {header !== undefined && <div data-slot="card-header">{header}</div>}
    {(title !== undefined || description !== undefined) && (
      <div data-slot="card-titles">
        {title !== undefined && <h3 data-slot="card-title">{title}</h3>}
        {description !== undefined && <p data-slot="card-description">{description}</p>}
      </div>
    )}
    {children !== undefined && children !== null && (
      <div data-slot="card-content">{children}</div>
    )}
    {footer !== undefined && <div data-slot="card-footer">{footer}</div>}
  </div>
);
```

The data-attribute:

- Lets tests assert section presence/absence (`container.querySelector('[data-slot="card-header"]')`) without coupling to ephemeral class strings.
- Lets tests resolve which section a piece of content lives in (`screen.getByText('X').closest('[data-slot="card-header"]')`).
- Gives downstream consumers a styling hook that survives className overrides via the `cn` / twMerge collapse.

## Conditional rendering of optional slots

For slot-based wrappers (Card-style) where multiple optional slots (`header`, `title`, `description`, `footer`) can independently appear or vanish, gate each section on `prop !== undefined` rather than truthy checks.

```tsx
// WRONG — drops legitimate empty-string or 0 values
{title && <h3>{title}</h3>}

// RIGHT — renders the slot whenever the consumer passes anything
{title !== undefined && <h3>{title}</h3>}
```

Also gate the **children** content slot on `children !== undefined && children !== null` so that a contentless wrapper (header-only or footer-only) doesn't emit an empty inner `<div>`.

## Default-layout vs. override slots

For slot-based wrappers with a "default layout" composed of multiple slots AND an "override" slot (e.g. Card's `title` + `description` vs. a custom `header` ReactNode), make the override slot **replace** the entire default layout when present rather than merging.

- Easier mental model for consumers (mutually exclusive choices).
- Simpler test surface.
- Matches established shadcn composition.

Document the override semantics in the README's Do / Don't section ("DON'T mix the `header` slot with `title` / `description`").

## `*Indicator` sub-components

Radix `*Indicator` sub-components (`CheckboxIndicator`, `RadioGroupIndicator`, `SwitchThumb`, etc.) only render when the parent's state is non-default (e.g. `checked` or `indeterminate`). They carry the parent's resolved `data-state` so child icons can be discriminated via Tailwind's `group-data-[state=<value>]:` modifier.

**Pattern for tri-state Checkbox:** put `group` on the Indicator's className, render both icons (Check + Minus) as children with `group-data-[state=indeterminate]:hidden` / `hidden group-data-[state=indeterminate]:inline-block`. No React state mirroring needed for indeterminate tri-state.

```tsx
<CheckboxPrimitive.Indicator className="group flex items-center justify-center">
  <Check className="size-3.5 group-data-[state=indeterminate]:hidden" />
  <Minus className="size-3.5 hidden group-data-[state=indeterminate]:inline-block" />
</CheckboxPrimitive.Indicator>
```

The default-named `group` is fine when there is no nested group; use `group/<name>` only if nesting becomes a concern.

### `data-state` on triggers, too

The Radix trigger button itself also gets `data-state="checked" | "unchecked" | "indeterminate"`. Pair `data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground` (and the same for `indeterminate`) on the trigger's cva block so checked and indeterminate share the filled-in look while unchecked stays default. Saves a `useState` mirror for the visual selected state.

## Track + indicator primitives (Progress, Slider Range)

For Radix track+indicator primitives, drive the indicator width via inline `style={{ transform: 'translateX(-${100-percent}%)' }}` and put `overflow-hidden` on the track's cva block. That's the shadcn-standard pattern and it lets the indicator share a single `w-full` base class regardless of progress.

**Don't** compute the indicator width via `w-[<n>%]` classes. Arbitrary-value classes that depend on runtime data would require Tailwind to generate one utility per render.

For `Progress`:

- Pass the raw `value` (including `null` / `undefined`) straight through to the Radix primitive so it can set `data-state="indeterminate"`.
- Compute the local `percent` **after** clamping to `[0, max]` so out-of-range inputs don't visually overflow.
- For `null` values the indicator parks at `translateX(-100%)` (off-screen). An animated indeterminate state is not implemented this iteration — see [../../NEXT-ITERATIONS.md](../../NEXT-ITERATIONS.md).

## Decorative primitives (Separator pattern)

Some Radix primitives accept a `decorative` boolean (e.g. `Separator`) that flips the rendered role between `role="separator"` (semantic, with `aria-orientation` on vertical) and `role="none"` (visual-only, dropped from the a11y tree).

- Default `decorative={true}` to match shadcn's convention.
- Expose the prop so consumers can opt into semantic dividers.
- Tests use `getByRole('separator')` for the `decorative=false` branch and `container.querySelector('[data-slot=...]')` for the `decorative=true` branch (since `role="none"` makes the element unfindable via role queries).

Same pattern likely applies anywhere Radix exposes a `decorative` toggle.

## Auto-emitted Radix attributes

Several Radix primitives already emit `data-orientation="<value>"` on their rendered root automatically (e.g. `Separator`, `ScrollArea` scrollbars, likely `Slider`, `ToggleGroup`, `Tabs`). The wrapper doesn't need to set `data-orientation` itself — assert against the Radix-provided attribute in tests.

Still add `data-slot="<component>"` and any extra variant attributes (`data-variant`) the wrapper itself drives, since those aren't provided by Radix.

## Multi-thumb primitives (Slider and friends)

Multi-thumb Radix primitives (`Slider`, future `RangeSlider`-style atoms) put `role="slider"` on the inner thumb `<span>`, **not** on the Root. This has two consequences:

### 1. Accessible name propagation

`aria-label` / `aria-labelledby` passed to the wrapper lands on the Root by default — invisible to axe's `aria-input-field-name` rule (which only checks the role-bearing element). The wrapper MUST destructure `aria-label` / `aria-labelledby` from props and forward them onto every rendered thumb, otherwise `getByRole('slider', { name: '...' })` returns null AND axe flags every thumb.

```tsx
const { 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, ...rest } = props;

// render N thumbs:
{thumbs.map((_, i) => (
  <SliderPrimitive.Thumb
    key={i}
    aria-label={thumbAriaLabels?.[i] ?? ariaLabel}
    aria-labelledby={ariaLabelledBy}
  />
))}
```

Pattern likely recurs for `Tabs` (role on TabsTrigger), `RadioGroup` (role on RadioItem), `ToggleGroup` (role on Item) — whenever the role is on a sub-element generated by the wrapper, propagate the accessible name there.

### 2. Per-thumb labels for range sliders

Expose an additional `thumbAriaLabels?: string[]` prop so range sliders can give each thumb a semantically distinct name (e.g. `['Min', 'Max']`). Per-thumb override falls back to the root's `aria-label` when an index is missing or the array isn't provided.

### 3. Thumb count comes from the value, not from props

For wrappers around Radix primitives whose Root takes an array `value` / `defaultValue` and renders one sub-element per entry (Slider thumbs, ToggleGroup items in `type="multiple"`), determine the render-count locally:

```tsx
const thumbs = React.useMemo(() => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(defaultValue)) return defaultValue;
  return [min, max]; // sensible fallback for "no value given" range sliders
}, [value, defaultValue, min, max]);
```

Without this the wrapper can't know how many sub-elements to emit; Radix only manages the index-to-state mapping, not the JSX.

The fallback for a "no value given" range slider is `[min, max]` (two thumbs at the extremes) which makes the range fill visible by default.

### 4. Slider Root renders an HTMLSpanElement

Radix Slider's Root renders an `<span>` (not `<div>`). When typing the `forwardRef`, use `React.forwardRef<HTMLSpanElement, SliderProps>`. The same `<span>` ref target applies to Track, Range, and Thumb. Sub-element ref types matter when downstream code reads `ref.current.style` and the consumer expects a span vs. div distinction.

## Prop-name collisions between wrapper variant axis and Radix prop

When a wrapper's variant axis name collides with a Radix primitive prop name (e.g. Separator's `orientation` axis collides with Radix's `orientation` prop), use `Omit<RadixProps, '<axis>'>` in the wrapper's props interface — even though the value unions look identical. See [../cva-variants/SKILL.md](../cva-variants/SKILL.md) for the type rationale.

## Coordinating tonal palettes across primitives

The standard shadcn-style tonal palette (`bg-secondary` track + `bg-primary` range/border) reads the same Tailwind tokens as Progress (`bg-secondary` track + `bg-primary` indicator). Reuse this pairing for any track+fill atom — it keeps the visual language consistent across Progress, Slider, and any future range/value-display widgets without needing a new semantic token.

## Loading state (DOM attribute combo)

When an atom exposes a `loading` prop, mirror it onto the DOM via three attributes for the widest accessibility + styling surface:

- `data-loading=""` — CSS hook + DOM-introspection test hook.
- `aria-busy="true"` — screen-reader announcement.
- `disabled` — block pointer + keyboard activation.

Combine `loading` with any user-supplied `disabled` so consumers don't need to set both:

```tsx
const isDisabled = disabled || loading;

return (
  <Comp
    disabled={isDisabled}
    aria-busy={loading || undefined}
    aria-disabled={isDisabled || undefined}
    data-loading={loading ? '' : undefined}
    // ...
  />
);
```

Tests should assert all three: `toBeDisabled()`, `toHaveAttribute('data-loading', '')`, `toHaveAttribute('aria-busy', 'true')`.

## Form controls (wrapper-frame pattern)

For atoms where a native control is wrapped in a styled `<div>` that carries the visible frame (so icon slots can sit alongside the control — Input, Textarea, future ComboBox-style atoms):

- `focus-within:ring-*` on the wrapper instead of `focus:ring-*` on the control.
- Propagate disabled state to the wrapper visually via `has-[input:disabled]:opacity-50 has-[input:disabled]:cursor-not-allowed`.
- Forward `ref` to the **inner control** element, not the wrapper, so consumer `useRef().current.focus()` and form integration work as expected.

For `variant: error | success` axes on form controls, auto-set `aria-invalid="true"` when `variant === 'error'` so visual error state and a11y error state can never drift. Respect explicit consumer overrides:

```tsx
const ariaInvalid = consumerAriaInvalid ?? (variant === 'error' ? true : undefined);
```

This lets `aria-invalid={false}` deliberately suppress the auto-set value. Same pattern likely applies to `aria-disabled`, `aria-required`, `aria-busy` when a wrapper has a categorical variant or boolean prop that mirrors them.

## Inline labels (Checkbox / Radio / Switch pattern)

For atoms that wrap a Radix primitive AND expose an optional inline label slot, auto-generate the linking id via `React.useId()` only when `label !== undefined` and the consumer hasn't passed an `id`:

- When `label` is provided: return an inline-flex `<span data-slot="<component>-root">` containing the Radix trigger + a sibling `<label htmlFor={id} data-slot="<component>-label">`.
- When `label` is omitted: return the bare trigger alone.

This keeps unlabelled usage (with `aria-label`) free of extra DOM and matches the accessibility expectation that the label is optional, not always wrapped.

Native `<label htmlFor>` provides an accessible name for a Radix-rendered `<button role="checkbox">` (and other role-overridden buttons) because the underlying element is a labelable HTML element. `getByRole('checkbox', { name: 'X' })` resolves correctly through the `for`/`id` link — no `aria-labelledby` plumbing required when the wrapper renders its own `<label>`.

Pair the Radix trigger with class `peer` and put `peer-disabled:opacity-50 peer-disabled:cursor-not-allowed` on the sibling `<label>` so the label tracks the trigger's disabled state via CSS, no extra prop plumbing.

## Combining forwarded ref with internal ref

When a forwarded ref AND an internal ref both need to point at the same DOM node (e.g. `Textarea`'s `autoResize` needs to read `scrollHeight`, but the consumer also passed a ref), use a `useCallback` ref combiner:

```tsx
const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

const setRefs = React.useCallback((node: HTMLTextAreaElement | null) => {
  internalRef.current = node;
  if (typeof forwardedRef === 'function') {
    forwardedRef(node);
  } else if (forwardedRef) {
    (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
  }
}, [forwardedRef]);
```

- Deps are `[forwardedRef]` only — don't put `internalRef` in deps; it never changes identity.
- Type the writable assignment as `(forwardedRef as React.MutableRefObject<T | null>).current = node` to silence the readonly-current complaint TypeScript emits on `React.Ref<T>`.

## Image alt handling

When a Radix `*Image` sub-component requires `alt`, default it to `''` in the wrapper rather than making it required at the wrapper API level — callers can omit it for purely decorative avatars/images and still pass a11y checks (axe treats empty alt as "decorative", not "missing"). Make `alt` strongly recommended in the README / JSDoc but not a required TypeScript prop, so the wrapper stays ergonomic for the fallback-only case.

## Gating tests on Radix-driven render branches

For multi-part wrappers where a sub-element (e.g. ScrollArea's `Corner`) is conditionally mounted **by Radix itself** based on runtime layout (not by the wrapper's render branch), assert only the wrapper-controlled branches in tests and document the Radix-gated behavior. Don't assert the corner/sub-element's DOM presence; jsdom can't satisfy Radix's gating conditions and you'll get a flaky-looking test.

The wrapper's responsibility is "emit the right JSX"; Radix decides whether to mount.

For the `ResizeObserver` jsdom polyfill and the `ScrollArea` `type="always"` trick to force both scrollbars in tests, see [../component-testing/SKILL.md](../component-testing/SKILL.md).
