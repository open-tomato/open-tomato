# Tooltip

Portal-based molecule that wraps Radix's Tooltip primitive into a single
encapsulated component. Pairs a consumer-supplied `trigger` element with a
portaled, hover/focus-activated text bubble. Renders its own internal
`RadixTooltip.Provider` so consumers do not need to wrap their app in a
Provider.

## Import

```ts
import { Tooltip } from '@open-tomato/ui-skeleton';
```

## Props

| Prop                    | Type                                                       | Default  |
| ----------------------- | ---------------------------------------------------------- | -------- |
| trigger                 | `React.ReactElement` (required)                            | —        |
| content                 | `ReactNode` (required)                                     | —        |
| size                    | `'sm' \| 'md' \| 'lg'`                                     | `'md'`   |
| placement               | `'top' \| 'right' \| 'bottom' \| 'left'`                   | `'top'`  |
| align                   | `'start' \| 'center' \| 'end'`                             | `'center'` |
| delayDuration           | `number` (ms before tooltip opens)                         | `300`    |
| skipDelayDuration       | `number` (ms during which subsequent tooltips skip delay)  | —        |
| disableHoverableContent | `boolean` (disable hover bridging onto the content itself) | —        |
| contentProps            | `Omit<RadixContentProps, 'className' \| 'side' \| 'align' \| 'children'>` | — |
| open / defaultOpen / onOpenChange | Forwarded to Radix `Root`                        | —        |

`className` is not a public prop — styling is controlled exclusively
through `size`, `placement`, and `align`. The `contentProps` bag forwards
Radix Content props (focus handlers, collision boundary, side offsets,
`aria-label`) while explicitly excluding `className` so no escape hatch
leaks into the portaled element.

## Variants

| size | Max width / Padding |
| ---- | ------------------- |
| `sm` | `max-w-48 px-2 py-1` |
| `md` | `max-w-64 px-2.5 py-1.5` |
| `lg` | `max-w-80 px-3 py-2` |

The content is wrapped in `Typography(variant="caption")` for the small,
muted tooltip text treatment. Pass plain strings or simple inline nodes —
tooltips are not the place for rich layout or sustained reading.

`data-slot="tooltip-content"` and `data-size` are reflected on the
rendered Content for testing and downstream styling. The wrapped
Typography emits `data-slot="tooltip-body"` and `data-variant="caption"`.
Radix Tooltip additionally sets `data-state="delayed-open" | "instant-open"
| "closed"`, `data-side`, and `data-align` on the Content after collision
detection runs.

## Composition

- **Composed atoms:** `Typography` (variant `caption`) wraps the `content`
  slot so the tooltip body inherits the small, muted text treatment.
- **No `className` flows downward.** The composed `Typography` atom rejects
  `className` at the type level. The `contentProps` bag explicitly omits
  `'className'` so consumers cannot inject styling into the portaled
  Content. If a styling knob is missing, add a variant axis.
- **Trigger pattern.** `trigger` is required and typed as
  `React.ReactElement` (NOT `ReactNode`) so the molecule can wrap it via
  `<RadixTooltip.Trigger asChild>{trigger}</RadixTooltip.Trigger>`.
  Fragments, strings, arrays, and `null` throw at runtime when Radix
  calls `React.cloneElement` — the element constraint surfaces this at
  compile time.
- **Internal Provider.** Tooltip renders its own
  `RadixTooltip.Provider delayDuration={300}` so consumers do not need to
  wrap their app in a top-level Provider. Tests pass `delayDuration={0}`
  to skip the hover delay. Override `delayDuration` /
  `skipDelayDuration` / `disableHoverableContent` props on the molecule
  to tune the global Provider behavior for the wrapped instance.
- **Layer-import direction.** Tooltip imports `@/atoms/Typography` and
  `@/particles/cn` (plus `@radix-ui/react-tooltip`). It does NOT import
  other molecules, organisms, templates, pages, or providers — enforced
  by the `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- The trigger inherits its accessible name from the consumer-supplied
  element (typically a `Button`). Always provide one — Radix's `asChild`
  projects the tooltip ARIA wiring onto your element (`aria-describedby`
  pointing at the Content when open).
- The portaled Content carries Radix's `role="tooltip"` semantics. Radix
  links it to the trigger via `aria-describedby` automatically — the
  Tooltip should describe an already-named control, not be the only label
  for it. Use a visible label or `aria-label` on the trigger for the
  primary name.
- Tooltips activate on hover AND keyboard focus. Avoid putting critical
  content inside a tooltip — touch users have no hover, and any content
  hidden behind hover/focus alone is unreachable in those contexts.

## Do / Don't

- DO compose a `<Button>` (or any single React element with an accessible
  name) as the `trigger`. DON'T pass a fragment, string, array, or `null`
  — Radix's `asChild` requires a single element child.
- DO tune visuals through `size`, `placement`, and `align`. DON'T pass
  `className` to Tooltip or to the wrapped Typography.
- DO keep `content` short — a label, a shortcut hint, or a one-sentence
  explanation. DON'T pack rich layout (lists, headings, form controls)
  into a tooltip; promote to a `Popover` or `HoverCard` instead.
- DO rely on the internal Provider's `delayDuration={300}` default.
  DON'T wrap your app in a separate `RadixTooltip.Provider` unless you
  need a shared `skipDelayDuration` window across many tooltips — and if
  you do, prefer extending the molecule rather than reaching past it.
