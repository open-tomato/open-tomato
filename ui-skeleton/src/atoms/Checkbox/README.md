# Checkbox

Single-entry wrapper over Radix `@radix-ui/react-checkbox`. Folds the Radix
root and indicator into one component driven by the `size` variant, with an
optional inline `label` slot.

## Import

```ts
import { Checkbox } from '@open-tomato/ui-skeleton';
```

## Props

| Prop              | Type                                                          | Default |
| ----------------- | ------------------------------------------------------------- | ------- |
| size              | `'sm' \| 'md' \| 'lg'`                                        | `'md'`  |
| label             | `ReactNode`                                                   | —       |
| checked           | `boolean \| 'indeterminate'`                                  | —       |
| defaultChecked    | `boolean \| 'indeterminate'`                                  | —       |
| onCheckedChange   | `(checked: boolean \| 'indeterminate') => void`               | —       |
| disabled          | `boolean`                                                     | `false` |
| required          | `boolean`                                                     | `false` |
| name              | `string`                                                      | —       |
| value             | `string`                                                      | —       |
| id                | `string` (auto-generated when `label` is set and `id` omitted) | —       |
| className         | `string` (discouraged escape hatch)                           | —       |

All other props are forwarded to the underlying Radix Checkbox root.

## Variants

| size | Box size  | Icon size |
| ---- | --------- | --------- |
| `sm` | `size-4`  | `size-3`   |
| `md` | `size-5`  | `size-3.5` |
| `lg` | `size-6`  | `size-4`   |

The resolved size is reflected on the rendered button as `data-size="<name>"`.
The checkmark uses a `Check` icon when checked and a `Minus` icon when the
state is `indeterminate`. Radix sets `data-state="checked" | "unchecked" |
"indeterminate"` on the trigger (and `data-state` on the indicator) for
downstream styling and testing.

When `label` is provided the wrapper renders inside an inline-flex container
that exposes `data-slot="checkbox-root"`; the label element exposes
`data-slot="checkbox-label"`.

## Accessibility

- Renders a native `<button>` with `role="checkbox"` and the appropriate
  `aria-checked` value (including `mixed` for `indeterminate`).
- When `label` is provided, an auto-generated `id` links the checkbox to a
  `<label>` element via `htmlFor`; clicking the label toggles the checkbox.
- When `label` is omitted, supply `aria-label` or `aria-labelledby` so the
  checkbox has an accessible name.
- The label respects the checkbox's disabled state via the `peer-disabled`
  modifier (dimmed text and `not-allowed` cursor).

## Do / Don't

- DO use `size` to tune appearance. DON'T pass arbitrary `className` to
  override sizing, border, or color.
- DO use the `label` prop for the common checkbox + label pair. DON'T omit
  both `label` and `aria-label[ledby]` — the checkbox still needs an
  accessible name.
- DO use `checked="indeterminate"` for tri-state controls (e.g. a "select
  all" header row). DON'T mix `checked` (controlled) with `defaultChecked`
  (uncontrolled).
