# Command

Stateful items[]-driven organism that wraps [`cmdk`](https://cmdk.paco.me/)
for a type-ahead command palette. Composes the Input atom's control surface
via the `inputControlVariants` primitives (the InputGroup
compose-atom-primitives pattern — see
[`skills/organism-authoring/SKILL.md`](../../../skills/organism-authoring/SKILL.md))
so the search field stays visually aligned with the standalone Input atom
without doubling its frame.

## Import

```ts
import { Command } from '@open-tomato/ui-skeleton';
```

## Props

| Prop                 | Type                                | Default            |
| -------------------- | ----------------------------------- | ------------------ |
| items                | `CommandItem[]` (required)          | —                  |
| size                 | `'sm' \| 'md' \| 'lg'`              | `'md'`             |
| label                | `string`                            | `'Command palette'`|
| placeholder          | `string`                            | —                  |
| showSearch           | `boolean`                           | `true`             |
| searchDisabled       | `boolean`                           | `false`            |
| search               | `string` (controlled)               | —                  |
| defaultSearch        | `string`                            | `''`               |
| onSearchChange       | `(search: string) => void`          | —                  |
| value                | `string` (controlled focused item)  | —                  |
| defaultValue         | `string`                            | `''`               |
| onItemValueChange    | `(value: string) => void`           | —                  |
| onItemSelect         | `(value: string) => void`           | —                  |
| loop / shouldFilter / filter / disablePointerSelection / vimBindings | Forwarded to cmdk `Command` root | — |

`className` is not a public prop — styling is controlled exclusively
through the `size` axis. All other native HTMLDivElement attributes are
forwarded to the cmdk root via the rest spread; `className` is omitted at
the type level.

## Items[] descriptor union

| `type`      | Shape                                                                                                                                  | Notes                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `item`      | `{ type: 'item', value, label, keywords?, leading?, trailing?, shortcut?, disabled?, onSelect? }`                                       | Selectable row. `value` is the React key, `data-value`, and the string cmdk's filter scores.   |
| `separator` | `{ type: 'separator' }`                                                                                                                | Thin rule between sections at the root or inside a group.                                       |
| `group`     | `{ type: 'group', heading, items: CommandLeafEntry[] }`                                                                                | Semantic group of items rendered under a heading. Groups do NOT nest other groups.              |
| `empty`     | `{ type: 'empty', label }`                                                                                                             | Auto-rendered "no results" message when the active search query matches zero items.             |

`CommandLeafEntry` is the non-group / non-empty union (`item | separator`)
and is the only shape allowed inside a group's `items` — the command tree
stays one level deep. Each entry interface (`CommandItemEntry`,
`CommandSeparatorEntry`, `CommandGroupEntry`, `CommandEmptyEntry`,
`CommandLeafEntry`, `CommandItem`) is exported so consumers building
items[] dynamically can `satisfies` against the right union member.

### Filter behaviour

cmdk scores each item against the active search query using the descriptor's
`value` plus any `keywords` you provide. Set `shouldFilter={false}` on the
Command root (forwarded via the rest spread) to disable cmdk's internal
filter and drive the items[] yourself.

## Variants

| size | Input row padding / text | Item padding / text     | List max-height | Icon size  |
| ---- | ------------------------ | ----------------------- | --------------- | ---------- |
| `sm` | `px-2 py-1.5 text-xs`    | `px-2 py-1 text-xs`     | `240px`         | `size-3`   |
| `md` | `px-3 py-2 text-sm`      | `px-2 py-1.5 text-sm`   | `300px`         | `size-4`   |
| `lg` | `px-4 py-2.5 text-base`  | `px-3 py-2 text-base`   | `360px`         | `size-5`   |

The resolved variant is reflected on the rendered root as
`data-slot="command-root"` and `data-size`. cmdk additionally paints
`data-selected="true" | "false"` on the focused item, `data-disabled="true"`
on disabled items, and `data-value` on every item — the selectors above
pick those up for the accent treatment.

## Composition

- **Composed atom primitives:** the Input atom's `inputControlVariants`
  vocabulary is mirrored by `commandInputControlVariants` so the search
  field gets the same transparent / flex-1 / muted-placeholder treatment as
  the standalone Input without doubling its all-around border + focus ring.
  This is the InputGroup
  compose-atom-primitives-not-the-atom-component pattern — wrapping the
  atom directly would double the frame against the Command root's own
  border.
- **Wrapped library:** `cmdk` provides Root, Input, List, Group, Item,
  Separator, and Empty sub-components — including the type-ahead filter,
  `command-score`-based ranking, keyboard navigation (arrow keys + Enter +
  vim-style ctrl+n/j/p/k bindings), `--cmdk-list-height` CSS variable for
  height animation, and the ARIA wiring (`role="dialog"` on the root,
  `role="combobox"` on the input, `role="listbox"` on the list,
  `role="option"` on each item).
- **Variant propagation via lookup tables.** The `size` axis is a direct
  passthrough into every subpart cva
  (`commandInputWrapperVariants({ size })`,
  `commandItemVariants({ size })`, etc.), so the propagation surface here
  is the cva indexer itself — no explicit lookup table is required because
  the organism owns one axis and the subparts share its vocabulary.
- **No `className` flows downward.** The organism does not expose
  `className` on its public API and does not pass `className` into the
  Input atom (we use the atom's variant *primitives* directly instead). If
  a styling knob is missing, add a variant axis.
- **Internal state via the controlled-passthrough pattern.** When
  uncontrolled, the organism manages `search` and `value` via
  `React.useState`. When the consumer passes `search` + `onSearchChange`
  (or `value` + `onItemValueChange`), the organism delegates to that
  controlled flow and never flips its internal state. Mirrors Accordion's
  controlled-passthrough recipe documented in the organism-authoring skill.
- **Slot prop vocabulary.** `items[]` is the only data slot; each entry's
  `leading`, `trailing`, `shortcut`, and `label` render raw inside an
  `aria-hidden` span (decorative slots) or the row label respectively. The
  organism does not inject styling into consumer-supplied slot nodes
  beyond wrapping them in size-driven icon / shortcut frames.
- **Layer-import direction.** Imports `@/particles/cn`, `cmdk`, and the
  sibling variants module. Does NOT import other organisms, templates,
  pages, or providers — enforced by the `no-restricted-imports` rule in
  `eslint.config.mjs`.

## Accessibility

- cmdk renders the Root with `role="dialog"` and a private accessible
  name derived from the `label` prop (default `'Command palette'`).
  Override `label` when the surrounding context already names the region.
- The input row is rendered with `role="combobox"`, `aria-expanded="true"`,
  and `aria-controls` pointing at the list — cmdk wires the
  `aria-activedescendant` reference automatically as the focused item
  changes.
- Each item row is `role="option"` with `aria-selected` reflecting cmdk's
  selection state; the list is `role="listbox"`. The selection state is
  what makes type-ahead search behave correctly with screen readers.
- Keyboard navigation: `ArrowDown` / `ArrowUp` traverse enabled items;
  `Enter` activates the focused item; `Home` / `End` jump to the first /
  last enabled item; typing into the input narrows the list via the
  type-ahead filter. cmdk's optional `vimBindings` (default `true`) adds
  ctrl+n/j/p/k as alternate traversal shortcuts.
- The per-item `leading`, `trailing`, and `shortcut` slots render inside
  `aria-hidden` spans because the row's accessible name comes from
  `label`. Place keyboard-shortcut hints in `shortcut` rather than the
  visible row label so the row name reads cleanly.
- Tests for Command can scan `container` rather than `document.body` —
  cmdk's Command (non-Dialog form) renders inline inside the bound
  container, unlike Radix portal-based organisms. The
  `region` axe rule is disabled for the component-isolation scan because
  `role="dialog"` is not auto-exempted from the region requirement and the
  consumer's app shell provides the surrounding landmark.

## Do / Don't

- DO use `value` as the stable per-item identifier — it doubles as the
  React key, the `data-value` selector, and the string cmdk's filter
  scores. DON'T reuse the same `value` across descriptors (including
  across nested groups); collisions break the selection model.
- DO supply `keywords: ['logout', 'exit']` for aliases and i18n synonyms.
  cmdk scores keywords alongside `value` so the filter still ranks the
  item highly when the consumer types an alias instead of the visible
  label.
- DO place keyboard-shortcut hints in `shortcut` (rendered as a decorative
  `aria-hidden` right-aligned span). DON'T put them in `label` — the row's
  accessible name should read as the action, not the action plus its
  shortcut spelled phonetically.
- DO include a single `{ type: 'empty', label: '...' }` descriptor at the
  root level when you want a custom no-results message; cmdk
  auto-mounts / unmounts the element based on the filter. DON'T include
  multiple `empty` descriptors — only the first will render and the others
  are dead code.
- DO use the controlled `search` / `onSearchChange` pair when external
  state drives the query (e.g. lifted state for an outer Combobox host).
  DO use `defaultSearch` for purely local uncontrolled state. DON'T mix
  the two on the same instance.
- DON'T pass `className` to Command, the items, or the slots — there is no
  public escape hatch. If a styling knob is missing, add a variant axis.
- DON'T nest a `type: 'group'` descriptor inside another group's `items`
  — the type system blocks it because `CommandGroupEntry.items` is typed
  `CommandLeafEntry[]`. Cascading sub-menus belong to a future iteration.
