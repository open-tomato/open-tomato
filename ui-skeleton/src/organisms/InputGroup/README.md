# InputGroup

Composition-only organism that frames a single `<input>` plus optional
`leading` and `trailing` slot atoms (Button, Kbd, Avatar, Badge, etc.)
inside a single shared wrapper-frame. The bordered surface, focus ring,
height, and horizontal padding are owned by the outer wrapper via the
shared `wrapperFrameVariants` particle; the inner control is rendered as
a native `<input>` styled with the same `inputControlVariants` cva the
Input atom uses for its internal control. Authored from scratch — no
Radix dependency, no portal.

## Import

```ts
import { InputGroup } from '@open-tomato/ui-skeleton';
```

## Props

| Prop     | Type                   | Default |
| -------- | ---------------------- | ------- |
| size     | `'sm' \| 'md' \| 'lg'` | `'md'`  |
| invalid  | `boolean`              | `false` |
| leading  | `ReactNode`            | —       |
| trailing | `ReactNode`            | —       |

All other native `<input>` attributes (`name`, `value`, `defaultValue`,
`onChange`, `placeholder`, `disabled`, `type`, `aria-label`,
`aria-describedby`, etc.) are forwarded to the inner `<input>`. The
forwarded `ref` lands on the inner `<input>`. `className` is not a public
prop on InputGroup — styling is controlled exclusively through `size` and
`invalid`.

## Variants

| size | Frame height | Frame padding-x | Addon text size |
| ---- | ------------ | --------------- | --------------- |
| `sm` | `h-8`        | `px-2.5`        | `text-xs`       |
| `md` | `h-9`        | `px-3`          | `text-sm`       |
| `lg` | `h-10`       | `px-3.5`        | `text-base`     |

| invalid | wrapper-frame.variant | aria-invalid |
| ------- | --------------------- | ------------ |
| `false` | `default`             | unset        |
| `true`  | `error`               | `true`       |

The resolved axes are reflected on the rendered root as
`data-slot="input-group-root"` plus `data-size="<name>"`. `data-invalid`
is present (as an empty attribute) when `invalid` is `true`. Slot wrappers
expose `data-slot="input-group-leading" | "input-group-control" |
"input-group-trailing"`.

## Composition

- **Composed atom primitives.** The `Input` atom's particles — the shared
  `wrapperFrameVariants` particle (border, focus-ring, padding, height)
  and the `inputControlVariants` cva (transparent inner control styling)
  — are the visual primitives. The inner control is rendered as a native
  `<input>` styled with `inputControlVariants` rather than as a nested
  `<Input />` element because InputGroup needs a SINGLE outer frame
  around both the input control AND the slot atoms; rendering the Input
  atom inside would produce a nested frame plus a redundant focus-within
  ring on the inner wrapper. Structurally, InputGroup is analogous to
  the Input atom — both consume the wrapper-frame particle for the outer
  frame and the input-control variants for the inner native control —
  and adds `leading` / `trailing` slot atoms on either side of the
  control under the same shared border.
- **Variant propagation via lookup tables.** The organism owns the
  mapping from its own axes to the wrapper-frame particle's axes:

  ```ts
  const variantForInvalid = {
    true: 'error',
    false: 'default',
  } as const;
  ```

  `size` passes through to `wrapperFrameVariants.size` and to
  `inputGroupAddonVariants.size`. `invalid` maps to
  `wrapperFrameVariants.variant` (selecting the destructive border and
  focus-ring color). The same `invalid` value also flips the native
  `<input>`'s `aria-invalid` to `'true'` unless the consumer overrides
  it explicitly — the override is preserved.
- **No `className` flows downward.** Neither the outer wrapper nor the
  slot wrappers accept a consumer-supplied `className`. `'className'` is
  in the props interface's `Omit<...>` clause so it cannot reach the
  rendered root via `{...rest}`. Slot atoms (Button, Kbd, Avatar, Badge)
  retain their own internal styling — InputGroup renders slot content
  raw inside the `<span>` slot wrapper and does not inject styling into
  consumer-supplied nodes.
- **Slot prop vocabulary.** `leading` and `trailing` — both `ReactNode`,
  both wrapped in `<span data-slot="input-group-leading" | "input-group-trailing">`
  via `inputGroupAddonVariants` so the content aligns to the frame's
  vertical center and inherits the size-aware text scale. The wrappers
  are NOT rendered when the slot prop is `undefined` or `null` (the
  organism short-circuits the render).
- **Layer-import direction.** InputGroup imports `inputControlVariants`
  from `@/atoms/Input` plus `wrapperFrameVariants` from
  `@/particles/wrapper-frame.variants` and `cn` from `@/particles/cn`. It
  does NOT import other organisms, templates, pages, or providers —
  enforced by the `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- The outer wrapper-frame's `focus-within:ring-*` fires when focus enters
  any descendant (the inner native `<input>` or an interactive slot atom
  like a trailing `Button`). Result: a single shared focus indicator for
  the whole group, regardless of which sub-element is focused.
- The inner native `<input>` receives the forwarded `ref` and all native
  `aria-*` attributes spread from props (`aria-label`,
  `aria-labelledby`, `aria-describedby`, `aria-invalid`,
  `aria-errormessage`, etc.). Consumers MUST provide an accessible name
  for the inner input — either through an external `<label htmlFor>` /
  `<Label htmlFor>` paired with an `id`, an `aria-label`, or an
  `aria-labelledby` reference. InputGroup does NOT render a `<label>`
  itself; pair it with the `Field` organism when you need automatic
  label / control wiring.
- When `invalid` is `true`, the inner input's `aria-invalid` is set to
  `'true'` automatically. The consumer may override this by passing
  `aria-invalid` explicitly (e.g., `aria-invalid={false}` to suppress
  the assistive-tech announcement while preserving the destructive
  border for visual cue) — the override always wins.
- Slot atoms passed via `leading` / `trailing` keep their own ARIA
  semantics. A decorative icon should be `aria-hidden`; an actionable
  Button (e.g., a trailing "Apply" button) should keep its accessible
  name via children, `aria-label`, or `aria-labelledby`. InputGroup
  does NOT wrap slot atoms in `aria-hidden` — that's the consumer's
  call, scoped per atom.
- The `disabled` state is forwarded to the native `<input>`. The shared
  wrapper-frame's `has-[input:disabled]:cursor-not-allowed
  has-[input:disabled]:opacity-50` selectors visually dim the whole
  group (including slot atoms) when the inner input is disabled.

## Do / Don't

- DO tune visuals through `size` and `invalid`. DO compose with a parent
  wrapper (the `Field` organism for label association, or a custom
  `<form>` row for surrounding layout).
- DO provide an accessible name for the inner input via external
  `<Label htmlFor>`, `aria-label`, or `aria-labelledby`. InputGroup is
  intentionally label-less; pair it with `Field` when you need automatic
  label-to-control wiring with description and error message slots.
- DO use the slots for actionable atoms (Button to submit / search /
  apply, Kbd to display a keyboard shortcut, Avatar for an account
  indicator, Badge for a status label). The shared frame keeps everything
  visually unified.
- DON'T pass `className` to InputGroup or to the slot atoms via styling
  shortcuts. Both InputGroup and the composed atoms reject `className`
  at the type level. If a styling knob is missing, add a variant axis
  on the atom OR on InputGroup.
- DON'T render an `Input` atom (or another InputGroup) inside the
  `leading` / `trailing` slots. The slots are for non-input atoms (Button,
  Kbd, Avatar, Badge). For a second input control, render a second
  InputGroup adjacent in the layout.
- DON'T set `aria-invalid` on the inner input manually AND set
  `invalid={true}` with conflicting values. The `invalid` prop is the
  public contract; the explicit `aria-invalid` override is reserved for
  the rare case where the consumer needs to decouple the visual error
  state from the assistive-tech announcement.
