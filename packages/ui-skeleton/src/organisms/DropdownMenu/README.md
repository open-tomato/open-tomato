# DropdownMenu

Portal-based, items[]-driven organism that wraps
`@radix-ui/react-dropdown-menu` for a click-triggered action menu. Pairs a
consumer-supplied `trigger` with a portaled Content rendering each
descriptor in the discriminated items[] union as the matching Radix
sub-component.

## Import

```ts
import { DropdownMenu } from '@open-tomato/ui-skeleton';
```

## Props

| Prop         | Type                                                                              | Default     |
| ------------ | --------------------------------------------------------------------------------- | ----------- |
| trigger      | `React.ReactElement` (required)                                                   | —           |
| items        | `DropdownMenuItem[]` (required)                                                   | —           |
| size         | `'sm' \| 'md' \| 'lg'`                                                            | `'md'`      |
| align        | `'start' \| 'center' \| 'end'`                                                    | `'center'`  |
| side         | `'top' \| 'right' \| 'bottom' \| 'left'`                                          | `'bottom'`  |
| contentProps | `Omit<RadixContentProps, 'className' \| 'children' \| 'side' \| 'align'>`         | —           |
| open / defaultOpen / onOpenChange / modal / dir | Forwarded to Radix `Root`                              | —           |

`className` is not a public prop — styling is controlled exclusively
through `size`, `align`, and `side`. The `contentProps` bag forwards Radix
Content props (collision boundary, focus handlers, escape-key handlers)
while explicitly excluding `className`, `side`, and `align` so no escape
hatch leaks into the portaled element.

## Items[] descriptor union

`DropdownMenuItem` is a discriminated union with a required `type` tag:

| `type`      | Shape                                                                                                                  | Notes                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `item`      | `{ type: 'item', value, label, leading?, trailing?, disabled?, onSelect? }`                                            | Selectable row. `value` is the React key.                   |
| `separator` | `{ type: 'separator' }`                                                                                                | Thin rule between sections.                                 |
| `label`     | `{ type: 'label', label }`                                                                                             | Section heading. Radix renders as `role="presentation"`.    |
| `group`     | `{ type: 'group', label?, items: DropdownMenuLeafEntry[] }`                                                            | Semantic group wrapping leaf items. Groups do NOT nest.     |

`DropdownMenuLeafEntry` is the non-group union (`item | separator | label`)
and is the only shape allowed inside a group's `items` — the menu tree
stays one level deep. Sub-menus belong to a future Sub-menu organism rather
than the items[] descriptor surface.

Each entry interface is exported (`DropdownMenuItemEntry`,
`DropdownMenuSeparatorEntry`, `DropdownMenuLabelEntry`,
`DropdownMenuGroupEntry`, `DropdownMenuLeafEntry`) so consumers building
items[] dynamically can `satisfies` against the right union member.

## Variants

| size | Item padding / text   | Content min-width     |
| ---- | --------------------- | --------------------- |
| `sm` | `px-2 py-1 text-xs`   | `min-w-[8rem]`        |
| `md` | `px-2 py-1.5 text-sm` | `min-w-[10rem]`       |
| `lg` | `px-3 py-2 text-base` | `min-w-[14rem]`       |

| align    | Radix Content `align` |
| -------- | --------------------- |
| `start`  | `start`               |
| `center` | `center`              |
| `end`    | `end`                 |

| side     | Radix Content `side` |
| -------- | -------------------- |
| `top`    | `top`                |
| `right`  | `right`              |
| `bottom` | `bottom`             |
| `left`   | `left`               |

The resolved variants are reflected on the rendered Content as
`data-slot="dropdown-menu-content"`, `data-size`, `data-align`, and
`data-side`. Radix Content additionally sets its own `data-side` /
`data-align` after collision detection — the organism's `data-side` /
`data-align` mirror the consumer's prop values so tests can assert
propagation independently of Radix's post-collision math.

## Composition

- **Wrapped primitive:** `@radix-ui/react-dropdown-menu` provides Root,
  Trigger, Portal, Content, Item, Separator, Label, Group, and Sub
  sub-components — including focus management, keyboard navigation,
  type-ahead matching, collision detection, and the `role="menu"` /
  `role="menuitem"` ARIA wiring. The organism composes Root, Trigger,
  Portal, Content, Group, Label, Item, and Separator; the items[]
  descriptor union maps each entry to the matching Radix component.
- **No `className` flows downward.** The `contentProps` type explicitly
  omits `'className'` so consumers cannot inject styling into the portaled
  Content. If a styling knob is missing, add a variant axis.
- **Items[] descriptor union with required discriminator.** The required
  `type` tag is what makes branch coverage in tests reliable — without it,
  `items.map(...)` cannot narrow between item / separator / label / group
  shapes at the type level. Groups deliberately do NOT nest other groups
  (the `DropdownMenuGroupEntry.items` type is `DropdownMenuLeafEntry[]`)
  to keep the menu tree one level deep.
- **Slot prop vocabulary.** `trigger` is the only slot prop; everything
  else is data-driven via the items[] descriptor. The per-item `leading`
  and `trailing` slots inside `DropdownMenuItemEntry` are decorative —
  rendered raw inside an `aria-hidden` span sized by the icon cva — and
  the row's accessible name comes from the `label` field.
- **Trigger pattern.** `trigger` is required and typed as
  `React.ReactElement` (NOT `ReactNode`) so the organism can wrap it via
  Radix's `Trigger asChild`. Fragments, strings, arrays, and `null` throw
  at runtime when Radix calls `React.cloneElement` — the element constraint
  surfaces this at compile time.
- **No overlay backdrop.** Unlike Dialog / AlertDialog / Drawer, the
  DropdownMenu does NOT render a scrim overlay — Radix only portals the
  menu surface itself, and outside-click / escape dismissal is handled by
  the underlying menu primitive without a blocking backdrop. The `z-50`
  class on the Content keeps the menu above sibling content.
- **Layer-import direction.** Imports `@/particles/cn` and
  `@radix-ui/react-dropdown-menu`. Does NOT import other organisms,
  templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Accessibility

- Radix renders the Content with `role="menu"`, each enabled item with
  `role="menuitem"`, each separator with `role="separator"`, and each
  group with `role="group"`. Labels render as `role="presentation"` — the
  visible heading text is purely visual; screen readers reach the row
  via the menu/menuitem traversal, not the label.
- Keyboard navigation is fully managed by Radix: arrow keys traverse
  items (skipping disabled ones), `Home` / `End` jump to first / last,
  type-ahead matches against the visible label, `Enter` activates the
  focused item, and `Escape` closes the menu and returns focus to the
  trigger.
- The trigger inherits its accessible name from the consumer-supplied
  element. Always provide one — Radix's `asChild` projects the trigger
  ARIA wiring (including `aria-haspopup="menu"` and
  `aria-expanded="true | false"`) onto your element.
- Tests MUST call `await axe(document.body)` rather than
  `await axe(container)` because Radix portals the Content outside the
  bound render container; a container-scoped axe scan silently misses the
  portaled DOM.
- The per-item `leading` and `trailing` slots render inside `aria-hidden`
  spans because the row's accessible name comes from `label`. If a
  consumer needs an icon-only menu item, set the `label` to the
  accessible name and place the icon in `leading` (or use a
  `visually-hidden` label pattern).

## Do / Don't

- DO supply an accessible name on the consumer-supplied `trigger`
  element (e.g. via the Button's children or `aria-label`). DON'T leave
  the trigger nameless — Radix projects ARIA wiring onto the element but
  cannot invent the name.
- DO use `value` as a stable per-item identifier — it doubles as the
  React key and the `data-value` selector. DON'T reuse the same `value`
  across items in the same items[] tree (including nested group items);
  React will warn and the rendering branch coverage drops.
- DO control selection via `open` + `onOpenChange` when external state
  drives the menu. DO use `defaultOpen` for purely local uncontrolled
  state. DON'T mix the two on the same instance.
- DO interleave `{ type: 'separator' }` descriptors explicitly between
  sections. DON'T rely on auto-inserted separators — the organism does
  not generate them, and missing separators visually collapse adjacent
  groups.
- DON'T pass `className` to DropdownMenu, to the trigger element, or via
  `contentProps` — the organism and the `contentProps` type both reject
  it. If a styling knob is missing, add a variant axis.
- DON'T pass a `React.Fragment`, string, array, or `null` as `trigger` —
  the descriptor signature (`React.ReactElement`) surfaces this at
  compile time because Radix's `asChild` requires a single element child.
- DON'T nest a `type: 'group'` descriptor inside another group's `items`
  — the type system blocks it because `DropdownMenuGroupEntry.items` is
  typed `DropdownMenuLeafEntry[]`. Sub-menus belong to a future Sub-menu
  organism rather than this items[] surface.
