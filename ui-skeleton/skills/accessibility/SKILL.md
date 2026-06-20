---
name: accessibility
description: Use when adding ARIA attributes, labeling a control, building a loading/status indicator, dealing with decorative markers (required-indicator asterisks, info dots), handling alt text on images, or debugging axe failures. Covers the patterns that keep both axe and screen readers happy.
---

# Accessibility

This skill covers the accessibility patterns that the atoms in this package have settled on. Every atom's test suite asserts `await axe(container)` returns `toHaveNoViolations()` — these patterns are the ones that keep that assertion green.

For Radix-specific patterns (`*Indicator` discrimination, decorative primitives, role-on-thumb propagation), see [../radix-wrappers/SKILL.md](../radix-wrappers/SKILL.md). For Testing Library traps (exact-match accessible name, label association in tests), see [../component-testing/SKILL.md](../component-testing/SKILL.md).

## The three-attribute loading combo

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
  />
);
```

Tests should assert all three: `toBeDisabled()`, `toHaveAttribute('data-loading', '')`, `toHaveAttribute('aria-busy', 'true')`.

## Image alt text

When a Radix `*Image` sub-component requires `alt` (e.g. `Avatar.Image`), default it to `''` in the wrapper rather than making it required at the wrapper API level:

```ts
interface AvatarProps {
  src?: string;
  alt?: string; // defaults to '' inside the component
  // ...
}
```

Callers can omit `alt` for purely decorative images and still pass a11y checks (axe treats empty alt as "decorative", not "missing"). Make `alt` strongly recommended in the README / JSDoc but not a required TypeScript prop, so the wrapper stays ergonomic for the fallback-only case.

## `aria-invalid` on form controls with error variant

For form-control atoms with a semantic `variant: error | success` axis, auto-set `aria-invalid="true"` when `variant === 'error'` so visual error state and a11y error state can never drift.

Respect explicit consumer overrides by destructuring the `aria-invalid` prop and using `??`:

```tsx
const ariaInvalid = consumerAriaInvalid ?? (variant === 'error' ? true : undefined);
```

This lets `aria-invalid={false}` deliberately suppress the auto-set value.

Same pattern likely applies to `aria-disabled`, `aria-required`, `aria-busy` when a wrapper has a categorical variant or boolean prop that mirrors them.

## Labels that work for Radix-rendered controls

Native `<label htmlFor>` provides accessible name for a Radix-rendered `<button role="checkbox">` (and other role-overridden buttons) because the underlying element is a labelable HTML element. `getByRole('checkbox', { name: 'X' })` resolves correctly through the `for` / `id` link — no `aria-labelledby` plumbing required when the wrapper renders its own `<label>`.

### Inline-label atoms (Checkbox / Radio / Switch)

For atoms that wrap a Radix primitive AND expose an optional inline label slot, auto-generate the linking id via `React.useId()` only when `label !== undefined` and the consumer hasn't passed an `id`. Keep two render paths:

- **When `label` is provided:** return an inline-flex `<span data-slot="<component>-root">` containing the Radix trigger + a sibling `<label htmlFor={id} data-slot="<component>-label">`.
- **When `label` is omitted:** return the bare trigger alone.

This keeps unlabelled usage (with `aria-label`) free of extra DOM and matches the accessibility expectation that the label is optional, not always wrapped.

### Tracking the trigger's disabled state on the label

Pair the Radix trigger with class `peer` and put `peer-disabled:opacity-50 peer-disabled:cursor-not-allowed` on the sibling `<label>` so the label tracks the trigger's disabled state via CSS, no extra prop plumbing. Works because Radix forwards native `disabled` onto the underlying `<button>`, so the `:disabled` pseudo-class fires.

## Decorative markers — use DOM, not pseudo-elements

For decorative visual markers attached to text content (Label's required-indicator asterisk, info badges, status dots), render the marker as a DOM element with `aria-hidden="true"` rather than a CSS `::after { content: '*' }` pseudo-element.

### Why the DOM approach wins

1. **Reliably ignored by the accessible-name algorithm.** `getByRole('textbox', { name: 'Email' })` resolves the linked control's name without picking up the marker.
2. **Survives `aria-labelledby` lookups.** Pseudo-element content can leak into the accessible name unpredictably across screen readers.
3. **Provides a test hook.** A `data-slot` attribute lets tests assert presence/absence of the marker.

Pseudo-element content is announced inconsistently across screen readers. Avoid it for anything semantically meaningful.

```tsx
// GOOD:
<label>
  Email
  {required && (
    <span aria-hidden="true" data-slot="label-required-indicator">*</span>
  )}
</label>

// BAD (announced inconsistently):
<label className="after:content-['*']">Email</label>
```

### Override slot for the marker

Expose an override prop (`requiredIndicator?: ReactNode`) that defaults to a sensible literal (`'*'`) via the nullish-coalescing operator inside the JSX (`{requiredIndicator ?? '*'}`). Keeps the API ergonomic for the common case while allowing consumers to swap in a richer marker (icon, parenthetical text) without owning the wrapping element.

Pattern generalizes to any "default literal with optional override" slot.

## Status indicators — role choice depends on the atom's purpose

Two related-but-distinct patterns:

### Skeleton (decorative placeholder)

For "purely decorative placeholder" atoms (Skeleton and any future loading-state placeholders), do **NOT** auto-set `role="status"` / `aria-live` on the rendered element.

- A single placeholder shouldn't be its own live region.
- Render a plain `<div>` (no ARIA role by default).
- Document in the README that consumers should wrap one or more placeholders in a parent `<div role="status" aria-live="polite" aria-label="Loading">` when announcing loading state.

This matches shadcn's convention and keeps the atom composable inside larger loading layouts without producing axe duplicate-role warnings.

### Spinner (active status indicator)

For atoms that ARE the loading indicator (Spinner) rather than placeholders (Skeleton), it IS appropriate to auto-set:

- `role="status"`
- `aria-label` (default to a sensible value like `'Loading'`)
- An `sr-only` child carrying the label text (for screen readers that don't announce `aria-label` on `role="status"`).

Skeleton's "no implicit role" rule applies to decorative content-shape placeholders, not to active status indicators that stand alone with no other labeled content.

Expose a `label?: string` prop defaulting to a sensible value:

- `label === undefined` → use the default (`'Loading'`).
- `label === ''` → treat as "decorative" branch: set `aria-hidden="true"`, drop role + aria-label + sr-only. Used when the spinner sits next to a separately-labeled message and would otherwise duplicate the announcement.

Respect consumer-supplied `role` / `aria-label` via `??` so explicit overrides always win.

```tsx
const isDecorative = label === '';

return (
  <span
    role={consumerRole ?? (isDecorative ? undefined : 'status')}
    aria-label={consumerAriaLabel ?? (isDecorative ? undefined : (label ?? 'Loading'))}
    aria-hidden={isDecorative ? 'true' : undefined}
    className={spinnerVariants({ variant, size })}
  >
    {!isDecorative && <span className="sr-only">{label ?? 'Loading'}</span>}
  </span>
);
```

Pattern generalizes to any future "active status / progress" atom that can either stand alone or be embedded inside an already-labeled container.

## Multi-thumb primitives (Slider)

Multi-thumb Radix primitives (`Slider`, future `RangeSlider`-style atoms) put `role="slider"` on the inner thumb `<span>`, NOT on the Root. The `aria-label` / `aria-labelledby` a consumer passes to the wrapper lands on the Root by default and is invisible to axe's `aria-input-field-name` rule.

The wrapper MUST destructure `aria-label` / `aria-labelledby` from props and forward them onto every rendered thumb, otherwise:

- `getByRole('slider', { name: '...' })` returns null.
- axe flags every thumb.

For range sliders, expose `thumbAriaLabels?: string[]` so each thumb can have a semantically distinct name (e.g. `['Min', 'Max']`).

See [../radix-wrappers/SKILL.md](../radix-wrappers/SKILL.md) for the full pattern and the `Tabs` / `RadioGroup` / `ToggleGroup` generalization (whenever the role is on a sub-element generated by the wrapper, propagate the accessible name there).

## Decorative Radix primitives (Separator)

Some Radix primitives accept a `decorative` boolean (e.g. `Separator`) that flips the rendered role between `role="separator"` (semantic, with `aria-orientation` on vertical) and `role="none"` (visual-only, dropped from the a11y tree).

- Default `decorative={true}` to match shadcn's convention.
- Expose the prop so consumers can opt into semantic dividers when the divider carries meaning (e.g. between distinct content regions).

Tests use `getByRole('separator')` for the `decorative=false` branch and `container.querySelector('[data-slot=...]')` for the `decorative=true` branch (since `role="none"` makes the element unfindable via role queries).

## Default focus-visible ring

Every interactive atom's base class block should include:

```ts
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
```

(or the focus-ring particle from `src/particles/mixins.ts` if the project standardizes one). Use `focus-visible:` rather than `focus:` so the ring only appears on keyboard focus, not on mouse interaction — matches platform conventions and reduces visual noise.

For wrapper-frame atoms (Input pattern), use `focus-within:ring-*` on the wrapper instead of `focus:ring-*` on the inner control. See [../radix-wrappers/SKILL.md](../radix-wrappers/SKILL.md) for the wrapper-frame pattern.

## Accessibility-related utilities

Tailwind v4 ships these by default — no `@theme` additions needed:

- `sr-only` — visually hidden, exposed to assistive tech.
- `not-sr-only` — counterpart for breakpoint-conditional reveal.

Use `sr-only` for any visually-hidden label text (Spinner's `sr-only` label, icon-button text alternatives, etc.).

## When `jsx-a11y` lints flag something the runtime accepts

`jsx-a11y` is a **static-analysis** rule set and does NOT see through custom components. The most common case is `jsx-a11y/label-has-associated-control` firing on `<label><Input/></label>` even though `<Input>` renders an `<input>` at runtime.

**Fix:** prefer the `htmlFor` / `id` pairing over JSX nesting in tests and stories:

```tsx
// Lint-friendly:
<label htmlFor="email">Email</label>
<Input id="email" />

// Lint-hostile (even though it works at runtime):
<label>Email<Input /></label>
```

The runtime label-association still works either way.

Another recurring case is `jsx-a11y/click-events-have-key-events` (and its sibling `jsx-a11y/no-static-element-interactions`) firing on `<li role="option" onClick={…}>` rows inside an `aria-activedescendant` listbox. In that pattern keyboard focus parks on the search Input (or the combobox trigger), not on each option — pressing Enter is handled by the focused element's `onKeyDown`, not by per-row listeners. Adding a stub `onKeyDown` to satisfy the rule would create a phantom interactive surface that confuses screen readers.

**Fix:** apply a focused, justified disable on the option row and link to where keyboard activation actually lives:

```tsx
// eslint-disable-next-line jsx-a11y/click-events-have-key-events -- aria-activedescendant pattern parks focus on the search Input; keyboard activation lives there (Enter in handleSearchKeyDown), not per-option.
<li
  role="option"
  onClick={() => handleSelectValue(item.value)}
  onMouseEnter={() => setFocusedValue(item.value)}
  …
>
```

Combobox is the canonical reference. The same exception applies to any listbox / autocomplete / custom-select / tree-grid that uses `aria-activedescendant` to project focus onto a non-tabbable child.
