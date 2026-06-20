# NativeSelect

Single-encapsulated wrapper around a native `<select>` that frames the
control with the shared `wrapperFrameVariants` particle. The OS-default
chevron is hidden via `appearance-none` and a decorative chevron icon is
rendered as a sibling so the dropdown affordance matches the rest of the
input-shaped surfaces (Input, Textarea, Select).

## Import

```ts
import { NativeSelect, type NativeSelectOptionDescriptor } from '@open-tomato/ui-skeleton';
```

## When to use

Reach for NativeSelect (over the Radix-based Select molecule) when:

- The product needs the platform-native dropdown — mobile, kiosk, or an
  accessibility profile that depends on system widgets.
- Form-control semantics must match `<input>` / `<textarea>` exactly
  (focus order, native validation, autofill).
- The value space is short and closed.

For richer item rendering (icons-in-rows, separators between groups,
custom typography), reach for the portal-based `Select` molecule.

## Props

| Prop          | Type                                                  | Default         |
| ------------- | ----------------------------------------------------- | --------------- |
| variant       | `'default' \| 'error' \| 'success'`                   | `'default'`     |
| size          | `'sm' \| 'md' \| 'lg'`                                | `'md'`          |
| density       | `'comfortable' \| 'compact'`                          | `'comfortable'` |
| tone          | `'neutral' \| 'subtle' \| 'inverted'`                 | `'neutral'`     |
| leadingIcon   | `ReactNode`                                           | —               |
| options       | `NativeSelectOptionDescriptor[]`                      | —               |
| placeholder   | `ReactNode`                                           | —               |
| disabled      | `boolean`                                             | `false`         |

All other native `<select>` attributes (`name`, `value`, `defaultValue`,
`onChange`, `multiple` is not supported by the styling, `aria-*`,
`data-*`, etc.) and the forwarded `ref` are applied to the inner
`<select>`. `className` is not a public prop — styling is controlled
exclusively through the four variant axes.

### `NativeSelectOptionDescriptor`

Discriminated union, narrowed by the `type` field:

```ts
type NativeSelectOptionDescriptor =
  | {
      type: 'option';
      value: string;
      label?: React.ReactNode;
      disabled?: boolean;
    }
  | {
      type: 'group';
      label: string;
      options: { type: 'option'; value: string; label?: React.ReactNode; disabled?: boolean }[];
    };
```

When `options` is omitted, the molecule renders `children` instead — pass
raw `<option>` / `<optgroup>` elements when the data is statically
authored in JSX. `options` and `children` are mutually exclusive; if both
are provided, `options` wins.

## Variants

The frame inherits from the shared `wrapperFrameVariants` particle, so a
NativeSelect dropped next to an Input renders with the identical frame at
every axis combination.

| Axis     | Values                              | Effect on frame                                  |
| -------- | ----------------------------------- | ------------------------------------------------ |
| variant  | `default` \| `error` \| `success`   | Border + ring color                              |
| size     | `sm` \| `md` \| `lg`                | Height, horizontal padding, font size            |
| density  | `comfortable` \| `compact`          | Compact overrides size-derived height            |
| tone     | `neutral` \| `subtle` \| `inverted` | Border / background / foreground treatment       |

The resolved axes are reflected on the root frame as `data-variant`,
`data-size`, `data-density`, and `data-tone`. The rendered DOM uses
`data-slot="native-select-root" | "native-select-leading-icon" |
"native-select-control" | "native-select-chevron"` so consumers and tests
can target each section without relying on class strings.

When `variant="error"`, the inner `<select>` automatically receives
`aria-invalid="true"` unless an explicit value is passed.

## Composition

- **Composed atoms:** none. NativeSelect consumes the
  `wrapperFrameVariants` particle directly so the frame stays visually
  aligned with Input / Textarea / Select without going through an atom.
  The decorative chevron is `ChevronDown` from `lucide-react` and is
  rendered inside an `aria-hidden` span — it carries no interactive
  semantics.
- **No `className` flows downward.** The native `<select>` has no atom
  ancestor to forward `className` into. Internally the molecule never
  forwards a consumer-supplied class string into the variants call, and
  the props interface omits `'className'` from
  `React.SelectHTMLAttributes` so consumers cannot pass one in the first
  place.
- **Layer-import direction.** NativeSelect imports `@/particles/cn` and
  `@/particles/wrapper-frame.variants` plus `lucide-react`. It does NOT
  import other molecules, organisms, templates, pages, or providers —
  enforced by the `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- The inner element is a native `<select>` with full keyboard support;
  `disabled` blocks interaction and the wrapper visually dims via
  Tailwind's `:has()` selector.
- The decorative chevron is wrapped in `aria-hidden` and uses
  `pointer-events-none` so clicks fall through to the native select; the
  OS-default chevron is hidden via `appearance-none` to avoid double
  glyphs.
- Provide an accessible name via a wrapping `<label htmlFor>`, an
  `aria-label`, or `aria-labelledby`. The molecule does not generate one
  on its own.
- When `variant="error"`, the inner `<select>` receives
  `aria-invalid="true"`. Pair the visual treatment with a visible error
  message rendered elsewhere (color alone is insufficient).
- For a placeholder, pair `placeholder="…"` with `defaultValue=""`
  (uncontrolled) or `value=""` (controlled). The placeholder option is
  rendered with `disabled hidden value=""` so it appears selected on
  initial mount but cannot be re-selected once the user picks a real
  value.

## Do / Don't

- DO control visual state through `variant`, `size`, `density`, and
  `tone`. DO compose with a parent wrapper for sizing/positioning
  concerns (widths, grid placement, margins) — the wrapper is the right
  surface for layout, not the NativeSelect.
- DO supply an accessible label (`<label>`, `aria-label`, or
  `aria-labelledby`). DON'T leave the combobox unnamed — screen readers
  and axe will both flag it.
- DO use `placeholder` paired with `defaultValue=""` when the field has
  no initial selection. DON'T omit `defaultValue=""` — without it the
  placeholder option will not render selected on mount.
- DO reach for `density="compact"` inside tight rows (toolbars, table
  filters) and for `tone="subtle"` inside cards or panels where a
  bordered field would over-emphasize. DO use `tone="inverted"` only
  over a dark hero/backdrop.
- DO use NativeSelect when the product genuinely needs the platform
  dropdown. DON'T reach for it to "match design defaults" — for rich
  item rendering (icons, separators, custom typography), use the
  portal-based `Select` molecule instead.
- DO pair `variant="error"` with a visible error message rendered
  elsewhere. DON'T rely on color alone to communicate validity.
- DO use the `options` prop for data-driven lists and `children` for
  statically authored JSX. DON'T pass both — `options` wins and the
  children are ignored.
