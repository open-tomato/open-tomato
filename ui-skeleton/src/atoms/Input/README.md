# Input

Single-entry wrapper that frames a native `<input>` with optional `leadingIcon` and `trailingIcon` slots. The visible frame (border, padding, focus ring) is the wrapping `<div>`; the inner `<input>` is transparent and forwards the ref.

## Import

```ts
import { Input } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                       | Default     |
| ------------- | ------------------------------------------ | ----------- |
| variant       | `'default' \| 'error' \| 'success'`        | `'default'` |
| size          | `'sm' \| 'md' \| 'lg'`                     | `'md'`      |
| leadingIcon   | `ReactNode`                                | —           |
| trailingIcon  | `ReactNode`                                | —           |
| type          | `string` (any HTML input type)             | `'text'`    |
| disabled      | `boolean`                                  | `false`     |
| className     | `string` (escape hatch, applied to root)   | —           |

All other native `<input>` attributes (`name`, `value`, `defaultValue`, `placeholder`, `onChange`, `aria-*`, `data-*`, etc.) and the forwarded `ref` are applied to the inner `<input>`. `className` is the only prop that targets the visible wrapper.

## Variants

| variant     | Visual                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| `default`   | `border-input` with `ring-ring` on focus                                     |
| `error`     | `border-destructive` with `ring-destructive` on focus; auto `aria-invalid`   |
| `success`   | `border-emerald-500` with `ring-emerald-500` on focus                        |

| size   | Rendered                                |
| ------ | --------------------------------------- |
| `sm`   | 32 px tall, `text-xs`, 10 px padding-x  |
| `md`   | 36 px tall, `text-sm`, 12 px padding-x  |
| `lg`   | 40 px tall, `text-base`, 14 px padding-x|

The resolved variants are reflected on the root frame as `data-variant="<name>"` and `data-size="<name>"`. The rendered DOM uses `data-slot="input-root" | "input-leading-icon" | "input-control" | "input-trailing-icon"` so consumers and tests can target each section without relying on class strings.

## Accessibility

- The inner element is a native `<input>` with full keyboard support; `disabled` blocks interaction and the wrapper visually dims via Tailwind's `:has()` selector.
- When `variant="error"`, the inner input automatically receives `aria-invalid="true"`. Pass `aria-invalid={false}` (or any explicit value) to override.
- `leadingIcon` and `trailingIcon` are rendered as `aria-hidden` siblings of the input; treat them as decorative glyphs only and rely on `aria-label` / `<label>` / placeholder for the accessible name.
- Wrap the component in a `<label>` (or supply `id` + `htmlFor`, or pass `aria-label`) to give the field an accessible name.

## Do / Don't

- DO control visual state through `variant` and `size`. DON'T pass arbitrary `className` to override colors or dimensions.
- DO supply an accessible label (`<label>`, `aria-label`, or `aria-labelledby`). DON'T rely on the placeholder alone — placeholders disappear once the user types.
- DO use `leadingIcon` / `trailingIcon` for decorative glyphs that hint at the input's purpose. DON'T put interactive controls (buttons, links) inside the icon slots — they are `aria-hidden`.
- DO use `variant="error"` together with a visible error message rendered elsewhere. DON'T rely on color alone to communicate validity.
