# Textarea

Single-entry wrapper over a native `<textarea>` with constrained `variant` and `size` axes. Adds an optional `autoResize` mode that grows the field vertically to fit its content.

## Import

```ts
import { Textarea } from '@open-tomato/ui-skeleton';
```

## Props

| Prop        | Type                                     | Default     |
| ----------- | ---------------------------------------- | ----------- |
| variant     | `'default' \| 'error' \| 'success'`      | `'default'` |
| size        | `'sm' \| 'md' \| 'lg'`                   | `'md'`      |
| autoResize  | `boolean`                                | `false`     |
| disabled    | `boolean`                                | `false`     |
| className   | `string` (escape hatch)                  | —           |

All other native `<textarea>` attributes (`name`, `value`, `defaultValue`, `rows`, `cols`, `placeholder`, `maxLength`, `onChange`, `aria-*`, `data-*`, etc.) and the forwarded `ref` are applied to the underlying element.

## Variants

| variant     | Visual                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| `default`   | `border-input` with `ring-ring` on focus                                     |
| `error`     | `border-destructive` with `ring-destructive` on focus; auto `aria-invalid`   |
| `success`   | `border-emerald-500` with `ring-emerald-500` on focus                        |

| size   | Rendered                                                |
| ------ | ------------------------------------------------------- |
| `sm`   | 60 px minimum height, `text-xs`, 10/6 px padding        |
| `md`   | 80 px minimum height, `text-sm`, 12/8 px padding        |
| `lg`   | 100 px minimum height, `text-base`, 14/10 px padding    |

The resolved variants are reflected on the rendered textarea as `data-variant="<name>"` and `data-size="<name>"`. When `autoResize` is enabled the element also carries `data-auto-resize=""` and `data-slot="textarea"`.

## `autoResize` behaviour

When `autoResize` is `true`:

- Manual user drag-to-resize is disabled (`resize-none`).
- The inner scrollbar is hidden (`overflow-hidden`).
- The textarea's height is adjusted on every change so it always fits its content.
- For controlled usage, height also re-adjusts whenever the bound `value` changes.

`autoResize` does not pin a maximum height; combine with a `className` like `max-h-[20rem]` if the textarea should stop growing past a certain limit. This is the one place where `className` is the documented sizing channel (the `min-h-*` baked into the size variant only sets the floor).

## Accessibility

- Underlying element is a native `<textarea>` with full keyboard support.
- When `variant="error"`, the textarea automatically receives `aria-invalid="true"`. Pass `aria-invalid={false}` (or any explicit value) to override.
- Always supply an accessible name via `<label htmlFor={id}>`, `aria-label`, or `aria-labelledby`.

## Do / Don't

- DO control visual state through `variant` and `size`. DON'T pass arbitrary `className` to override colors or padding.
- DO supply an accessible label. DON'T rely on the placeholder alone — placeholders disappear once the user types.
- DO use `autoResize` for chat-style inputs where the field should grow with content. DON'T combine `autoResize` with the user-drag resize handle — the variant disables it.
- DO use `variant="error"` together with a visible error message rendered elsewhere. DON'T rely on color alone to communicate validity.
