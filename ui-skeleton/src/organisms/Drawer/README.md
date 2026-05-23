# Drawer

Portal-based, gesture-driven organism that wraps `vaul` for a side-anchored
sliding surface. Pairs a consumer-supplied `trigger` with a Content surface
anchored to one edge of the viewport, composing `title`, optional
`description`, optional `header` override, body `children`, and optional
`footer` slot props.

## Import

```ts
import { Drawer } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                                                 | Default   |
| ------------- | -------------------------------------------------------------------- | --------- |
| trigger       | `React.ReactElement` (required)                                      | —         |
| title         | `ReactNode` (required)                                               | —         |
| description   | `ReactNode`                                                          | —         |
| header        | `ReactNode` (overrides default `title` + `description` layout)       | —         |
| footer        | `ReactNode`                                                          | —         |
| children      | `ReactNode` (drawer body)                                            | —         |
| side          | `'top' \| 'right' \| 'bottom' \| 'left'`                             | `'right'` |
| size          | `'sm' \| 'md' \| 'lg' \| 'xl'`                                       | `'md'`    |
| contentProps  | `Omit<VaulContentProps, 'className' \| 'children'>`                  | —         |
| open / defaultOpen / onOpenChange | Forwarded to vaul `Root`                          | —         |

`className` is not a public prop — styling is controlled exclusively
through `side` and `size`. The `contentProps` bag forwards vaul Content
props (focus handlers, escape-key handlers) while explicitly excluding
`className` so no escape hatch leaks into the portaled element.

## Variants

| side     | Anchor / animation                                       | Cross-axis dimension |
| -------- | -------------------------------------------------------- | -------------------- |
| `top`    | Anchored to top edge, slide-from-top, rounded bottom     | Height               |
| `right`  | Anchored to right edge, slide-from-right, rounded left   | Width                |
| `bottom` | Anchored to bottom edge, slide-from-bottom, rounded top  | Height               |
| `left`   | Anchored to left edge, slide-from-left, rounded right    | Width                |

| size | Horizontal sides (left/right) | Vertical sides (top/bottom) | Surface padding |
| ---- | ----------------------------- | --------------------------- | --------------- |
| `sm` | `w-72 max-w-[80vw]`           | `h-48 max-h-[60vh]`         | `p-4`           |
| `md` | `w-80 max-w-[85vw]`           | `h-64 max-h-[70vh]`         | `p-5`           |
| `lg` | `w-96 max-w-[90vw]`           | `h-80 max-h-[80vh]`         | `p-6`           |
| `xl` | `w-[32rem] max-w-[95vw]`      | `h-96 max-h-[90vh]`         | `p-6`           |

The resolved variants are reflected on the rendered Content as
`data-slot="drawer-content"`, `data-side`, and `data-size`. vaul (via its
underlying Radix Dialog primitive) additionally sets `role="dialog"`,
`aria-labelledby` (pointing at the Title), `aria-describedby` (pointing at
the Description when present), and `data-state="open" | "closed"` on the
same element.

Vertical sides (`top` / `bottom`) auto-render a gesture handle pill above
the body content; horizontal sides (`left` / `right`) omit the handle —
the swipe-to-dismiss affordance is conventional on vertical sheets and
visual noise on side panels that dismiss via tap or escape.

## Drawer vs Dialog

The two organisms wrap distinct primitives and serve distinct interaction
models:

- **Dialog** is centered, scrim-modal, focus-trapped, and dismisses on
  escape or outside-click. The interaction model is "modal interruption
  with a confirm or cancel". Use Dialog when the surface is a focused
  modal confirmation that interrupts the main flow.
- **Drawer** is side-anchored and gesture-driven. vaul handles the
  swipe-to-dismiss math, snap-point animation, and the body-scale
  background effect. The interaction model is "native-mobile-like
  sheet" — bottom sheets on touch devices, side panels on desktop. Use
  Drawer when the surface should feel native and gesture-aware,
  particularly for filters, secondary navigation, and content browsers.

The slot vocabulary is intentionally parallel between the two so a
consumer can swap one for the other when the interaction model changes;
the variant axes differ (`side` + `size` on Drawer; `size` + `tone` on
Dialog) because the anchoring axis is meaningful only for Drawer.

## Composition

- **Wrapped primitive:** `vaul` provides Root, Trigger, Portal, Overlay,
  Content, Title, Description, Handle, and Close sub-components — including
  the gesture-driven swipe-to-dismiss, snap-point coordination, focus
  trapping, escape-key dismissal, and the `role="dialog"` ARIA wiring (via
  the underlying Radix Dialog primitive). The organism composes Root,
  Trigger, Portal, Overlay, Content, Title, Description, and Handle in a
  single render.
- **Variant propagation via lookup table.** The organism owns the mapping
  from its own `side` axis to vaul's `direction` prop:

  ```ts
  const vaulDirectionForSide = {
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    left: 'left',
  } as const;
  ```

  The rename exists so the organism vocabulary aligns with the Sheet
  template's `side` prop. `side` also drives the cross-axis dimension that
  `size` applies via `compoundVariants` in `drawerContentVariants`: width
  for `left`/`right`, height for `top`/`bottom`.
- **Surface cva sibling pattern.** `drawerContentVariants` owns sizing +
  anchoring + animation; `drawerContentSurfaceVariants` owns the border +
  bg + shadow + padding. The two compose unconditionally in the Content
  `cn(...)` call — the split exists so a future variant that composes a
  different surface atom can swap the surface cva without touching the
  anchoring cva. Same pattern as AlertDialog and Dialog.
- **No `className` flows downward.** The `contentProps` type explicitly
  omits `'className'` so consumers cannot inject styling into the portaled
  Content. If a styling knob is missing, add a variant axis.
- **Slot prop vocabulary.** `trigger`, `title`, `description`, `header`,
  `footer`, and `children`. Slot content renders raw inside the composed
  vaul subcomponents; the organism does NOT inject styling into
  consumer-supplied nodes. The `header` override is mutually exclusive
  with the default visible `title`/`description` rendering, but `title`
  remains REQUIRED and is rendered visually-hidden (`sr-only`) inside the
  `Vaul.Title` when `header` is supplied so axe's `aria-dialog-name` rule
  keeps passing for the portaled Content.
- **Trigger pattern.** `trigger` is required and typed as
  `React.ReactElement` (NOT `ReactNode`) so the organism can wrap it via
  vaul's `Trigger asChild`. Fragments, strings, arrays, and `null` throw
  at runtime when vaul calls `React.cloneElement` — the element
  constraint surfaces this at compile time.
- **Layer-import direction.** Imports `@/atoms/Button` (type only via the
  story / test fixtures), `@/particles/cn`, and `vaul`. Does NOT import
  other organisms, templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- vaul renders the Content with `role="dialog"` (via the underlying Radix
  Dialog primitive) and auto-wires `aria-labelledby` to the Title and
  `aria-describedby` to the Description (when present). The Title is
  REQUIRED for axe's `aria-dialog-name` rule to pass — the organism types
  `title` as required to surface this at compile time, and renders the
  Vaul Title visually-hidden when the `header` override replaces the
  visible layout.
- Focus is trapped inside the Content while open and restored to the
  trigger on close.
- Escape dismisses the drawer; outside-click and gesture-swipe also
  dismiss it (vaul's default `dismissible: true` behavior). Pass
  `dismissible={false}` via the rest props to require an explicit
  programmatic close.
- Tests MUST call `await axe(document.body)` rather than `await axe(container)`
  because vaul portals the Content outside the bound render container; a
  container-scoped axe scan silently misses the portaled DOM.
- The trigger inherits its accessible name from the consumer-supplied
  element. Always provide one — vaul's `asChild` projects the trigger
  ARIA wiring onto your element.

## Do / Don't

- DO supply a `title` for every Drawer. DON'T omit it — vaul auto-wires
  `aria-labelledby` to the Title element and axe fails the
  `aria-dialog-name` rule when the dialog has no accessible name.
- DO use `side` (organism vocabulary) rather than reaching into vaul's
  `direction` prop. The lookup table maps them 1:1; the rename exists so
  the Sheet template can adopt the same vocabulary at the next layer.
- DO control selection via `open` + `onOpenChange` when external state
  drives the drawer. DO use `defaultOpen` for purely local uncontrolled
  state. DON'T mix the two on the same instance.
- DO reach for Drawer when the interaction model is native-mobile-like
  (bottom sheet, side panel, gesture-aware). DO reach for Dialog when the
  interaction model is a centered modal confirmation. DON'T swap the two
  for purely visual reasons — the underlying gesture physics differ.
- DON'T pass `className` to Drawer, to the Button elements you supply, or
  via `contentProps` — the organism, the composed Button atom, and the
  `contentProps` type all reject it. If a styling knob is missing, add a
  variant axis.
- DON'T pass a `React.Fragment`, string, array, or `null` as `trigger` —
  the descriptor signature (`React.ReactElement`) surfaces this at compile
  time because vaul's `asChild` requires a single element child.
- DON'T render a side panel without a `title`. Even when `header`
  replaces the visible heading, the `title` prop drives the
  `aria-labelledby` wiring and is rendered visually-hidden.
