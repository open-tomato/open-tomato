# Textarea

Single-entry wrapper over a native `<textarea>` with constrained `variant`, `size`, `density`, and `tone` axes. Adds an optional `autoResize` mode that grows the field vertically to fit its content. The frame consumes the shared `wrapperFrameVariants` particle so Textarea stays visually aligned with Input, NativeSelect, and Select — with one substitution: the `density="compact"` branch swaps `h-*` for `min-h-*` so the textarea retains its multi-line affordance even when compressed.

## Import

```ts
import { Textarea } from '@open-tomato/ui-skeleton';
```

## Props

| Prop        | Type                                     | Default         |
| ----------- | ---------------------------------------- | --------------- |
| variant     | `'default' \| 'error' \| 'success'`      | `'default'`     |
| size        | `'sm' \| 'md' \| 'lg'`                   | `'md'`          |
| density     | `'comfortable' \| 'compact'`             | `'comfortable'` |
| tone        | `'neutral' \| 'subtle' \| 'inverted'`    | `'neutral'`     |
| autoResize  | `boolean`                                | `false`         |
| disabled    | `boolean`                                | `false`         |

All other native `<textarea>` attributes (`name`, `value`, `defaultValue`, `rows`, `cols`, `placeholder`, `maxLength`, `onChange`, `aria-*`, `data-*`, etc.) and the forwarded `ref` are applied to the underlying element. `className` is not a public prop — styling is controlled exclusively through the four variant axes.

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

| density       | Rendered                                                                       |
| ------------- | ------------------------------------------------------------------------------ |
| `comfortable` | Inherits the size-derived height                                               |
| `compact`     | Overrides to `min-h-7` (28 px floor) and removes vertical padding for tight rows; the textarea can still grow with content |

| tone        | Rendered                                                                |
| ----------- | ----------------------------------------------------------------------- |
| `neutral`   | Bordered field on `bg-background`                                       |
| `subtle`    | Borderless, `bg-muted/40` for embedded use inside cards or panels       |
| `inverted`  | Inverted surface (`bg-foreground` over `text-background`) for dark hero |

The resolved variants are reflected on the rendered textarea as `data-variant`, `data-size`, `data-density`, and `data-tone`. When `autoResize` is enabled the element also carries `data-auto-resize=""` and the slot marker is `data-slot="textarea"`.

## `autoResize` behaviour

When `autoResize` is `true`:

- Manual user drag-to-resize is disabled (`resize-none`).
- The inner scrollbar is hidden (`overflow-hidden`).
- The textarea's height is adjusted on every change so it always fits its content.
- For controlled usage, height also re-adjusts whenever the bound `value` changes.

`autoResize` does not pin a maximum height. To cap growth, wrap the Textarea in a parent container that constrains its height — the wrapper is the right surface for layout concerns.

## Accessibility

- Underlying element is a native `<textarea>` with full keyboard support.
- When `variant="error"`, the textarea automatically receives `aria-invalid="true"`. Pass `aria-invalid={false}` (or any explicit value) to override.
- Always supply an accessible name via `<label htmlFor={id}>`, `aria-label`, or `aria-labelledby`.

## Do / Don't

- DO control visual state through `variant`, `size`, `density`, and `tone`. DO compose with a parent wrapper for sizing or positioning concerns (widths, grid placement, margins, max-height caps) — the wrapper is the right surface for layout, not the Textarea.
- DO reach for `density="compact"` inside tight rows (toolbars, table filters, inline comment composers) and for `tone="subtle"` inside cards or panels where a bordered field would over-emphasize. DO use `tone="inverted"` only over a dark hero/backdrop.
- DO supply an accessible label (`<label>`, `aria-label`, or `aria-labelledby`). DON'T rely on the placeholder alone — placeholders disappear once the user types.
- DO use `autoResize` for chat-style inputs where the field should grow with content. DON'T combine `autoResize` with the user-drag resize handle — the variant disables it.
- DO pair `variant="error"` with a visible error message rendered elsewhere. DON'T rely on color alone to communicate validity.
