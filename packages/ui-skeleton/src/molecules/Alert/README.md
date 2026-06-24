# Alert

Canonical molecule that composes the `Card` and `Typography` atoms (plus an
optional leading icon slot) into a status surface driven by `severity` and
`size` variants. Acts as the molecule-layer reference: open this directory
before authoring any other molecule.

## Import

```ts
import { Alert } from '@open-tomato/ui-skeleton';
```

## Props

| Prop        | Type                                              | Default  |
| ----------- | ------------------------------------------------- | -------- |
| severity    | `'info' \| 'success' \| 'warning' \| 'error'`     | `'info'` |
| size        | `'sm' \| 'md' \| 'lg'`                            | `'md'`   |
| leading     | `ReactNode`                                       | —        |
| title       | `ReactNode`                                       | —        |
| description | `ReactNode`                                       | —        |
| header      | `ReactNode` (overrides default header layout)     | —        |
| actions     | `ReactNode` (rendered in the underlying Card footer) | —     |
| children    | `ReactNode` (rendered in the Card content slot)   | —        |

All other props are forwarded to the rendered Card root (a `<div>` with
`role="alert"`). `className` is not a public prop — styling is controlled
exclusively through `severity` and `size`.

## Variants

| severity   | Visual                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| `info`     | Neutral leading-icon tint (`text-foreground`)                           |
| `success`  | Emerald leading-icon tint (`text-emerald-600`)                          |
| `warning`  | Amber leading-icon tint (`text-amber-600`)                              |
| `error`    | Destructive leading-icon tint (`text-destructive`)                      |

| size | Card padding | Title typography |
| ---- | ------------ | ---------------- |
| `sm` | `padding="sm"` | `variant="h5"` |
| `md` | `padding="md"` | `variant="h4"` |
| `lg` | `padding="lg"` | `variant="h3"` |

The resolved variants are reflected on the rendered root as
`data-severity="<name>"` and `data-size="<name>"` for downstream styling
and testing. The Card padding axis surfaces as `data-padding="<name>"` on
the same element. Slots expose `data-slot="alert-root" | "alert-leading" |
"alert-titles"`.

## Composition

Alert is the canonical demonstration of the molecule composition rules:

- **Composed atoms:** `Card` provides the surface (root, header, footer,
  content slots) and `Typography` renders the title and description.
- **Variant propagation via lookup tables.** The molecule owns the mapping
  from its own axes to each composed atom's axes:

  ```ts
  const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const titleVariantForSize = { sm: 'h5', md: 'h4', lg: 'h3' } as const;
  ```

  `size` maps to `Card`'s `padding` axis (passthrough) and to `Typography`'s
  `variant` axis (explicit lookup). `severity` maps to the
  `alertHeaderVariants` cva, which tints the leading-icon slot via a
  descendant selector — composed atoms are never passed `className`.
- **No `className` flows downward.** Atoms reject `className` both at the
  type level and at runtime. If a knob the variants don't cover is needed,
  add a variant axis on the atom OR on Alert — don't open an escape hatch.
- **Slot prop vocabulary.** `leading`, `title`, `description`, `header`,
  `actions`, plus `children` for the body. Slot content renders raw inside
  the composed atoms; Alert does not inject styling into consumer-supplied
  nodes.
- **Layer-import direction.** Alert imports `@/atoms/Card`,
  `@/atoms/Typography`, and `@/particles/cn`. It does NOT import other
  molecules, organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- Renders with `role="alert"` so assistive tech announces the surface as a
  live region.
- The leading slot is wrapped in a `<span aria-hidden>` because the icon is
  decorative — the title and description carry the meaning.
- The `header` override does not impose semantics — supply a real heading
  element (`<h2>` / `<h3>` / `<h4>`) inside `header` when the alert needs to
  participate in document outline.
- Tints come from text-color utilities only; do not rely on color alone to
  communicate severity — pair with the title text and (optionally) an icon.

## Do / Don't

- DO tune visuals through `severity` and `size`. DO compose with a parent
  wrapper for sizing or positioning concerns (margins, grid placement) —
  the wrapper is the right surface for layout, not the Alert.
- DO use `title` / `description` for the common case and `header` only when
  custom markup (inline actions, real heading element) is needed.
  DON'T mix `header` with `title` / `description` — `header` replaces the
  default header layout entirely when present.
- DO put dismiss / acknowledge buttons in `actions` so they render inside
  the Card's footer slot. DON'T inline them in `description`.
- DON'T pass `className` to Alert or to any composed atom — atoms reject it
  at the type level. If a styling knob is missing, add a variant axis.
