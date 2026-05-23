# Menubar

Desktop-style application menu bar built on `@radix-ui/react-menubar`. Each
top-level descriptor in `items[]` renders as a button trigger in the bar
plus a portaled per-menu Content built from a nested items[] array that
mirrors DropdownMenu's discriminated-union shape.

## Import

```ts
import { Menubar } from '@open-tomato/ui-skeleton';
```

## Props

| Prop    | Type                              | Default         |
| ------- | --------------------------------- | --------------- |
| items   | `MenubarItem[]` (required)        | —               |
| size    | `'sm' \| 'md' \| 'lg'`            | `'md'`          |
| density | `'compact' \| 'comfortable'`      | `'comfortable'` |
| value / defaultValue / onValueChange / loop / dir | Forwarded to Radix `Root` | — |

`className` is not a public prop — styling is controlled exclusively
through the `size` and `density` axes. Per-menu Content forwards pass-through
props via the per-entry `contentProps` bag (collision boundary, focus
handlers, side / align) while excluding `className` and `children` so no
escape hatch leaks into the portaled element.

## Items[] descriptor union

The top-level `MenubarItem` is currently the single-shape `MenubarMenuEntry`
type — separators between top-level menus belong to future iterations once
a concrete use case appears.

```ts
interface MenubarMenuEntry {
  type: 'menu';
  value: string;        // React key, data-value, Radix Menu value
  label: React.ReactNode;
  items: MenubarMenuContentItem[];
  disabled?: boolean;
  contentProps?: Omit<RadixContentProps, 'className' | 'children'>;
}
```

Inside each menu's `items`, the descriptor mirrors DropdownMenu's
discriminated union:

| `type`      | Shape                                                                                                                  | Notes                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `item`      | `{ type: 'item', value, label, leading?, trailing?, disabled?, onSelect? }`                                            | Selectable row. `value` is the React key.                   |
| `separator` | `{ type: 'separator' }`                                                                                                | Thin rule between sections.                                 |
| `label`     | `{ type: 'label', label }`                                                                                             | Section heading. Radix renders as `role="presentation"`.    |
| `group`     | `{ type: 'group', label?, items: MenubarLeafEntry[] }`                                                                 | Semantic group wrapping leaf items. Groups do NOT nest.     |

`MenubarLeafEntry` is the non-group union (`item | separator | label`) and
is the only shape allowed inside a group's `items` — the menu tree stays
one level deep per menu. Cascading sub-menus belong to a future iteration
rather than the items[] descriptor surface.

Each entry interface is exported (`MenubarMenuEntry`, `MenubarItemEntry`,
`MenubarSeparatorEntry`, `MenubarMenuLabelEntry`, `MenubarGroupEntry`,
`MenubarLeafEntry`, `MenubarMenuContentItem`) so consumers building items[]
dynamically can `satisfies` against the right union member.

## Variants

| size | Trigger padding / text   | Content min-width |
| ---- | ------------------------ | ----------------- |
| `sm` | `px-2 py-1 text-xs`      | `min-w-[8rem]`    |
| `md` | `px-3 py-1.5 text-sm`    | `min-w-[10rem]`   |
| `lg` | `px-4 py-2 text-base`    | `min-w-[14rem]`   |

| density       | Bar gap | Item padding         |
| ------------- | ------- | -------------------- |
| `compact`     | `gap-0` | `px-2 py-0.5`        |
| `comfortable` | `gap-1` | `px-2 py-1.5`        |

The resolved variants are reflected on the rendered Root as
`data-slot="menubar-root"`, `data-size`, and `data-density`. Each portaled
Content additionally carries `data-slot="menubar-content"`, `data-size`,
`data-density`, and `data-menu-value` (the parent menu's `value`) so tests
can scope queries to a specific menu.

## Composition

- **Wrapped primitive:** `@radix-ui/react-menubar` provides Root, Menu,
  Trigger, Portal, Content, Item, Separator, Label, and Group sub-components
  — including roving-focus navigation between top-level triggers, per-menu
  keyboard navigation, type-ahead matching, collision detection, and the
  ARIA wiring for `role="menubar"`, `role="menuitem"`, `role="menu"`, and
  `role="group"`. The organism composes Root, Menu, Trigger, Portal,
  Content, Group, Label, Item, and Separator.
- **No `className` flows downward.** The organism does not expose
  `className` on the Root or on per-menu `contentProps`. If a styling knob
  is missing, add a variant axis.
- **Items[] descriptor union with required discriminator.** The required
  `type` tag is what makes branch coverage in tests reliable — without it,
  `items.map(...)` cannot narrow between menu / item / separator / label /
  group shapes at the type level. Groups deliberately do NOT nest other
  groups (the `MenubarGroupEntry.items` type is `MenubarLeafEntry[]`) to
  keep each menu's tree one level deep.
- **Trigger labels are descriptor-owned.** The `label` field on each
  `MenubarMenuEntry` is the visible trigger text. The organism wraps the
  label in `<RadixMenubar.Trigger>` directly rather than exposing a slot
  prop, because the menu bar's identity is the labels — there's no use
  case for projecting a custom element into the trigger surface.
- **Layer-import direction.** Imports `@/particles/cn` and
  `@radix-ui/react-menubar`. Does NOT import other organisms, templates,
  pages, or providers — enforced by the `no-restricted-imports` rule in
  `eslint.config.mjs`.

## Accessibility

- Radix renders the Root with `role="menubar"`, each top-level trigger as
  `role="menuitem"`, each open menu's Content with `role="menu"`, items
  inside with `role="menuitem"`, separators with `role="separator"`, and
  groups with `role="group"`. Labels render as `role="presentation"` —
  the visible heading text is purely visual; screen readers reach the row
  via the menu/menuitem traversal, not the label.
- Keyboard navigation between top-level triggers is fully managed by
  Radix's roving-focus group: `ArrowRight` / `ArrowLeft` cycle through
  enabled triggers (the `loop` prop on the Root controls wrap-around),
  `Home` / `End` jump to the first / last enabled trigger. Once a menu
  is open, `ArrowDown` / `ArrowUp` traverse its items, `Enter` / `Space`
  activate the focused item, and `Escape` closes the menu and returns
  focus to the bar.
- The trigger inherits its accessible name from the descriptor's `label`
  — provide a string or a node with an accessible name.
- Tests MUST call `await axe(document.body)` rather than
  `await axe(container)` because Radix portals the per-menu Content
  outside the bound render container; a container-scoped axe scan
  silently misses the portaled DOM.
- The per-item `leading` and `trailing` slots render inside `aria-hidden`
  spans because the row's accessible name comes from `label`. Place the
  shortcut hint (e.g. `⌘X`) in `trailing` to keep it decorative.

## Do / Don't

- DO use `value` as a stable per-menu identifier — it doubles as the
  React key, the `data-value` selector on the trigger, and the Radix Menu
  `value` (read back in `onValueChange`). DON'T reuse the same `value`
  across menus in the same bar; the roving-focus group keys off uniqueness.
- DO interleave `{ type: 'separator' }` descriptors explicitly between
  sections inside a menu. DON'T rely on auto-inserted separators — the
  organism does not generate them.
- DO use the per-menu `contentProps` to forward focus / collision handlers
  to a specific menu's Content. DON'T pass `className` through
  `contentProps` — the type explicitly rejects it.
- DON'T pass `className` to Menubar; there is no public escape hatch. If
  a styling knob is missing, add a variant axis.
- DON'T nest a `type: 'group'` descriptor inside another group's `items`
  — the type system blocks it because `MenubarGroupEntry.items` is typed
  `MenubarLeafEntry[]`. Cascading sub-menus belong to a future iteration
  rather than this items[] surface.
