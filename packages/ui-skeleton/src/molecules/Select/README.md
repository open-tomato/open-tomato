# Select

Portal-based molecule that wraps Radix's Select primitive into a single
encapsulated component. Pairs a wrapper-frame styled trigger (visually
aligned with the `Input` atom) with a portaled listbox whose items render
through the `Typography` atom.

## Import

```ts
import { Select, type SelectItemDescriptor } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                                            | Default        |
| ------------- | --------------------------------------------------------------- | -------------- |
| items         | `SelectItemDescriptor[]` (required)                             | —              |
| placeholder   | `ReactNode`                                                     | —              |
| variant       | `'default' \| 'error' \| 'success'`                             | `'default'`    |
| size          | `'sm' \| 'md' \| 'lg'`                                          | `'md'`         |
| density       | `'comfortable' \| 'compact'`                                    | `'comfortable'`|
| tone          | `'neutral' \| 'subtle' \| 'inverted'`                           | `'neutral'`    |
| trigger       | `React.ReactElement` (optional override of the default trigger) | —              |
| triggerProps  | `Omit<RadixTriggerProps, 'className' \| 'children'>`            | —              |
| contentProps  | `Omit<RadixContentProps, 'className' \| 'children'>`            | —              |
| value / defaultValue / onValueChange | Forwarded to Radix `Root`                       | —              |
| open / defaultOpen / onOpenChange    | Forwarded to Radix `Root`                       | —              |

`className` is not a public prop — styling is controlled exclusively
through `variant`, `size`, `density`, and `tone`. The `triggerProps` and
`contentProps` bags explicitly exclude `className` so no escape hatch
leaks into the trigger or the portaled listbox.

### `SelectItemDescriptor`

Discriminated union, narrowed by the `type` field:

```ts
type SelectItemDescriptor =
  | {
      type: 'item';
      value: string;
      label?: React.ReactNode;
      disabled?: boolean;
      textValue?: string;
    }
  | { type: 'separator' };
```

`value` MUST be unique within the Select — it backs the form value and
doubles as the React key. When `label` is omitted, `value` is used as
the rendered label. Provide `textValue` when the label contains
non-text nodes (icons, badges) and Radix's typeahead needs an explicit
string.

## Variants

The trigger inherits its frame from the shared `wrapperFrameVariants`
particle, so a Select dropped next to an Input renders with the
identical frame at every axis combination. Per-axis behavior:

| Axis     | Values                              | Effect on trigger                                |
| -------- | ----------------------------------- | ------------------------------------------------ |
| variant  | `default` \| `error` \| `success`   | Border + ring color                              |
| size     | `sm` \| `md` \| `lg`                | Height, horizontal padding, font size            |
| density  | `comfortable` \| `compact`          | Compact overrides size-derived height            |
| tone     | `neutral` \| `subtle` \| `inverted` | Border / background / foreground treatment       |

The portaled Content additionally carries:

- `data-slot="select-content"` and `data-size` on the Content root.
- `data-state="open" \| "closed"`, `data-side`, and `data-align` after
  Radix runs collision detection. Width matches the trigger via the
  `--radix-select-trigger-width` CSS variable.
- `data-slot="select-item"` and `data-size` on each option row, plus
  `data-disabled=""` and `data-highlighted=""` from Radix.
- `data-slot="select-item-label"` and `data-variant="body"` on the
  Typography wrapper inside each item.
- `data-slot="select-separator"` on each divider.
- `data-slot="select-value"` on the Radix Value element and
  `data-slot="select-chevron"` on the trailing chevron icon.

## Composition

- **Composed atoms:** `Typography` (`variant="body"`, `as="span"`) wraps
  each item's label so the listbox text inherits the atom-driven scale.
  The trigger uses the shared `wrapperFrameVariants` particle directly —
  no atom composition for the frame because Input, Textarea, and Select
  all source the frame from the same particle.
- **Trigger pattern.** By default the molecule renders its own
  `<RadixSelect.Trigger>` styled by `selectTriggerVariants`. Pass
  `trigger={...}` (a single `React.ReactElement`) to opt out — the
  molecule then wraps it via `<RadixSelect.Trigger asChild>` and the
  visual axes (`variant`, `size`, `density`, `tone`) become no-ops
  because the consumer's element owns the appearance.
- **No `className` flows downward.** The composed `Typography` atom
  rejects `className` at the type level. The `triggerProps` and
  `contentProps` bags explicitly omit `'className'` so consumers cannot
  inject styling into the trigger or the portaled listbox. If a styling
  knob is missing, add a variant axis.
- **Layer-import direction.** Select imports `@/atoms/Typography`,
  `@/particles/cn`, and `@/particles/wrapper-frame.variants` (plus
  `@radix-ui/react-select` and `lucide-react`). It does NOT import other
  molecules, organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- The trigger carries Radix's `role="combobox"`, `aria-expanded`, and
  `aria-controls`. It MUST have an accessible name — pass `aria-label`
  via `triggerProps={{ 'aria-label': '...' }}` or wire `aria-labelledby`
  to a visible label.
- The portaled Content is a `role="listbox"`. Pass
  `contentProps={{ 'aria-label': '...' }}` describing what the listbox
  selects from — axe flags an unnamed listbox as a violation.
- Each item carries `role="option"` and `aria-selected`. Disabled items
  expose `data-disabled=""` and Radix renders them as unreachable via
  pointer; the listbox keyboard navigation still moves through them so
  screen readers can announce the disabled state.
- Form integration: Radix renders a hidden native `<select>` shadow with
  the same `name` and `value` so the Select submits with surrounding
  `<form>` elements without additional wiring.

## Do / Don't

- DO supply an accessible name to the trigger via
  `triggerProps={{ 'aria-label': '...' }}` or by wiring a visible
  `<label htmlFor>` to `triggerProps.id`. DON'T leave the combobox
  unnamed — screen readers and axe will both flag it.
- DO supply an accessible name to the listbox via
  `contentProps={{ 'aria-label': '...' }}` so the open listbox has a
  usable announcement. DON'T leave it unnamed.
- DO tune visuals through `variant`, `size`, `density`, and `tone`.
  DON'T pass `className` to Select or to the composed Typography.
- DO use `separator` entries to group large item lists. DON'T mix
  separators at the start or end of `items` — they render as visible
  dividers in those positions.
- DO override the entire trigger via `trigger={...}` only when the
  product genuinely needs a non-input-shaped affordance (e.g. a chip,
  an avatar-stack, an icon-only button). DON'T use the override to
  smuggle styling around the wrapper-frame — when the visual rules
  diverge, add an axis to the particle so every input-shaped surface
  stays aligned.
