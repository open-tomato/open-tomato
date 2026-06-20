# Sheet

Side-anchored template that composes the `Dialog` organism for portal +
accessibility + visible surface treatment, and owns only the positioning
axis (`side`) and the cross-axis sizing axis (`size`). Slot vocabulary
mirrors Dialog one-to-one (`trigger`, `title`, `description`, `header`,
`footer`, `children`) and is forwarded transparently.

## Import

```ts
import { Sheet } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                                                                 | Default   |
| ------------- | -------------------------------------------------------------------- | --------- |
| trigger       | `React.ReactElement` (required)                                      | —         |
| title         | `ReactNode` (required)                                               | —         |
| description   | `ReactNode`                                                          | —         |
| header        | `ReactNode` (overrides default `title` + `description` layout)       | —         |
| footer        | `ReactNode`                                                          | —         |
| children      | `ReactNode` (sheet body)                                             | —         |
| side          | `'top' \| 'right' \| 'bottom' \| 'left'`                             | `'right'` |
| size          | `'sm' \| 'md' \| 'lg' \| 'xl'`                                       | `'md'`    |
| contentProps  | `Omit<DialogContentProps, 'style' \| 'data-side'>`                   | —         |
| open / defaultOpen / onOpenChange / modal | Forwarded to Dialog (Radix Root)         | —         |

`className` is not a public prop — styling is controlled exclusively
through `side` and `size`. The `contentProps` bag forwards Dialog Content
props (focus handlers, escape-key handlers) while excluding `style` and
`data-side` because the template uses them internally to project its
side-anchoring + dimension overrides into the composed Dialog Content.
The composed Dialog organism itself already blocks `className` on its
`contentProps` per the no-className-downward cardinal rule, so no escape
hatch leaks into the portaled element through any path.

## Variants

| side     | Anchor (inline `style` projected via `contentProps.style`) | Cross-axis dimension |
| -------- | ---------------------------------------------------------- | -------------------- |
| `top`    | `top: 0; right: 0; left: 0; bottom: auto`                  | Height               |
| `right`  | `top: 0; right: 0; bottom: 0; left: auto`                  | Width                |
| `bottom` | `right: 0; bottom: 0; left: 0; top: auto`                  | Height               |
| `left`   | `top: 0; left: 0; bottom: 0; right: auto`                  | Width                |

| size | Horizontal sides (left/right) | Vertical sides (top/bottom) | Forwarded `Dialog.size` |
| ---- | ----------------------------- | --------------------------- | ----------------------- |
| `sm` | `width: 18rem` (max 80vw)     | `height: 12rem` (max 60vh)  | `sm` (surface `p-4`)    |
| `md` | `width: 20rem` (max 85vw)     | `height: 16rem` (max 70vh)  | `md` (surface `p-5`)    |
| `lg` | `width: 24rem` (max 90vw)     | `height: 20rem` (max 80vh)  | `lg` (surface `p-6`)    |
| `xl` | `width: 32rem` (max 95vw)     | `height: 24rem` (max 90vh)  | `xl` (surface `p-6`)    |

The resolved variants are reflected on the rendered Dialog Content as
`data-slot="dialog-content"` (Dialog's own), `data-size` (from Dialog's
forwarded axis), and `data-side` (added by Sheet via `contentProps`).
Radix Dialog additionally sets `role="dialog"`, `aria-labelledby`
(pointing at the Title), `aria-describedby` (pointing at the Description
when present), and `data-state="open" | "closed"` on the same element.

## Sheet vs Dialog vs Drawer

The three modal surfaces serve distinct interaction models:

- **Dialog** is centered, scrim-modal, and dismisses on escape or
  outside-click. The interaction model is "modal interruption with a
  confirm or cancel". Reach for Dialog when the surface is a centered
  modal that is not specifically anchored to a viewport edge.
- **Drawer** is side-anchored AND gesture-driven (wraps `vaul`). The
  interaction model is "native-mobile-like sheet" — bottom sheets on
  touch, side panels on desktop. Reach for Drawer when the surface
  should feel native and swipe-aware.
- **Sheet** is side-anchored but NOT gesture-driven; it reuses Dialog's
  portal + focus trap + accessibility machinery and only owns the
  positional axis. Reach for Sheet when the surface should be a
  side-anchored, modal-style panel (a settings drawer that doesn't need
  native-feeling gestures, a quick-access side panel, a content browser
  that opens from an edge).

The slot vocabulary is intentionally parallel between Dialog and Sheet
(and Drawer) so a consumer can swap one for the other when the
interaction model changes; the variant axes differ (`size` + `tone` on
Dialog; `side` + `size` on Sheet and Drawer) because the anchoring axis
is meaningful only when the surface is side-anchored.

## Composition

- **Composed organism:** `Dialog` provides the portal (`RadixDialog.Portal`),
  focus trap, escape-key dismissal, outside-click dismissal, scroll lock,
  the `role="dialog"` ARIA wiring, the Title + Description `sr-only`
  fallback, the surface cva (`dialogContentSurfaceVariants`), and the
  `trigger` slot semantics (`<RadixDialog.Trigger asChild>`). Sheet
  delegates every concern except the side-anchoring axis to Dialog.
- **Variant propagation via lookup tables.** The template owns the
  mapping from its own axes into Dialog's axis and into the projected
  inline `style`:

  ```ts
  const dialogSizeForSheetSize = {
    sm: 'sm', md: 'md', lg: 'lg', xl: 'xl',
  } as const;

  const positionStyleForSide = {
    top:    { top: 0, right: 0, left: 0, bottom: 'auto', transform: 'translate(0, 0)' },
    right:  { top: 0, right: 0, bottom: 0, left: 'auto', transform: 'translate(0, 0)' },
    bottom: { right: 0, bottom: 0, left: 0, top: 'auto', transform: 'translate(0, 0)' },
    left:   { top: 0, bottom: 0, left: 0, right: 'auto', transform: 'translate(0, 0)' },
  } as const;

  const dimensionStyleForSideSize = {
    left:   { sm: { width: '18rem', maxWidth: '80vw' }, /* ... */ },
    right:  { sm: { width: '18rem', maxWidth: '80vw' }, /* ... */ },
    top:    { sm: { height: '12rem', maxHeight: '60vh' }, /* ... */ },
    bottom: { sm: { height: '12rem', maxHeight: '60vh' }, /* ... */ },
  } as const;
  ```

  `size` forwards 1:1 to Dialog's `size` axis via the first table so
  Dialog's surface padding + title text scale stay in sync with Sheet's
  size. The `(side, size)` pair combined with the per-side anchoring
  drives the inline `style` that overrides Dialog's centered positioning.
- **No `className` flows downward.** Dialog's `contentProps` type omits
  `'className'` per its cardinal no-className rule. Sheet does NOT
  bypass that restriction — it uses `style` and `data-side` (the only
  passthrough properties Dialog's `contentProps` allows) to project its
  overrides. Inline `style` beats Tailwind utility classes via CSS
  specificity, so the side-anchored positioning lands cleanly. Sheet's
  own public `contentProps` type further excludes `'style'` and
  `'data-side'` so consumers cannot accidentally undo the template-owned
  projection.
- **Slot prop vocabulary.** `trigger`, `title`, `description`, `header`,
  `footer`, and `children` — forwarded one-to-one to Dialog's slot
  vocabulary. The `header` override is mutually exclusive with the
  default visible `title` + `description` rendering at the Dialog layer;
  `title` remains REQUIRED at the Sheet API for the same accessible-name
  reason Dialog requires it.
- **Trigger pattern.** `trigger` is required and typed as
  `React.ReactElement`. The single-element constraint is enforced by
  Dialog (Sheet forwards as-is); fragments, strings, arrays, and `null`
  throw at runtime when Radix calls `React.cloneElement` on the slot.
- **Layer-import direction.** Imports `@/organisms/Dialog` and
  `@/particles/cn` (transitively via Dialog). Does NOT import other
  templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`. If composition of
  another template is required (e.g. the Phase 4 Sidebar's
  mobile-collapsed branch), the answer is "lift the shared
  anchored-surface treatment to `src/particles/anchored-surface.variants.ts`"
  and have both Sheet and Sidebar consume the particle — the canonical
  template-composes-template ban + particle-extraction escape per the
  template-authoring skill.

### The inline-`style` projection (and why it's the right escape)

Sheet's positioning override flows through inline `style` rather than
through `className` because Dialog's `contentProps` type omits
`'className'` — the cardinal no-className rule of the Dialog organism.
That rule is intentional and Sheet respects it.

The escape that works is `style`:

- Inline `style` is part of `React.HTMLAttributes` and Dialog's
  `contentProps` `Omit<..., 'className' | 'children'>` does NOT exclude
  it.
- Inline `style` beats Tailwind utility classes via CSS specificity, so
  Sheet's `top: 0` / `right: 0` / etc. override Dialog's
  `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` centered
  positioning cleanly.
- `data-*` attributes are similarly allowed through `contentProps`, so
  Sheet projects its resolved `side` as `data-side` for test
  introspection and downstream descendant-selector styling.

The trade-off: Dialog's zoom + fade entrance/exit animations are
partially undone by Sheet's `transform: 'translate(0, 0)'` reset (the
reset is required because Dialog applies `-translate-x-1/2`
`-translate-y-1/2` for centering, which Sheet must remove for the
anchoring math to work). This is deliberate until the Phase 4 Sidebar
task lifts the shared anchored-surface treatment into
`src/particles/anchored-surface.variants.ts` — at that point both Sheet
and Sidebar consume the particle (with proper slide-in keyframes per
side) and the animation trade-off goes away.

## Accessibility

- Radix Dialog (via Dialog organism) renders the Content with
  `role="dialog"` and auto-wires `aria-labelledby` to the Title and
  `aria-describedby` to the Description (when present). The Title is
  REQUIRED for axe's `aria-dialog-name` rule to pass — Sheet's API
  enforces this by typing `title` as required.
- Focus is trapped inside the Content while open and restored to the
  trigger on close. Initial focus lands on the first focusable child of
  the Content (typically a footer Button or the first interactive
  element in `children`).
- Escape dismisses the Sheet; outside-click also dismisses it (Radix
  Dialog default). When the Sheet must require an explicit confirm or
  cancel, reach for the `AlertDialog` organism instead — Sheet inherits
  Dialog's dismissal model, not AlertDialog's.
- When `description` is omitted, Radix emits a dev-mode console warning
  about the missing `aria-describedby` wiring. Same advisory rule as
  Dialog — omit the description when the title is self-describing, or
  pass an empty `description=" "` to silence the warning explicitly.
- Tests MUST call `await axe(document.body)` rather than
  `await axe(container)` because Radix portals the Content outside the
  bound render container; a container-scoped axe scan silently misses
  the portaled DOM.
- The trigger inherits its accessible name from the consumer-supplied
  element. Always provide one — Radix's `asChild` projects the trigger
  ARIA wiring onto the element you pass.

## Do / Don't

- DO supply a `title` for every Sheet. DON'T omit it — Radix auto-wires
  `aria-labelledby` to the Title element and axe fails the
  `aria-dialog-name` rule when the dialog has no accessible name.
- DO use `side` to anchor the Sheet to a viewport edge. DO use `size` to
  tune the cross-axis dimension AND the surface padding (the forwarded
  Dialog `size`). DON'T reach for `className` — Sheet doesn't accept
  one, Dialog doesn't accept one through `contentProps`, and the lookup
  tables are the only sanctioned positioning hook.
- DO control selection via `open` + `onOpenChange` when external state
  drives the Sheet. DO use `defaultOpen` for purely local uncontrolled
  state. DON'T mix the two on the same instance.
- DO reach for Sheet when the surface should be a side-anchored,
  modal-style panel. DO reach for Drawer when the surface should feel
  native and gesture-aware. DO reach for Dialog when the surface should
  be a centered modal. DON'T swap the three for purely visual reasons —
  the underlying interaction models differ.
- DON'T pass `className` to Sheet, to the Button elements you supply,
  or via `contentProps` — every layer rejects it. If a styling knob is
  missing, add a variant axis.
- DON'T pass `style` or `data-side` via `contentProps` — both are owned
  by the template's projection. The Sheet `contentProps` type omits
  them so the override is enforced at compile time. (Other style
  properties on `contentProps.style` are merged on top of the
  template-owned positioning — consumer styles never undo the
  positioning because Sheet always wins on the position-related
  properties.)
- DON'T pass a `React.Fragment`, string, array, or `null` as `trigger`
  — the `React.ReactElement` signature (inherited from Dialog) surfaces
  this at compile time because Radix's `asChild` requires a single
  element child.
- DON'T render a Sheet without a `title`. Even when `header` replaces
  the visible heading, the `title` prop drives the `aria-labelledby`
  wiring and is rendered visually-hidden inside the Radix Title.
