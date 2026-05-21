# Typography

Pure CVA wrapper that decouples visual style (`variant`) from the rendered HTML tag (`as`). The `variant` axis drives size, weight, tracking, leading, and any inline chip/code/kbd treatments; the `as` prop controls the element so the document outline stays correct regardless of the visual hierarchy. No underlying Radix primitive — composes safely inside articles, cards, lists, tables, etc.

For keyboard-input semantics, prefer the dedicated `Kbd` atom (renders a native `<kbd>`). The `kbd` *variant* here is a typographic style applied to a `<span>` by default — use it when you want kbd-looking chips inside larger text without the keyboard-input semantics.

## Import

```ts
import { Typography } from '@open-tomato/ui-skeleton';
```

## Props

| Prop     | Type                                                                                  | Default                            |
| -------- | ------------------------------------------------------------------------------------- | ---------------------------------- |
| variant  | `'display' \| 'h1' \| 'h2' \| 'h3' \| 'h4' \| 'body' \| 'caption' \| 'code' \| 'kbd'` | `'body'`                           |
| as       | `'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'p' \| 'span' \| 'code'`             | mapped from `variant` (see table)  |
| weight   | `'light' \| 'regular' \| 'medium' \| 'semibold' \| 'bold'`                            | inherited from `variant`           |
| align    | `'left' \| 'center' \| 'right' \| 'justify'`                                          | inherited                          |
| children | `ReactNode`                                                                           | —                                  |

All other props are forwarded to the underlying element. `className` is
intentionally not part of the public API — use `variant`, `weight`, and
`align` for visual treatment, and `as` to control the rendered tag.

## Variants

| variant   | Visual                                                  | Default `as` |
| --------- | ------------------------------------------------------- | ------------ |
| `display` | 6xl, bold, tight tracking, no leading                   | `h1`         |
| `h1`      | 4xl, bold, tight tracking + leading                     | `h1`         |
| `h2`      | 3xl, bold, tight tracking + leading                     | `h2`         |
| `h3`      | 2xl, semibold, tight tracking + snug leading            | `h3`         |
| `h4`      | xl, semibold, tight tracking + snug leading             | `h4`         |
| `body`    | base, relaxed leading                                   | `p`          |
| `caption` | xs, normal leading, `text-muted-foreground`             | `span`       |
| `code`    | inline `font-mono` chip with `bg-muted`                 | `code`       |
| `kbd`     | inline `font-mono` chip with `border` + `shadow-elev-1` | `span`       |

| weight     | Class          |
| ---------- | -------------- |
| `light`    | `font-light`   |
| `regular`  | `font-normal`  |
| `medium`   | `font-medium`  |
| `semibold` | `font-semibold`|
| `bold`     | `font-bold`    |

| align     | Class            |
| --------- | ---------------- |
| `left`    | `text-left`      |
| `center`  | `text-center`    |
| `right`   | `text-right`     |
| `justify` | `text-justify`   |

The resolved variant and rendered tag are reflected on the DOM as `data-slot="typography"`, `data-variant="<name>"`, and `data-as="<tag>"` for downstream styling and testing.

## Accessibility

- The `variant` axis is purely visual; the **semantic level** is determined by `as`. Choose `as` so the document outline reflects the actual heading hierarchy of the page, even when the visual treatment of a section calls for a different size.
- For keyboard-input semantics, prefer the dedicated `Kbd` atom (renders `<kbd>`). The `kbd` variant on Typography only applies the visual chip style and renders a `<span>` by default.
- The `code` variant defaults to `<code>` which is the correct inline-code element. Use `as="span"` if you want code-styling on prose without the `<code>` semantic.
- Skip-heading-levels axe checks rely on the rendered tag (`as`), not the visual `variant`. A page that visually styles a section as `h2` but renders it as `as="h1"` will be validated against `<h1>` rules — choose `as` to satisfy outline rules first, then pick a `variant` for the visual.

## Do / Don't

- DO pick `variant` for visual treatment and `as` for the HTML tag. If a recurring size, weight, or color is missing, extend the `variant`, `weight`, or `align` axes rather than reaching for inline overrides.
- DO override `as` when the heading-outline rules require it (e.g. `variant="h2" as="h1"` for a hero whose H1 reads smaller than the rest of the page).
- DO use the dedicated `Kbd` atom for keyboard-input semantics. DON'T rely on Typography's `kbd` variant when assistive tech needs to know the content is a key.
- DO compose Typography inside parent wrappers when you need positioning or spacing — the parent owns layout, the atom owns text styling.
- DON'T mix `weight` with a `variant` whose default weight is intentional (e.g. `variant="display" weight="light"` defeats the display style); pick a different variant if you need a different weight by default.
- DON'T use Typography for interactive text (links, buttons) — wrap it inside an appropriate interactive element instead so the activation semantics are correct.
