# Pagination

Composition-only organism that composes the `ButtonGroup` molecule, the
`Button` atom, and lucide-react chevron icons into a page-navigation control.
The displayed range (current ± `siblingCount`, plus optional first / last
anchors, plus ellipses for skipped ranges) is computed by the pure
`buildPaginationRange` helper at the top of the component file. Authored from
scratch — no Radix dependency, no portal, no internal state.

## Import

```ts
import { Pagination } from '@open-tomato/ui-skeleton';
```

## Props

| Prop          | Type                            | Default        |
| ------------- | ------------------------------- | -------------- |
| page          | `number`                        | —              |
| pageCount     | `number`                        | —              |
| onPageChange  | `(page: number) => void`        | —              |
| siblingCount  | `number`                        | `1`            |
| showFirstLast | `boolean`                       | `false`        |
| size          | `'sm' \| 'md' \| 'lg'`          | `'md'`         |
| align         | `'start' \| 'center' \| 'end'`  | `'center'`     |
| aria-label    | `string`                        | `'Pagination'` |

All other props are forwarded to the rendered `<nav>` root. `className` is
not a public prop — styling is controlled exclusively through `size` and
`align`.

`page` is 1-indexed. Values outside `[1, pageCount]` are clamped before the
range is built and before `onPageChange` is allowed to fire. Clicks on the
current page never fire `onPageChange`, so a stale `page` won't double-fire.
`pageCount <= 0` returns `null` (renders nothing).

## Variants

| size | Button size | Chevron icon | Ellipsis box |
| ---- | ----------- | ------------ | ------------ |
| `sm` | `size="sm"` | `size-3`     | `size-8`     |
| `md` | `size="md"` | `size-4`     | `size-9`     |
| `lg` | `size="lg"` | `size-5`     | `size-10`    |

| align    | Layout            |
| -------- | ----------------- |
| `start`  | `justify-start`   |
| `center` | `justify-center`  |
| `end`    | `justify-end`     |

The resolved variants are reflected on the rendered root as
`data-slot="pagination-root"`, `data-size="<name>"`, and
`data-align="<name>"`. Slots expose
`data-slot="pagination-group"`, plus
`data-slot="pagination-first" | "pagination-previous" | "pagination-page" | "pagination-next" | "pagination-last"`
on the corresponding Button, plus `data-slot="pagination-ellipsis"` with
`data-position="leading" | "trailing"` on each ellipsis span. The current
page Button additionally carries `aria-current="page"` and `data-active=""`.

## Range computation

The pure helper `buildPaginationRange({ page, pageCount, siblingCount })` is
exported alongside the component and may be used directly to mirror the
display logic in adjacent UI (e.g., a server-rendered page-count badge).

The total visible slot budget is `2 * siblingCount + 5` (first + 2 siblings
on each side of current + last + 2 ellipses). When `pageCount` fits inside
the budget, every page is rendered without ellipses. Otherwise:

- **No left ellipsis, has right ellipsis** — leading `3 + 2 * siblingCount`
  pages, followed by a trailing ellipsis and the last page.
- **Has left ellipsis, no right ellipsis** — the first page, followed by a
  leading ellipsis and the trailing `3 + 2 * siblingCount` pages.
- **Both ellipses** — `1` + leading ellipsis + (current ± siblings) +
  trailing ellipsis + `pageCount`.

Each entry is one of:

```ts
type PaginationRangeItem =
  | { type: 'page'; page: number }
  | { type: 'ellipsis'; position: 'leading' | 'trailing' };
```

## Composition

- **Composed molecule and atoms:** `ButtonGroup` provides the horizontal row
  layout (with `gap-2` between cells via `attached={false}`) and the
  `role="group"` semantics on the inner wrapper, and `Button` renders every
  interactive cell (first / previous / page / next / last). lucide-react
  chevron icons (`ChevronsLeft`, `ChevronLeft`, `ChevronRight`,
  `ChevronsRight`, `MoreHorizontal`) render inside the nav Buttons and the
  ellipsis spans.
- **Variant propagation via lookup tables.** The organism owns the mapping
  from its own `size` axis to each composed piece's axis:

  ```ts
  const buttonSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const chevronSizeForSize = { sm: 'size-3', md: 'size-4', lg: 'size-5' } as const;
  ```

  `size` maps to each `Button`'s `size` axis (passthrough) and to the lucide
  chevron `className` (explicit lookup). `align` is owned at the root `<nav>`
  via `paginationVariants` and never propagates downward. The current page
  Button's `variant` is `'outline'` (others use `'ghost'`) via an inline
  expression — not a lookup table — because the axis is binary and named for
  the visual state, not for an axis value.
- **No `className` flows downward.** `Button` and `ButtonGroup` both reject
  `className` at the type level. If a styling knob is missing, add a variant
  axis on the atom OR on Pagination — don't open an escape hatch.
- **Slot prop vocabulary.** Pagination uses a computed range internally
  rather than an items[] surface — the prop shape is `{ page, pageCount,
  onPageChange, siblingCount, showFirstLast }` and the range computation
  lives in the exported `buildPaginationRange` helper. Each rendered cell
  carries its own `data-slot` for test queries.
- **Layer-import direction.** Pagination imports
  `@/molecules/ButtonGroup`, `@/atoms/Button`, `@/particles/cn`, and
  `lucide-react`. It does NOT import other organisms, templates, pages, or
  providers — enforced by the `no-restricted-imports` rule in
  `eslint.config.mjs`.

## Accessibility

- The root `<nav>` carries an accessible name via `aria-label` (defaults to
  `'Pagination'`). Pass a localized string when needed.
- The inner `ButtonGroup` carries `role="group"` (provided by the molecule)
  and a derived `aria-label` (`'<Pagination label> controls'`) so screen
  readers can address the control set.
- Every interactive Button has a descriptive `aria-label` (`'Page 5'`,
  `'Previous page'`, `'Next page'`, `'First page'`, `'Last page'`) because
  the visible content is either a number or an icon, neither of which fully
  describes the action by itself.
- The current page Button carries `aria-current="page"` and `data-active=""`
  — assistive tech announces the active step and downstream styling can
  observe the state without className introspection.
- Ellipsis spans are decorative (`aria-hidden`) — the surrounding page
  buttons carry the semantic information.
- Previous / Next / First / Last buttons are auto-disabled at the boundaries
  via the native `disabled` attribute on the underlying `<button>`; the
  cursor and opacity treatments come from the Button atom's variants.

## Do / Don't

- DO tune visuals through `size` and `align`. If a styling knob is missing,
  add a variant axis — styling is the organism's responsibility, not the
  consumer's.
- DO use `siblingCount={2}` (or higher) for dense paginations where the user
  benefits from seeing more numeric anchors around the current page.
- DO enable `showFirstLast` when the user frequently needs to jump to the
  extremes (long lists, archive views). Leave it `false` for tight layouts
  where Prev / Next plus the first / last anchors in the range are enough.
- DO control selection via `page` + `onPageChange` from a parent so URL,
  query, or scroll state stays the single source of truth.
- DON'T pass `className` to Pagination, to the composed Buttons, or to the
  composed ButtonGroup — every layer rejects it at the type level. If a
  styling knob is missing, add a variant axis.
- DON'T assume `pageCount === 1` is hidden — the organism returns `null` for
  `pageCount === 0`, but renders a single-page bar (Prev disabled, Page 1
  active, Next disabled) for `pageCount === 1`. Guard upstream if that's
  visually undesirable.
- DON'T pass `<a>` or a custom router link as a Pagination child — the
  organism owns every Button it renders. If link semantics are required
  (server-rendered SEO pagination), build a sibling using
  `buildPaginationRange` directly and skip the organism.
