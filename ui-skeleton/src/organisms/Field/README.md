# Field

Composition-only organism that frames a single form control by composing the
`Label` and `Input` atoms with an optional description / error message rendered
through the `Typography` atom. Generates the `id` / `htmlFor` /
`aria-describedby` wiring automatically via `React.useId()`; a consumer
`id` prop overrides the auto-generated base. Authored from scratch — no Radix
dependency, no portal.

## Import

```ts
import { Field } from '@open-tomato/ui-skeleton';
```

## Props

| Prop        | Type                                                | Default        |
| ----------- | --------------------------------------------------- | -------------- |
| size        | `'sm' \| 'md' \| 'lg'`                              | `'md'`         |
| invalid     | `boolean`                                           | `false`        |
| id          | `string`                                            | `useId()`      |
| label       | `ReactNode`                                         | —              |
| description | `ReactNode` (Typography `variant="caption"`)        | —              |
| error       | `ReactNode` (Typography `variant="caption"`)        | —              |
| leading     | `ReactNode` (passed to `Input.leadingIcon`)         | —              |
| trailing    | `ReactNode` (passed to `Input.trailingIcon`)        | —              |
| required    | `boolean` (forwarded to Label + native input)       | `false`        |

All other native `<input>` attributes (`name`, `value`, `defaultValue`,
`onChange`, `placeholder`, `disabled`, `type`, `aria-*`, etc.) are forwarded
to the inner `<input>`. The forwarded `ref` lands on the inner `<input>`.
`className` is not a public prop on Field — styling is controlled exclusively
through `size` and `invalid`.

## Variants

| size | Label.size | Input.size | Root gap |
| ---- | ---------- | ---------- | -------- |
| `sm` | `sm`       | `sm`       | `gap-1`   |
| `md` | `md`       | `md`       | `gap-1.5` |
| `lg` | `lg`       | `lg`       | `gap-2`   |

| invalid | Input.variant | aria-invalid |
| ------- | ------------- | ------------ |
| `false` | `default`     | unset        |
| `true`  | `error`       | `true`       |

The resolved variants are reflected on the rendered root as
`data-slot="field-root"` plus `data-size="<name>"`. `data-invalid` is present
(as an empty attribute) when `invalid` is `true`. Slots expose
`data-slot="field-label" | "field-description" | "field-error"`. The composed
Input's own `data-slot="input-root"` / `data-variant` / `data-size` are
visible from the rendered tree for testing.

## Composition

- **Composed atoms:** `Label` renders the label row (`htmlFor` paired to the
  Input's `id`), `Input` renders the field (including the `leading` /
  `trailing` icon slots passed through to `Input.leadingIcon` /
  `Input.trailingIcon`), and `Typography` (`variant="caption"`) renders the
  optional description and error messages.
- **Variant propagation via lookup tables.** The organism owns the mapping
  from its own axes to each composed atom's axes:

  ```ts
  const labelSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const inputSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const inputVariantForInvalid = { true: 'error', false: 'default' } as const;
  ```

  `size` is passed through to both `Label.size` and `Input.size`. `invalid`
  maps to `Input.variant` (which in turn flips the inner `<input>`'s
  `aria-invalid` automatically — see Input's `resolvedAriaInvalid`). The
  error-tone tint on the error message is owned by the organism's own
  `fieldMessageVariants` cva, which uses a descendant selector
  (`[&_[data-slot=typography]]:text-destructive`) to override Typography's
  caption color without passing `className` downward.
- **No `className` flows downward.** `Label`, `Input`, and `Typography` all
  reject `className` at the type level. If a knob the variants don't cover is
  needed, add a variant axis on the atom OR on Field — don't open an escape
  hatch.
- **Slot prop vocabulary.** `label`, `description`, `error`, `leading`,
  `trailing`. The `leading` / `trailing` slots are forwarded as-is to
  `Input.leadingIcon` / `Input.trailingIcon` (which wrap them in
  `aria-hidden` spans). The `description` / `error` slots are wrapped in
  `<span data-slot="field-description">` / `<span data-slot="field-error">`
  with stable ids so the inner Input's `aria-describedby` can reference them.
- **`React.useId()` pairing with consumer override.** A stable id is
  generated on mount; the `id` prop overrides the auto-generated base. The
  description and error message ids are derived as `<id>-description` and
  `<id>-error`. Both are appended to the input's `aria-describedby` (a
  consumer-supplied `aria-describedby` is preserved and appended to).
- **Layer-import direction.** Field imports `@/atoms/Label`, `@/atoms/Input`,
  `@/atoms/Typography`, and `@/particles/cn`. It does NOT import other
  organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- The Label's `htmlFor` and the Input's `id` are always paired — generated
  via `React.useId()` or set from the `id` prop. This produces a programmatic
  label association even when the consumer does not pass `id`.
- The description and error message ids are appended to the input's
  `aria-describedby` so assistive tech announces them when the input receives
  focus. A consumer-supplied `aria-describedby` is preserved and the
  auto-derived ids are appended after it (order: consumer, description,
  error).
- When `invalid` is `true`, the inner Input atom's `variant="error"` sets
  `aria-invalid="true"` on the native `<input>` automatically. The error
  message is rendered with the destructive tone but is announced via
  `aria-describedby` (not `role="alert"`) — consumers that need an assertive
  live-region announcement on first display should wrap the field in
  `<div role="alert" aria-live="assertive">` themselves.
- When `required` is `true`, the Label atom renders a visual `*` indicator
  and the native `<input>` receives the `required` attribute (which sets
  `aria-required="true"` implicitly in browsers / assistive tech).
- The `leading` and `trailing` slots are wrapped by the Input atom in
  `aria-hidden` spans — icons are decorative. Convey meaning through the
  label and description text, not the icon alone.

## Do / Don't

- DO tune visuals through `size` and `invalid`. DO compose with a parent
  wrapper (a `<form>` or a grid layout) for sizing or positioning concerns.
- DO pass `id` when the field's id needs to be stable across renders for
  external form libraries (React Hook Form's `register`, Formik). Otherwise
  omit `id` and let `React.useId()` generate one.
- DO set `invalid` together with `error` so the input frame, `aria-invalid`,
  and the rendered error message all agree. The two axes are independent in
  the API (so `error` can render as plain helper text when `invalid={false}`
  or `invalid` can flag the input without an error message), but the common
  case pairs them.
- DON'T pass `className` to Field or to any composed atom — atoms reject it
  at the type level. If a styling knob is missing, add a variant axis.
- DON'T render a `<label>` inside the `label` slot — the Label atom already
  renders one. Pass plain text or inline `ReactNode` and let the Label
  variant pick the size.
- DON'T render Typography or another paragraph element inside the
  `description` / `error` slots — Field wraps the content in Typography
  already, and nesting block elements inside a `<span>` is invalid HTML.
