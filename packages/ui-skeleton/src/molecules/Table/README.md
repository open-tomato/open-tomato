# Table

Stateless molecule that renders a structured `<table>` from `caption`,
`headers`, `rows`, and `footer` slot props. Composes the `Typography` atom for
the caption; header and body cells are styled via descendant selectors driven
by the `<table>` root's cva. Use for simple, statically-shaped tabular data —
sortable columns, sticky headers, virtualization, and pagination are organism
concerns and live outside this molecule.

## Import

```ts
import { Table } from '@open-tomato/ui-skeleton';
```

## Props

| Prop     | Type                                  | Default          |
| -------- | ------------------------------------- | ---------------- |
| variant  | `'default' \| 'striped' \| 'bordered'` | `'default'`     |
| size     | `'sm' \| 'md' \| 'lg'`                | `'md'`           |
| density  | `'comfortable' \| 'compact'`          | `'comfortable'`  |
| caption  | `ReactNode`                           | —                |
| headers  | `ReactNode[]`                         | —                |
| rows     | `ReactNode[][]`                       | —                |
| footer   | `ReactNode[]`                         | —                |
| children | `ReactNode` (rendered after the data-driven sections) | — |

All other props are forwarded to the rendered `<table>` element.
`className` is not a public prop — styling is controlled exclusively
through `variant`, `size`, and `density`.

## Variants

| variant    | Visual                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| `default`  | Clean rows with a bottom border between body rows                       |
| `striped`  | Zebra striping on even body rows (`bg-muted/40`)                        |
| `bordered` | Full borders on the table and every cell                                |

| size | Text size  | Cell horizontal padding |
| ---- | ---------- | ----------------------- |
| `sm` | `text-xs`  | `px-2`                  |
| `md` | `text-sm`  | `px-3`                  |
| `lg` | `text-base`| `px-4`                  |

| density       | Cell vertical padding |
| ------------- | --------------------- |
| `comfortable` | `py-3`                |
| `compact`     | `py-1.5`              |

The resolved variants are reflected on the rendered root as
`data-variant="<name>"`, `data-size="<name>"`, and `data-density="<name>"` for
downstream styling and testing. Internal slots expose `data-slot` attributes:
`table-root` on the `<table>`, `table-caption` on the `<caption>`,
`table-thead` / `table-tbody` / `table-tfoot` on each section, `table-row` on
each `<tr>`, `table-head` on each `<th>`, and `table-cell` on each `<td>`.

## Composition

Table is a stateless data-driven molecule:

- **Composed atom:** `Typography` renders the caption with
  `variant="caption"`. Header and body cells are not wrapped in `Typography` —
  the `<table>` root's cva styles them through descendant selectors
  (`[&_th]:`, `[&_td]:`), which avoids the per-cell wrapper cost on large data
  sets while preserving the visual scale set by the `size` axis.
- **Variant propagation lives in cva.** Because cells are styled via
  descendant selectors, the molecule does NOT need a lookup table mapping its
  own axes to a composed atom's axes — the `size` and `density` axes resolve
  directly to padding utilities on the `<table>` root.
- **No `className` flows downward.** The composed `Typography` for the
  caption is invoked without `className`; cells receive their visual scale
  exclusively from descendant selectors on the table root. If a knob the
  variants don't cover is needed, add a variant axis on Table OR on
  Typography — don't open an escape hatch.
- **Slot prop vocabulary.** `caption`, `headers`, `rows`, `footer`. Slot
  content renders raw inside the composed atoms; Table does not inject
  styling into consumer-supplied nodes. `children` is a passthrough for
  consumers who need to append a fully custom `<tbody>` / `<tr>` block
  beyond the data-driven `rows` slot.
- **Layer-import direction.** Table imports `@/atoms/Typography` and
  `@/particles/cn`. It does NOT import other molecules, organisms,
  templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`.

## Overflow

Table does NOT own scroll behavior. On narrow viewports, wrap it in the
`ScrollArea` atom and let the atom manage horizontal scrolling:

```tsx
<ScrollArea>
  <Table headers={headers} rows={rows} />
</ScrollArea>
```

## Accessibility

- Renders a real `<table>` so assistive tech announces row / column counts.
- Header cells render as `<th scope="col">` so screen readers correctly
  associate each body cell with its column header.
- The caption renders inside a real `<caption>` element so assistive tech
  announces it as the table's title; `caption-bottom` keeps the visual
  placement below the body.
- For tables that are decorative (purely visual layout), use a different
  primitive — `<table>` carries semantic meaning that screen readers expose.
- For sortable columns, sticky headers, or row selection, promote to a Data
  Table organism — those concerns add state that violates the molecule rule.

## Do / Don't

- DO tune visuals through `variant`, `size`, and `density`. DO wrap Table in
  `ScrollArea` for horizontal overflow.
- DO supply `caption` for context — the `<caption>` improves screen-reader
  announcement and is rendered below the body via `caption-bottom`.
- DON'T pass `className` to Table or to the composed Typography — atoms
  reject it at the type level. If a styling knob is missing, add a variant
  axis.
- DON'T use Table for sortable, selectable, paginated, or virtualized data —
  those are organism-level concerns. Promote to a Data Table organism instead
  of extending the molecule.
- DON'T mix `rows` with `children`-supplied rows for the same logical body
  data — pick one source. `children` is intended for genuinely custom markup
  appended after the data-driven sections.
