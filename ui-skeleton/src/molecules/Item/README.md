# Item

Stateless molecule that composes the `Typography` atom into a horizontal row
with leading / title / description / trailing slots. The `as` axis lets the
same row render as a presentational `<div>`, a list `<li>`, a clickable
`<button>`, or a navigation `<a>` — useful for menus, settings lists, side
navigation, results lists, and form-style rows.

## Import

```ts
import { Item } from '@open-tomato/ui-skeleton';
```

## Props

| Prop         | Type                                  | Default |
| ------------ | ------------------------------------- | ------- |
| as           | `'div' \| 'li' \| 'button' \| 'a'`    | `'div'` |
| size         | `'sm' \| 'md' \| 'lg'`                | `'md'`  |
| interactive  | `boolean`                             | `false` |
| leading      | `ReactNode`                           | —       |
| title        | `ReactNode`                           | —       |
| description  | `ReactNode`                           | —       |
| trailing     | `ReactNode`                           | —       |
| children     | `ReactNode` (rendered in the content slot, beneath title/description) | — |

All other props are forwarded to the rendered root element. When `as='button'`,
`type='button'` is set by default to avoid accidental form submission.
`className` is not a public prop — styling is controlled exclusively through
`size` and `interactive`.

## Variants

| size | Wrapper                | Title typography           |
| ---- | ---------------------- | -------------------------- |
| `sm` | `gap-2 p-2`            | `variant="body"` `weight="medium"` |
| `md` | `gap-3 p-3`            | `variant="body"` `weight="medium"` |
| `lg` | `gap-4 p-4`            | `variant="h4"`             |

| interactive | Effect                                                              |
| ----------- | ------------------------------------------------------------------- |
| `false`     | Plain row, no hover / focus styling                                 |
| `true`      | `cursor-pointer`, `hover:bg-muted/50`, focus ring, rounded corners, disabled fade |

The resolved variants are reflected on the rendered root as
`data-as="<tag>"`, `data-size="<name>"`, and `data-interactive=""` (present
only when true) for downstream styling and testing. The wrapper exposes
`data-slot="item-root"`. Internal slots use `data-slot="item-leading"`,
`"item-content"`, and `"item-trailing"`. The composed Typography exposes
`data-variant` for the title and description.

## Composition

Item is a stateless polymorphic-row molecule:

- **Composed atom:** `Typography` renders the title and description. The
  row's outer element is a plain HTML tag selected by `as` — Item owns the
  layout (`flex`, `gap-*`, `p-*`, optional hover ring) and the polymorphic
  rendering.
- **Variant propagation via lookup tables.** The molecule owns the mapping
  from its own `size` axis to Typography's `variant` and `weight`:

  ```ts
  const titleVariantForSize = { sm: 'body', md: 'body', lg: 'h4' } as const;
  const titleWeightForSize = {
    sm: 'medium' as const,
    md: 'medium' as const,
    lg: undefined,
  } as const;
  ```

  `size` maps to Typography's `variant` axis via explicit lookup; the
  description slot always renders with `variant="caption"`. For `lg`, the
  weight is left unset so Typography's natural `h4` weight (`font-semibold`)
  wins.
- **Title forces `as="span"`.** Typography defaults its rendered tag from the
  `variant` (e.g. `variant="body"` → `<p>`, `variant="h4"` → `<h4>`). Item
  pins the title's `as="span"` so that nesting inside `as="button"` or
  `as="a"` does not produce invalid HTML (`<p>` / `<h4>` inside `<button>`).
- **No `className` flows downward.** Atoms reject `className` both at the
  type level and at runtime. If a knob the variants don't cover is needed,
  add a variant axis on the Typography atom OR on Item — don't open an
  escape hatch.
- **Slot prop vocabulary.** `leading`, `title`, `description`, `trailing`,
  plus `children` for additional body content rendered inside the content
  slot. Slot content renders raw inside the composed atoms; Item does not
  inject styling into consumer-supplied nodes (the leading slot is wrapped
  in `<span aria-hidden>` because leading icons are decorative).
- **Layer-import direction.** Item imports `@/atoms/Typography` and
  `@/particles/cn`. It does NOT import other molecules, organisms,
  templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- The polymorphic `as` axis only changes the rendered element; it does NOT
  inject behavior. For `as='button'` or `as='a'`, the chosen element is
  naturally focusable and clickable. For `as='div'` or `as='li'`, the
  consumer is responsible for wiring `onClick` / `onKeyDown` and any needed
  `role` / `tabIndex` attributes when the row should respond to interaction.
- The `interactive` axis applies visual affordance (hover, focus ring,
  cursor) but does NOT add semantic interactivity. Pair `interactive` with
  an interactive `as` (`'button'` / `'a'`), or supply `role` and
  keyboard handlers when staying on `'div'` / `'li'`.
- The leading slot is wrapped in `<span aria-hidden>` because leading icons
  are typically decorative — the title and description carry the meaning.
  If the leading content is meaningful (e.g. an avatar that identifies a
  person), pair the row with an `aria-label` so screen readers get a name.
- When `as='button'`, `type='button'` is set by default to prevent
  accidental form submission inside a `<form>`.
- When `as='li'`, place the row inside a `<ul>` or `<ol>` so assistive tech
  announces the row as part of a list.

## Do / Don't

- DO tune visuals through `size` and `interactive`. DO use `as` to pick the
  semantically correct element for the row's purpose (`button` for actions,
  `a` for navigation, `li` for list entries, `div` for display-only rows).
- DO pair `interactive` with an interactive `as` (`'button'` or `'a'`).
  DON'T set `interactive` on `as='div'` without also adding the necessary
  semantics — a visual cursor-pointer with no keyboard handler is a a11y
  trap.
- DO use the structured `title` / `description` slots for the common case.
  Use `children` only when additional body content needs to render inside
  the content area beneath title/description.
- DON'T pass `className` to Item or to its composed Typography atom — atoms
  reject it at the type level. If a styling knob is missing, add a variant
  axis.
- DON'T put `<p>` / `<h*>` elements directly inside `title` when `as` is
  `'button'` or `'a'` — Item already forces Typography's title to render
  as `<span>` to keep the HTML valid; arbitrary block-level children inside
  these tags will still be invalid.
