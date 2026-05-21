# Kbd

Pure CVA wrapper rendered as a native `<kbd>` element for displaying keyboard shortcuts and key bindings inline with text. No underlying Radix primitive — composes safely inside paragraphs, menu items, command palettes, etc.

## Import

```ts
import { Kbd } from '@open-tomato/ui-skeleton';
```

## Props

| Prop     | Type                              | Default     |
| -------- | --------------------------------- | ----------- |
| variant  | `'outline' \| 'solid' \| 'ghost'` | `'outline'` |
| size     | `'sm' \| 'md' \| 'lg'`            | `'md'`      |
| children | `ReactNode`                       | —           |

All other props (apart from `className`) are forwarded to the underlying `<kbd>`.

## Variants

| variant   | Visual                                                                       |
| --------- | ---------------------------------------------------------------------------- |
| `outline` | Bordered chip with `bg-muted` + `border-border` + `shadow-elev-1` (default)  |
| `solid`   | Filled `bg-muted` + `text-muted-foreground`, no border                       |
| `ghost`   | Transparent background and border, `text-muted-foreground`                   |

| size | Rendered                  |
| ---- | ------------------------- |
| `sm` | 20 px tall, 10 px text    |
| `md` | 24 px tall, 12 px text    |
| `lg` | 28 px tall, 14 px text    |

The resolved variants are reflected on the rendered element as `data-slot="kbd"`, `data-variant="<name>"` and `data-size="<name>"` for downstream styling and testing.

## Accessibility

- Renders a native `<kbd>` element so assistive tech announces the content as keyboard input.
- `select-none` is applied so double-clicking a shortcut chip doesn't accidentally select the surrounding text.
- For multi-key chord shortcuts (e.g. `Ctrl + K`), render one `<Kbd>` per key with a literal text separator between them so each key is announced individually.
- Decorative use only: Kbd is not focusable and does not introduce a tab stop. Wrap it in an interactive element if the shortcut itself should be activatable.

## Do / Don't

- DO use `variant` and `size` for visual tuning. If a knob is missing, add a variant axis — there is no `className` escape hatch.
- DO keep content short — a single key name, symbol (`⌘`, `⇧`), or modifier abbreviation. Multi-word content breaks the inline rhythm.
- DO compose chords as multiple `<Kbd>` instances with literal `+` between them. DON'T put `+` inside a single `<Kbd>`.
- DO wrap Kbd in a parent element when sizing/positioning constraints matter — Kbd renders inline by design.
- DON'T use Kbd as a clickable element — wrap it in a `<button>` or attach handlers to the surrounding label instead so the interaction has correct semantics.
