# DataTable

Heavy stateful organism composing the `Table` molecule, the `ButtonGroup`
molecule, the `Checkbox` atom, the `Input` atom, and `Button` atoms with
lucide chevron / arrow icons. Generic over a row type `<T>` via the
`columns: ColumnDef<T>[]` and `data: T[]` shape. Owns the sort / filter /
pagination / selection state internally.

## Import

```ts
import { DataTable, type ColumnDef } from '@open-tomato/ui-skeleton';
```

## Props

| Prop                | Type                                                | Default                 |
| ------------------- | --------------------------------------------------- | ----------------------- |
| data                | `T[]`                                               | —                       |
| columns             | `ColumnDef<T>[]`                                    | —                       |
| pageSize            | `number`                                            | `10`                    |
| sortable            | `boolean`                                           | `false`                 |
| filterable          | `boolean`                                           | `false`                 |
| selectable          | `boolean`                                           | `false`                 |
| getRowId            | `(row: T, index: number) => string \| number`       | `(_, index) => index`   |
| onSelectionChange   | `(ids: (string \| number)[]) => void`               | —                       |
| filterPlaceholder   | `string`                                            | `'Filter…'`             |
| emptyMessage        | `ReactNode`                                         | `'No data to display.'` |
| size                | `'sm' \| 'md' \| 'lg'`                              | `'md'`                  |
| density             | `'comfortable' \| 'compact'`                        | `'comfortable'`         |
| aria-label          | `string`                                            | —                       |

`className` is not a public prop — styling is controlled exclusively through
`size` and `density`. The root `<div>` does not currently forward a ref; the
generic-forwardRef pattern is non-trivial for a component this wide and there
is no real use case for measuring or focusing the root container. Refs to
individual checkboxes, the filter input, or pagination buttons should be set
by consumers via cell renderers / wrapping if needed.

### ColumnDef

| Field      | Type                                  | Default | Notes                                                                                       |
| ---------- | ------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| id         | `string`                              | —       | Stable identifier — React key + sort-state key + `data-column-id`; unique within `columns[]` |
| header     | `ReactNode`                           | —       | Header content rendered inside the `<th>` (or inside the sort button when sortable)         |
| accessor   | `(row: T) => ReactNode`               | —       | Drives sort comparison, filter substring match, and cell rendering when `cell` is omitted   |
| sortable   | `boolean`                             | `false` | When both this AND DataTable's `sortable` are `true`, the header becomes a sort button       |
| filterable | `boolean`                             | `false` | When both this AND DataTable's `filterable` are `true`, the column participates in filtering |
| cell       | `(row: T) => ReactNode`               | —       | Optional cell renderer override; `accessor` still drives sort / filter                       |

## Variants

| size | Toolbar Input | Sort icon | Empty padding | Checkbox | Pagination Button |
| ---- | ------------- | --------- | ------------- | -------- | ----------------- |
| `sm` | `size=sm`     | `size-3`  | `py-4 text-xs`  | `size=sm` | `size=sm`         |
| `md` | `size=md`     | `size-3.5`| `py-6 text-sm`  | `size=md` | `size=md`         |
| `lg` | `size=lg`     | `size-4`  | `py-8 text-base`| `size=lg` | `size=lg`         |

| density       | Table cell padding                |
| ------------- | --------------------------------- |
| `comfortable` | `py-3` (from Table molecule)      |
| `compact`     | `py-1.5` (from Table molecule)    |

The resolved variants are reflected on:

- The root as `data-slot="data-table-root"`, `data-size`, `data-density`.
- The composed Table as its own `data-slot="table-root"` + `data-size` + `data-density` (variant passthrough).
- Each sortable header button as `data-slot="data-table-sort-button"`, `data-column-id`, `data-sort="asc" | "desc" | "none"`.
- Each non-sortable header as `data-slot="data-table-header-label"` + `data-column-id`.
- The master selection checkbox as `data-slot="data-table-select-all"`.
- Each per-row selection checkbox as `data-slot="data-table-select-row"` + `data-row-id`.
- The filter Input as `data-slot="data-table-filter-input"`.
- The empty-state surface as `data-slot="data-table-empty"`.
- The pagination footer as `data-slot="data-table-pagination"`.

## Composition

- **Composed molecules and atoms:** `Table` provides the `<table>` /
  `<thead>` / `<tbody>` / `<tfoot>` shell driven by `headers[]` and
  `rows[][]` slot props. `ButtonGroup` provides the role=group wrapper for
  the pagination prev / next pair. `Checkbox` renders both the master
  selection control (with `indeterminate` tri-state) and per-row
  checkboxes. `Input` renders the toolbar filter field. `Button` (atoms)
  with lucide `ChevronLeft` / `ChevronRight` icons render the pagination
  navigation controls.
- **Variant propagation via lookup tables.** The organism owns the mapping
  from its own `size` / `density` axes to each composed surface:

  ```ts
  const buttonSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const inputSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const checkboxSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const tableSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const tableDensityForDensity = {
    comfortable: 'comfortable',
    compact: 'compact',
  } as const;
  const chevronSizeForSize = { sm: 'size-3', md: 'size-4', lg: 'size-5' } as const;
  ```

  Direct passthrough is used everywhere — the axes align — but explicit
  lookup tables stay in place so a future axis rename on any composed
  surface remains a one-line change here.
- **No `className` flows downward.** Neither the composed Table, ButtonGroup,
  Checkbox, Input, nor Button accepts `className` at the type level. The
  DataTable does not pass any class string into any composition beyond the
  `cn(...)` output of its own variant cvas (sort button, sort icon, footer,
  toolbar, empty surface, page info).
- **The Pagination organism is NOT composed.** The dedicated `Pagination`
  organism is a sibling under `src/organisms/`; the organism layer's
  `no-restricted-imports` ESLint guard blocks organism-to-organism imports.
  DataTable instead composes the same constituent pieces (`ButtonGroup` +
  `Button` + lucide chevrons) inline for its footer. The inline pagination
  is intentionally simpler than the standalone `Pagination` (prev / next +
  page indicator, no sibling ellipsis range) since DataTable's footer
  rarely needs the full sibling slot budget.
- **Slot prop vocabulary.** The data slots are `data` (rows) and
  `columns` (descriptors). There is no `header` / `footer` / `title`
  override slot — those layers belong to a wrapping template. `columns[]`
  is a homogeneous descriptor (no discriminated union); per-column
  capabilities (`sortable`, `filterable`, `cell`) are opt-in via boolean
  / function fields. The filter placeholder and empty message are
  scalar slot props (`filterPlaceholder`, `emptyMessage`).
- **Internal state via four `useState` hooks.** Sort coordinate
  (`null | { columnId, direction }`), filter query (string), current page
  (1-indexed), selected row ids (`Set<DataTableRowId>`). All four are
  internal — DataTable does NOT expose a controlled-passthrough API in
  this iteration. The only callback exposed is `onSelectionChange`. The
  derived display slice flows through `filter → sort → page` and is the
  input to both the visible-checkbox indeterminate logic and the page
  indicator.
- **Pure helpers exposed for testing.** `compareNodeValues(a, b)` and
  `matchesFilter(value, query)` are exported alongside the component as
  pure helpers so tests can validate the sort / filter contracts without
  rendering. Mirrors the Combobox organism's `matchesQuery` and the
  Pagination organism's `buildPaginationRange` pattern; each helper
  carries the focused `react-refresh/only-export-components` eslint-disable
  documented in `skills/organism-authoring/SKILL.md`.
- **Generic preserved through a cast around the function.** React function
  components cannot natively express `<T>` generics in their type. The
  canonical pattern (used here) is to author `DataTableImpl` as a plain
  generic function and bind the public `DataTable` export through a
  one-step `as` assertion. The `as` cast preserves the generic in the
  public type while letting the internal implementation be a single
  generic function.
- **Layer-import direction.** Imports `@/molecules/Table`,
  `@/molecules/ButtonGroup`, `@/atoms/Button`, `@/atoms/Checkbox`,
  `@/atoms/Input`, and `@/particles/cn`. Does NOT import other organisms,
  templates, pages, or providers — enforced by the
  `no-restricted-imports` rule in `eslint.config.mjs`. If composition of
  another organism is required, the answer is "promote to template" or
  "lift the shared surface to a particle", not "open a guard exception".

## Accessibility

- The composed `<table>` is rendered by the Table molecule; consumers
  should always pass `aria-label` (or a `caption` via wrapping) so the
  table has an accessible name. The label flows through Table's `{...rest}`
  to the rendered `<table>`.
- Sortable column headers are rendered as native `<button>` elements
  inside the `<th>` cell. The button's `aria-label` is composed as
  `"Sort by <header>, currently <ascending | descending | unsorted>"` so
  screen readers announce both the column and the active direction.
  `data-sort="asc" | "desc" | "none"` is mirrored on the button for
  styling and tests.
- The selection master checkbox carries the `'indeterminate'` tri-state
  when some-but-not-all visible rows are selected. Clicking from the
  indeterminate state selects every visible row; clicking from the
  checked state deselects every visible row. The master is disabled
  (via the native `disabled` attribute) when no rows are visible.
- The pagination footer is rendered as a `<nav aria-label="Pagination">`
  with explicit `Previous page` / `Next page` labels on the navigation
  buttons. Both buttons are auto-disabled at the boundaries via the
  native `disabled` attribute. The page indicator (`Page X of Y`)
  renders inside the nav so it's announced by the same `aria-label`.
- The filter `Input` carries `aria-label` matching `filterPlaceholder` so
  the substring search field always has an accessible name even when no
  visible label is rendered.
- The empty-state surface is rendered with `role="status"` +
  `aria-live="polite"` so screen readers announce when the filter clears
  the dataset.

## Do / Don't

- DO tune visuals through `size` and `density`. If a knob isn't covered,
  add a variant axis — styling is the organism's responsibility, not the
  consumer's.
- DO return a primitive (string / number) from a sortable / filterable
  column's `accessor`; the comparator and substring matcher work best on
  primitives. Use `cell` for visual overrides while keeping `accessor`
  primitive-returning.
- DO supply a stable `getRowId` whenever rows have intrinsic identifiers
  (database id, slug, UUID); the default `(_, index) => index` is fragile
  across `data` re-orderings and selections will drift.
- DO pass `aria-label` (or wrap the table in a labelling region) so the
  underlying `<table>` has an accessible name.
- DON'T pass `className` to DataTable — the organism rejects it at the
  type level. If a styling knob is missing, add a variant axis here or
  on the composed molecule / atom.
- DON'T expect controlled `sort` / `filter` / `page` props in this
  iteration — all four are internal-only. Selection is observable via
  `onSelectionChange` but the underlying `Set` is internal too; consumers
  must mirror it locally if they need persistent state.
- DON'T reuse the same `id` across `columns[]` entries — `id` doubles as
  the React key, the `data-column-id` selector, and the sort-state
  identifier; collisions break sort and selection.
- DON'T attempt to compose the standalone `Pagination` organism inside a
  template that wraps DataTable. The two have independent state; the
  inline pagination footer is part of DataTable's contract and cannot be
  swapped out without re-implementing it.
