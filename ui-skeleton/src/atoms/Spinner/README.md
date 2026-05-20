# Spinner

Pure CVA wrapper rendered as a `<div>` with `animate-spin`. The visible ring is a circular border whose top edge is transparent, so the rest of the border becomes the spinning trace. No underlying Radix primitive — composes safely inline with text, inside buttons, badges, cards, etc.

## Import

```ts
import { Spinner } from '@open-tomato/ui-skeleton';
```

## Props

| Prop      | Type                                                | Default     |
| --------- | --------------------------------------------------- | ----------- |
| variant   | `'default' \| 'muted' \| 'primary' \| 'destructive'` | `'default'` |
| size      | `'sm' \| 'md' \| 'lg'`                              | `'md'`      |
| label     | `string` (pass `""` for decorative)                 | `'Loading'` |
| className | `string` (discouraged escape hatch)                 | —           |

All other props are forwarded to the underlying `<div>`. Consumer-supplied `role` and `aria-label` override the defaults described below.

## Variants

| variant       | Ring color (driven via `text-*` + `border-current`) |
| ------------- | --------------------------------------------------- |
| `default`     | `text-foreground`                                   |
| `muted`       | `text-muted-foreground`                             |
| `primary`     | `text-primary`                                      |
| `destructive` | `text-destructive`                                  |

| size | Diameter | Border thickness |
| ---- | -------- | ---------------- |
| `sm` | 16 px    | `border-2`       |
| `md` | 24 px    | `border-2`       |
| `lg` | 32 px    | `border-[3px]`   |

The resolved variants are reflected on the rendered element as `data-slot="spinner"`, `data-variant="<name>"` and `data-size="<name>"` for downstream styling and testing.

## Accessibility

- Defaults to `role="status"` with `aria-label="Loading"` and a visually hidden `<span class="sr-only">Loading</span>` child so screen readers announce the loading state without extra plumbing from the consumer.
- Pass `label="Saving"` (or any string) to customize the announcement. Pass `label=""` to render the spinner as purely decorative — the wrapper sets `aria-hidden="true"`, drops the role, and skips the sr-only child. Use this when the spinner sits next to a separately-labelled message (e.g. inside a button whose own text reads "Saving…").
- Consumers can override `role` and `aria-label` directly (e.g. `role="progressbar"`, `aria-label="Uploading file"`); the props passed in always win over the wrapper defaults.
- Respect user motion preferences: this component always emits `animate-spin`. Wrap it in a `prefers-reduced-motion` branch (or apply the `motion-reduce:animate-none` class via `className` in your downstream component) if reduced-motion behavior matters for your context.

## Do / Don't

- DO use `variant` for ring color and `size` for dimensions. DON'T pass arbitrary `className` to recolor or resize — extend the variants or this component instead.
- DO use `label=""` when the spinner is purely decorative and the parent already announces loading state. DON'T leave the default `'Loading'` label active inside an already-labelled live region — you'll double-announce.
- DO compose Spinner inline with text or inside button content. DON'T put arbitrary children inside Spinner — the prop interface forbids `children` because the circular border geometry doesn't compose with inner content.
