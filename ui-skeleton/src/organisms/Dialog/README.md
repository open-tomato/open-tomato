# Dialog

Portal-based organism that wraps `@radix-ui/react-dialog` for a centered,
focus-trapped modal surface. Pairs a consumer-supplied `trigger` with a
Content surface composing `title`, optional `description`, optional `header`
override, body `children`, and optional `footer` slot props.

## Import

```ts
import { Dialog } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                                                 | Default     |
| ------------- | -------------------------------------------------------------------- | ----------- |
| trigger       | `React.ReactElement` (required)                                      | —           |
| title         | `ReactNode` (required)                                               | —           |
| description   | `ReactNode`                                                          | —           |
| header        | `ReactNode` (overrides default `title` + `description` layout)       | —           |
| footer        | `ReactNode`                                                          | —           |
| children      | `ReactNode` (dialog body)                                            | —           |
| size          | `'sm' \| 'md' \| 'lg' \| 'xl'`                                       | `'md'`      |
| tone          | `'neutral' \| 'info'`                                                | `'neutral'` |
| contentProps  | `Omit<RadixContentProps, 'className' \| 'children'>`                 | —           |
| open / defaultOpen / onOpenChange / modal | Forwarded to Radix `Root`                | —           |

`className` is not a public prop — styling is controlled exclusively
through `size` and `tone`. The `contentProps` bag forwards Radix Content
props (focus handlers, escape-key handlers) while explicitly excluding
`className` so no escape hatch leaks into the portaled element.

## Variants

| size | Content max-width | Surface padding | Title size       |
| ---- | ----------------- | --------------- | ---------------- |
| `sm` | `max-w-sm`        | `p-4`           | `text-base`      |
| `md` | `max-w-md`        | `p-5`           | `text-lg`        |
| `lg` | `max-w-lg`        | `p-6`           | `text-xl`        |
| `xl` | `max-w-xl`        | `p-6`           | `text-2xl`       |

| tone      | Title tint (descendant selector) |
| --------- | -------------------------------- |
| `neutral` | `text-foreground` (default)      |
| `info`    | `text-primary`                   |

The resolved variants are reflected on the rendered Content as
`data-slot="dialog-content"`, `data-size`, and `data-tone`. Radix Dialog
additionally sets `role="dialog"`, `aria-labelledby` (pointing at the
Title), `aria-describedby` (pointing at the Description when present), and
`data-state="open" | "closed"` on the same element.

## Dialog vs AlertDialog vs Drawer

The three modal organisms wrap distinct primitives and serve distinct
interaction models:

- **Dialog** is the general-purpose modal. Centered, scrim-modal,
  focus-trapped, dismisses on escape or outside-click. The consumer owns
  the close mechanism via `footer` + `onOpenChange`. Reach for Dialog
  whenever the surface is a focused modal that is not strictly a
  confirm/cancel choice — edit profile, content preview, settings,
  changelog, etc.
- **AlertDialog** narrows the use case to confirm/cancel interruptions.
  Ships `role="alertdialog"`, replaces the open `footer` slot with
  explicit `confirmAction` + `cancelAction` slots, and refuses outside-click
  dismissal because the choice is mandatory. Reach for AlertDialog when the
  consumer MUST pick one of two outcomes (delete account, discard changes).
- **Drawer** is side-anchored and gesture-driven. Wraps `vaul` for
  native-mobile-like sheets — bottom sheets on touch devices, side panels
  on desktop. Reach for Drawer when the surface should feel native and
  gesture-aware.

The slot vocabulary is intentionally parallel between Dialog and Drawer
(`trigger`, `title`, `description`, `header`, `footer`, `children`) so a
consumer can swap one for the other when the interaction model changes; the
variant axes differ (`size` + `tone` on Dialog; `side` + `size` on Drawer)
because the anchoring axis is meaningful only for Drawer.

## Composition

- **Wrapped primitive:** `@radix-ui/react-dialog` provides Root, Trigger,
  Portal, Overlay, Content, Title, Description, and Close sub-components —
  including focus trapping, escape-key dismissal, outside-click dismissal,
  scroll locking, and the `role="dialog"` ARIA wiring. The organism
  composes Root, Trigger, Portal, Overlay, Content, Title, and Description
  in a single render; consumers wire close behavior via `onOpenChange` or
  by wrapping a Button in `<RadixDialog.Close asChild>` inside the
  `footer` slot.
- **Surface cva sibling pattern.** `dialogContentVariants` owns sizing +
  positioning + animation; `dialogContentSurfaceVariants` owns the border +
  bg + shadow + padding + the tone-driven title tint (applied via a
  descendant selector). The two compose unconditionally in the Content
  `cn(...)` call — the split exists so a future variant that composes a
  Card atom can swap the surface cva without touching the sizing cva. Same
  pattern as AlertDialog and Drawer.
- **Tone via descendant selector.** The `tone` axis routes through the
  surface cva — `info` resolves to `'[&_[data-slot=dialog-title]]:text-primary'`,
  `neutral` resolves to an empty string. Mirrors the Empty organism's
  descendant-selector tone pattern so the slot content stays raw while the
  surface owns the tint. The Title's own size-driven cva
  (`dialogTitleVariants`) handles the text size — tone only overrides the
  color, never the typography scale.
- **No `className` flows downward.** The `contentProps` type explicitly
  omits `'className'` so consumers cannot inject styling into the portaled
  Content. If a styling knob is missing, add a variant axis.
- **Slot prop vocabulary.** `trigger`, `title`, `description`, `header`,
  `footer`, and `children`. Slot content renders raw inside the composed
  Radix subcomponents; the organism does NOT inject styling into
  consumer-supplied nodes. The `header` override is mutually exclusive
  with the default visible `title`/`description` rendering, but `title`
  remains REQUIRED and is rendered visually-hidden (`sr-only`) inside the
  `RadixDialog.Title` when `header` is supplied so axe's
  `aria-dialog-name` rule keeps passing for the portaled Content.
- **Trigger pattern.** `trigger` is required and typed as
  `React.ReactElement` (NOT `ReactNode`) so the organism can wrap it via
  Radix's `Trigger asChild`. Fragments, strings, arrays, and `null` throw
  at runtime when Radix calls `React.cloneElement` — the element constraint
  surfaces this at compile time.
- **Layer-import direction.** Imports `@/atoms/Button` (only via story /
  test fixtures), `@/particles/cn`, and `@radix-ui/react-dialog`. Does NOT
  import other organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- Radix renders the Content with `role="dialog"` and auto-wires
  `aria-labelledby` to the Title and `aria-describedby` to the Description
  (when present). The Title is REQUIRED for axe's `aria-dialog-name` rule
  to pass — the organism types `title` as required to surface this at
  compile time, and renders the Radix Title visually-hidden when the
  `header` override replaces the visible layout.
- Focus is trapped inside the Content while open and restored to the
  trigger on close. The default initial focus lands on the first focusable
  child of the Content (typically a footer Button or the first
  interactive element in `children`).
- Escape dismisses the dialog; outside-click also dismisses it (Radix
  Dialog default). When the dialog must require an explicit confirm or
  cancel (e.g. destructive flows), reach for AlertDialog instead of
  intercepting escape / outside-click on Dialog.
- When `description` is omitted, Radix emits a dev-mode console warning
  about the missing `aria-describedby` wiring. The warning is advisory —
  omit the description when the title is self-describing, or pass an
  empty `description=" "` to silence the warning explicitly.
- Tests MUST call `await axe(document.body)` rather than `await axe(container)`
  because Radix portals the Content outside the bound render container; a
  container-scoped axe scan silently misses the portaled DOM.
- The trigger inherits its accessible name from the consumer-supplied
  element. Always provide one — Radix's `asChild` projects the trigger
  ARIA wiring onto your element.

## Do / Don't

- DO supply a `title` for every Dialog. DON'T omit it — Radix auto-wires
  `aria-labelledby` to the Title element and axe fails the
  `aria-dialog-name` rule when the dialog has no accessible name.
- DO communicate visual emphasis through `tone` rather than via custom
  styling. DON'T reach for `className` — the organism doesn't accept one,
  and the surface cva owns the only sanctioned tint hook.
- DO control selection via `open` + `onOpenChange` when external state
  drives the dialog. DO use `defaultOpen` for purely local uncontrolled
  state. DON'T mix the two on the same instance.
- DO reach for Dialog when the surface is a general-purpose modal. DO
  reach for AlertDialog when the consumer MUST pick one of two outcomes.
  DO reach for Drawer when the surface should feel native and
  gesture-aware. DON'T swap the three for purely visual reasons — the
  underlying interaction models differ.
- DON'T pass `className` to Dialog, to the Button elements you supply, or
  via `contentProps` — the organism, the composed Button atom, and the
  `contentProps` type all reject it. If a styling knob is missing, add a
  variant axis.
- DON'T pass a `React.Fragment`, string, array, or `null` as `trigger` —
  the descriptor signature (`React.ReactElement`) surfaces this at compile
  time because Radix's `asChild` requires a single element child.
- DON'T render a Dialog without a `title`. Even when `header` replaces
  the visible heading, the `title` prop drives the `aria-labelledby`
  wiring and is rendered visually-hidden.
