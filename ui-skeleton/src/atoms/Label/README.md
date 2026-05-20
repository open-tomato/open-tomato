# Label

Single-entry wrapper over Radix `@radix-ui/react-label`. Renders a native
`<label>` with design-system typography and an optional required indicator
driven by the `required` variant.

## Import

```ts
import { Label } from '@open-tomato/ui-skeleton';
```

## Props

| Prop                | Type                                | Default |
| ------------------- | ----------------------------------- | ------- |
| size                | `'sm' \| 'md' \| 'lg'`              | `'md'`  |
| required            | `boolean`                           | `false` |
| requiredIndicator   | `ReactNode`                         | `'*'`   |
| htmlFor             | `string`                            | —       |
| children            | `ReactNode`                         | —       |
| className           | `string` (discouraged escape hatch) | —       |

All other props are forwarded to the underlying Radix Label root (which
renders a native `<label>`).

## Variants

| size | Font size  |
| ---- | ---------- |
| `sm` | `text-xs`  |
| `md` | `text-sm`  |
| `lg` | `text-base` |

| required | Behavior                                                |
| -------- | -------------------------------------------------------- |
| `false`  | No marker rendered.                                      |
| `true`   | Appends a `*` (or `requiredIndicator`) with `aria-hidden`. |

The resolved size is reflected on the rendered label as `data-size="<name>"`;
when `required` is `true`, `data-required=""` is also set. The marker element
exposes `data-slot="label-required-indicator"` for downstream styling and
testing hooks.

## Accessibility

- Renders a native `<label>` — use `htmlFor` to associate it with a form
  control's `id`.
- The required indicator is decorative (`aria-hidden`). It does NOT make the
  associated control required; set `required` / `aria-required` on the input
  itself so assistive technology announces the requirement.
- The label respects the linked control's disabled state via the
  `peer-disabled` modifier when paired with a control that uses the `peer`
  class (e.g. Checkbox).
- The Radix Label primitive prevents double-firing of click events when a
  labelable element (e.g. a button) is rendered as a child.

## Do / Don't

- DO use `size` to tune typography. DON'T pass arbitrary `className` to
  override font, weight, or color.
- DO pair `required` on the Label with `required` (or `aria-required`) on the
  associated form control. DON'T rely on the asterisk alone — screen readers
  will not announce the visual marker.
- DO use `htmlFor` to link the label to a control's `id`. DON'T nest custom
  components inside the label expecting `jsx-a11y/label-has-associated-control`
  to follow through — prefer the `htmlFor` / `id` pairing.
