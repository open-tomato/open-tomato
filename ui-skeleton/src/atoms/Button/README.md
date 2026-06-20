# Button

Single-entry wrapper over a native `<button>` (or any element via `asChild`) with design-system `variant` and `size` controls. Polymorphism is provided by Radix `Slot`; icon slots remain functional under `asChild` via Radix `Slottable`.

## Import

```ts
import { Button } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                                                       | Default     |
| ------------- | -------------------------------------------------------------------------- | ----------- |
| variant       | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'destructive'`        | `'primary'` |
| size          | `'sm' \| 'md' \| 'lg' \| 'icon'`                                           | `'md'`      |
| asChild       | `boolean`                                                                  | `false`     |
| loading       | `boolean`                                                                  | `false`     |
| leadingIcon   | `ReactNode`                                                                | —           |
| trailingIcon  | `ReactNode`                                                                | —           |
| disabled      | `boolean`                                                                  | `false`     |
| type          | `'button' \| 'submit' \| 'reset'`                                          | `'button'`  |
| children      | `ReactNode`                                                                | —           |

All other props are forwarded to the underlying element (a `<button>`, or the single child element when `asChild` is `true`). `className` is not a public prop — styling is controlled exclusively through `variant` and `size`.

## Variants

| variant       | Visual                                                                |
| ------------- | --------------------------------------------------------------------- |
| `primary`     | Filled with `bg-primary` + `text-primary-foreground`                  |
| `secondary`   | Filled with `bg-secondary` + `text-secondary-foreground`              |
| `outline`     | `border-input` over `bg-background`, accent on hover                  |
| `ghost`       | Transparent until hover; accent surface on hover                      |
| `destructive` | Filled with `bg-destructive` + `text-destructive-foreground`          |

| size   | Rendered                              |
| ------ | ------------------------------------- |
| `sm`   | 32 px tall, 12 px horizontal padding  |
| `md`   | 36 px tall, 16 px horizontal padding  |
| `lg`   | 40 px tall, 24 px horizontal padding  |
| `icon` | 36 px square, no padding              |

The resolved variants are reflected on the rendered element as `data-variant="<name>"` and `data-size="<name>"` for downstream styling and testing. The loading flag is surfaced as `data-loading=""`.

## Accessibility

- Renders a native `<button>` and forwards `aria-*` and `data-*` passthrough.
- Defaults `type="button"` to prevent accidental form submission when nested in a `<form>`. Pass `type="submit"` explicitly for submit buttons.
- `loading` sets `data-loading=""`, `aria-busy="true"`, and `disabled` on the underlying element so assistive tech announces the in-flight state and pointer interaction is blocked.
- `asChild` merges all button props (including `data-variant`, `data-size`, `disabled`, ARIA, ref) onto the single child element via Radix `Slot`. `leadingIcon` and `trailingIcon` are siblings of the merged child via Radix `Slottable`, so polymorphism is compatible with icon slots.
- For purely-iconographic buttons (`size="icon"`), provide an `aria-label` so screen readers announce the action.

## Do / Don't

- DO tune visuals through `variant` and `size`. DO compose with a parent wrapper for sizing or positioning concerns (margins, grid placement) — the wrapper is the right surface for layout, not the Button.
- DO use `asChild` with `<a>` / `<Link>` to keep semantics correct when the button is a navigation. DON'T pass multiple children when `asChild` is `true`; provide a single child element.
- DO pass `aria-label` for `size="icon"` buttons. DON'T rely on a glyph alone for meaning.
- DO use `loading` for async actions (saving, submitting). DON'T also set `disabled` manually — `loading` already disables interaction.
