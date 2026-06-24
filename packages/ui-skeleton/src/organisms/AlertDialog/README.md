# AlertDialog

Portal-based organism that wraps `@radix-ui/react-alert-dialog` for a
confirm/cancel-style modal interruption. Pairs a consumer-supplied `trigger`
with a centered Content surface composing `title`, optional `description`,
and a two-button footer driven by `confirmAction` and `cancelAction` slot
props. The `severity` axis maps to the confirm Button's `variant` axis via a
lookup table.

## Import

```ts
import { AlertDialog } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                                                  | Default  |
| ------------- | --------------------------------------------------------------------- | -------- |
| trigger       | `React.ReactElement` (required)                                       | —        |
| title         | `ReactNode` (required)                                                | —        |
| description   | `ReactNode`                                                           | —        |
| confirmAction | `React.ReactElement` (Button atom)                                    | —        |
| cancelAction  | `React.ReactElement` (Button atom)                                    | —        |
| size          | `'sm' \| 'md' \| 'lg' \| 'xl'`                                        | `'md'`   |
| severity      | `'info' \| 'warning' \| 'danger'`                                     | `'info'` |
| contentProps  | `Omit<RadixContentProps, 'className' \| 'children'>`                  | —        |
| open / defaultOpen / onOpenChange | Forwarded to Radix `Root`                         | —        |

`className` is not a public prop — styling is controlled exclusively
through `size` and `severity`. The `contentProps` bag forwards Radix Content
props (focus handlers, escape-key handlers) while explicitly excluding
`className` so no escape hatch leaks into the portaled element.

## Variants

| size | Content max-width | Surface padding | Title size       |
| ---- | ----------------- | --------------- | ---------------- |
| `sm` | `max-w-sm`        | `p-4`           | `text-base`      |
| `md` | `max-w-md`        | `p-5`           | `text-lg`        |
| `lg` | `max-w-lg`        | `p-6`           | `text-xl`        |
| `xl` | `max-w-xl`        | `p-6`           | `text-2xl`       |

| severity   | Confirm Button `variant` |
| ---------- | ------------------------ |
| `info`     | `primary`                |
| `warning`  | `primary`                |
| `danger`   | `destructive`            |

The resolved variants are reflected on the rendered Content as
`data-slot="alert-dialog-content"`, `data-size`, and `data-severity`. Radix
AlertDialog additionally sets `role="alertdialog"`, `aria-labelledby`
(pointing at the Title), `aria-describedby` (pointing at the Description
when present), and `data-state="open" | "closed"` on the same element.

## Composition

- **Wrapped primitive:** `@radix-ui/react-alert-dialog` provides Root,
  Trigger, Portal, Overlay, Content, Title, Description, Action, and Cancel
  sub-components — including focus trapping, escape-key dismissal, scroll
  locking, and the `role="alertdialog"` ARIA wiring. The organism composes
  every sub-component in a single render.
- **Composed atom:** the consumer supplies a `Button` (or any single React
  element) as each of `trigger`, `confirmAction`, and `cancelAction`. The
  confirm slot is the only one the organism mutates — `React.cloneElement`
  injects the severity-mapped variant.
- **Variant propagation via lookup table.** The organism owns the mapping
  from `severity` to the confirm Button's `variant`:

  ```ts
  const buttonVariantForSeverity = {
    info: 'primary',
    warning: 'primary',
    danger: 'destructive',
  } as const;
  ```

  `severity` is the single source of truth for the confirm Button visual
  treatment — the organism overrides any explicit `variant` the consumer
  set on `confirmAction`. The cancel Button is rendered as-is so consumers
  keep full control of its variant.
- **Surface cva sibling pattern.** `alertDialogContentVariants` owns sizing
  + positioning + animation; `alertDialogContentSurfaceVariants` owns the
  border + bg + shadow + padding. The two compose unconditionally in the
  Content `cn(...)` call — the split exists so a future variant that
  composes a different surface atom can swap the surface cva without
  touching the sizing cva.
- **No `className` flows downward.** Composed atoms (Button) reject
  `className` at the type level. `contentProps` explicitly omits `'className'`
  so consumers cannot inject styling into the portaled Content. If a
  styling knob is missing, add a variant axis.
- **Trigger pattern.** `trigger`, `confirmAction`, and `cancelAction` are
  required and typed as `React.ReactElement` (NOT `ReactNode`) so the
  organism can wrap each via Radix's `asChild`. Fragments, strings,
  arrays, and `null` throw at runtime when Radix calls `React.cloneElement`
  — the element constraint surfaces this at compile time.
- **Layer-import direction.** Imports `@/atoms/Button` (type only),
  `@/particles/cn`, and `@radix-ui/react-alert-dialog`. Does NOT import
  other organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- Radix renders the Content with `role="alertdialog"` and auto-wires
  `aria-labelledby` to the Title and `aria-describedby` to the Description
  (when present). The Title is REQUIRED for axe's `aria-dialog-name` rule
  to pass — the organism types `title` as required to surface this at
  compile time.
- Focus is trapped inside the Content while open and restored to the
  trigger on close. The default initial focus lands on the Cancel button
  per Radix's accessibility defaults — confirm-by-default is unsafe for
  destructive actions.
- Escape dismisses the dialog; the overlay is non-dismissable by default
  (AlertDialog semantics — confirm/cancel is mandatory, unlike Dialog
  which dismisses on outside click).
- Tests MUST call `await axe(document.body)` rather than `await axe(container)`
  because Radix portals the Content outside the bound render container; a
  container-scoped axe scan silently misses the portaled DOM.
- The trigger inherits its accessible name from the consumer-supplied
  element. Always provide one — Radix's `asChild` projects the trigger
  ARIA wiring onto your element.

## Do / Don't

- DO supply a `title` for every AlertDialog. DON'T omit it — Radix
  auto-wires `aria-labelledby` to the Title element and axe fails the
  `aria-dialog-name` rule when the dialog has no accessible name.
- DO communicate severity through `severity` rather than by setting
  `variant` on `confirmAction`. The organism overrides any explicit
  `variant` the consumer set on the confirm Button — severity is the
  single source of truth for the confirm treatment.
- DO control selection via `open` + `onOpenChange` when external state
  drives the dialog. DO use `defaultOpen` for purely local uncontrolled
  state. DON'T mix the two on the same instance.
- DON'T pass `className` to AlertDialog, to the Button elements you
  supply, or via `contentProps` — the organism, the composed Button atom,
  and the `contentProps` type all reject it. If a styling knob is missing,
  add a variant axis.
- DON'T pass a `React.Fragment`, string, array, or `null` as `trigger`,
  `confirmAction`, or `cancelAction` — the descriptor signature
  (`React.ReactElement`) surfaces this at compile time because Radix's
  `asChild` requires a single element child.
- DON'T render an outside-click-to-dismiss treatment — AlertDialog
  semantics require an explicit Confirm or Cancel. Use the Dialog
  organism instead when outside-click dismissal is wanted.
