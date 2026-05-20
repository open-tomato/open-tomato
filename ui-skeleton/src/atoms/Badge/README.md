# Badge

Pure CVA wrapper rendered as a `<span>` for inline status, count, or label affordances. No underlying Radix primitive — composes safely inside paragraphs, buttons, list items, etc.

## Import

```ts
import { Badge } from '@open-tomato/ui-skeleton';
```

## Props

| Prop      | Type                                                         | Default     |
| --------- | ------------------------------------------------------------ | ----------- |
| variant   | `'primary' \| 'secondary' \| 'outline' \| 'destructive'`     | `'primary'` |
| size      | `'sm' \| 'md' \| 'lg'`                                       | `'md'`      |
| children  | `ReactNode`                                                  | —           |
| className | `string` (discouraged escape hatch)                          | —           |

All other props are forwarded to the underlying `<span>`.

## Variants

| variant       | Visual                                                           |
| ------------- | ---------------------------------------------------------------- |
| `primary`     | Filled with `bg-primary` + `text-primary-foreground`             |
| `secondary`   | Filled with `bg-secondary` + `text-secondary-foreground`         |
| `outline`     | Transparent fill with `border-border` + `text-foreground`        |
| `destructive` | Filled with `bg-destructive` + `text-destructive-foreground`    |

| size | Rendered                  |
| ---- | ------------------------- |
| `sm` | 20 px tall, 10 px text    |
| `md` | 24 px tall, 12 px text    |
| `lg` | 28 px tall, 14 px text    |

The resolved variants are reflected on the rendered element as `data-variant="<name>"` and `data-size="<name>"` for downstream styling and testing.

## Accessibility

- Renders a plain `<span>`; supports `aria-*` passthrough for cases where the badge carries meaning (e.g. `aria-label="3 unread notifications"`).
- Focus styles apply only when the badge becomes focusable via an ancestor; the wrapper does not introduce its own tab stop.
- Use `variant="destructive"` for negative/error states; do not rely on color alone — pair with text or an icon for color-blind users.
- Counts and live values should be announced via `aria-live` on a parent container, not on the badge itself.

## Do / Don't

- DO use `variant` and `size` for visual tuning. DON'T pass arbitrary `className` to override colors or dimensions.
- DO keep badge content short (a word, an icon, a single-digit count). Multi-line content breaks the inline rhythm.
- DON'T use Badge as a clickable element — wrap it in a `<button>` or `<a>` instead so the interaction has correct semantics.
