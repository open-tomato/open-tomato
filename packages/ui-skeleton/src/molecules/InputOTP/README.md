# InputOTP

Single-encapsulated wrapper around the `input-otp` package. Renders N visual
slot cells over one hidden native `<input>` so SMS autofill, paste, and
keyboard navigation work out of the box, while the slot row keeps the rest
of the design system's visual language.

## Import

```ts
import { InputOTP } from '@open-tomato/ui-skeleton';
```

## When to use

- Verification codes (email, SMS, authenticator app).
- Short alphanumeric tokens entered character-by-character.
- Anywhere `autoComplete="one-time-code"` is the right signal for the
  device's OTP autofill UI.

For long passcodes or PII entry, reach for the plain `Input` atom instead —
OTP slot UI sets expectations about expected length and per-character feedback.

## Props

| Prop          | Type                                | Default              |
| ------------- | ----------------------------------- | -------------------- |
| length        | `'4' \| '6' \| '8'`                 | `'6'`                |
| size          | `'sm' \| 'md' \| 'lg'`              | `'md'`               |
| invalid       | `boolean`                           | `false`              |
| value         | `string`                            | —                    |
| defaultValue  | `string`                            | —                    |
| onChange      | `(newValue: string) => void`        | —                    |
| onComplete    | `(value: string) => void`           | —                    |
| inputMode     | native `inputMode`                  | `'numeric'`          |
| autoComplete  | native `autoComplete`               | `'one-time-code'`    |
| pattern       | regex source                        | `^\d+$` (digits)     |
| disabled      | `boolean`                           | `false`              |

All other native `<input>` attributes (`name`, `aria-*`, `data-*`, `onPaste`,
`onFocus`, `onBlur`, etc.) and the forwarded `ref` are applied to the inner
hidden `<input>`. `className` is not a public prop — styling is controlled
exclusively through the `length` and `size` variant axes.

## Variants

| Axis    | Values                | Effect                                                                            |
| ------- | --------------------- | --------------------------------------------------------------------------------- |
| length  | `'4' \| '6' \| '8'`   | Number of rendered slot cells and the hidden input's `maxLength`                  |
| size    | `'sm' \| 'md' \| 'lg'`| Slot height, width, and font size                                                 |

The resolved axes are reflected on the rendered root as `data-length` and
`data-size`. Each rendered slot carries `data-slot="input-otp-slot"`,
`data-index`, `data-size`, optionally `data-active="true"` (the slot
containing the caret), and optionally `data-invalid="true"`. The hidden
input carries `data-slot="input-otp-control"`.

Setting `invalid` flips slot borders and active-state rings to the
destructive color and adds `aria-invalid="true"` on the hidden input. Pair
with a visible error message rendered elsewhere — color alone is
insufficient.

## Composition

- **Composed atoms:** none. The slot cells are rendered directly inside the
  molecule via the `inputOtpSlotVariants` cva, mirroring the descendant-cell
  styling pattern used for `Table` and `NativeSelect`. Atoms reject
  `className`, so trying to compose `Input` atoms here would re-open the
  escape hatch through them — single-character cells aren't `Input` atoms in
  any meaningful sense (the real input is the single hidden one underneath).
- **No `className` flows downward.** The `containerClassName` and `className`
  channels on `OTPInput` are populated exclusively from the molecule's own
  variant calls; the public props interface omits `'className'` so consumers
  can't supply one.
- **Hidden input ownership.** `input-otp` owns the focus / paste / caret
  behaviour. The molecule sets defaults that are right for numeric OTP
  (`inputMode="numeric"`, `autoComplete="one-time-code"`,
  `pattern={REGEXP_ONLY_DIGITS}`) and surfaces them as overridable props for
  alphanumeric codes.
- **Layer-import direction.** InputOTP imports `@/particles/cn` plus
  `input-otp`. It does NOT import other molecules, organisms, templates,
  pages, or providers — enforced by the `no-restricted-imports` rule in
  `eslint.config.mjs`.

## Accessibility

- The hidden input is a real `<input>` with role `textbox`; full keyboard
  support, screen-reader support, and form submission semantics carry over.
- Provide an accessible name via a wrapping `<label htmlFor>`, an
  `aria-label`, or `aria-labelledby` on the molecule — the molecule does not
  generate one. The label/aria attrs land on the hidden input via the
  forwarded props.
- `disabled` blocks interaction and the slot row dims via Tailwind's
  `:has()` selector on the root.
- When `invalid` is set, the hidden input receives `aria-invalid="true"`.
  Override explicitly via the `aria-invalid` prop when the invalid flag is
  set but the input is in a "pending validation" state where you don't want
  to surface the error to assistive tech yet.
- The caret bar painted inside the active slot is decorative
  (`aria-hidden`); the real caret on the hidden input is suppressed visually
  via `input-otp`'s built-in styles.

## Do / Don't

- DO control visual state through `length` and `size`. DO compose with a
  parent wrapper for sizing/positioning concerns (margins, alignment) — the
  wrapper is the right surface for layout, not the InputOTP.
- DO supply an accessible label (`<label htmlFor>`, `aria-label`, or
  `aria-labelledby`). DON'T leave the input unnamed — screen readers and
  axe will both flag it.
- DO use `length="4"` for short authenticator-app codes and `length="8"` for
  recovery codes. DON'T render `length="6"` when the underlying service
  issues a 4-digit code — the extra empty slots mislead users about the
  expected length.
- DO pair `invalid` with a visible error message rendered elsewhere. DON'T
  rely on color alone to communicate validity.
- DO override `inputMode` / `autoComplete` / `pattern` for alphanumeric OTP
  codes (`pattern="^[a-zA-Z0-9]+$"`, `inputMode="text"`). DON'T leave the
  numeric defaults in place when the service issues mixed-case codes — the
  numeric keyboard locks them out on mobile.
- DO use the controlled `value` + `onChange(newValue)` shape (input-otp's
  `onChange` receives the new value directly, not a React change event).
  DON'T attempt to assign `event.target.value` — the molecule already
  bridges the signature.
