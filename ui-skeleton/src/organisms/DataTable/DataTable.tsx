import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import * as React from 'react';

import { Button } from '@/atoms/Button';
import { Checkbox } from '@/atoms/Checkbox';
import { Input } from '@/atoms/Input';
import { ButtonGroup } from '@/molecules/ButtonGroup';
import { Table } from '@/molecules/Table';
import { cn } from '@/particles/cn';

import {
  dataTableEmptyVariants,
  dataTableFooterVariants,
  dataTablePageInfoVariants,
  dataTableSortButtonVariants,
  dataTableSortIconVariants,
  dataTableToolbarVariants,
  dataTableVariants,
  type DataTableVariants,
} from './data-table.variants';

/** Sort direction reported on `data-sort` and consumed by the helper compare. */
export type DataTableSortDirection = 'asc' | 'desc';

/**
 * Current sort coordinate. `null` represents "no column sorted" (the cycle's
 * neutral state); the three-state cycle is `null → 'asc' → 'desc' → null`.
 */
export interface DataTableSortState {
  columnId: string;
  direction: DataTableSortDirection;
}

/** Stable row identity for selection — defaults to the row's index in `data`. */
export type DataTableRowId = string | number;

/**
 * Column descriptor for `DataTable`. `id` doubles as the React key, the
 * `data-column-id` attribute on the header cell, and the sort-state column
 * identifier — collisions inside `columns[]` break sort and selection state.
 *
 * `accessor` returns a `React.ReactNode` so cell content can be anything
 * renderable; for sortable / filterable columns the accessor should resolve
 * to a primitive (string / number / boolean) so the sort comparator and
 * filter substring match produce meaningful results. Complex visual cells
 * should set both `accessor` (for sort / filter) and `cell` (for rendering).
 */
export interface ColumnDef<T> {
  /** Stable identifier — React key + sort-state key + `data-column-id`. */
  id: string;
  /** Header content rendered inside the `<th>` cell (or inside a sort button when sortable). */
  header: React.ReactNode;
  /** Cell value accessor — drives sort comparison, filter substring match, and (when `cell` is omitted) cell rendering. */
  accessor: (row: T) => React.ReactNode;
  /** When `true` AND DataTable's `sortable` is `true`, the column header becomes a clickable three-state sort button. */
  sortable?: boolean;
  /** When `true` AND DataTable's `filterable` is `true`, the column participates in the toolbar's substring filter. */
  filterable?: boolean;
  /** Optional cell renderer override. Falls back to `accessor` when omitted. */
  cell?: (row: T) => React.ReactNode;
}

/**
 * DataTable — heavy stateful organism composing the `Table` molecule, the
 * `ButtonGroup` molecule, the `Checkbox` atom, the `Input` atom, and
 * `Button` atoms with lucide chevron / arrow icons. Generic over a row
 * type `<T>` via the `columns: ColumnDef<T>[]` and `data: T[]` shape.
 *
 * @remarks All visual customization flows through `size` and `density`.
 * There is no `className` escape hatch — every composed surface receives
 * its axis from the lookup tables (`tableSizeForSize`, `tableDensityForDensity`,
 * `inputSizeForSize`, `checkboxSizeForSize`, `buttonSizeForSize`,
 * `chevronSizeForSize`). The root cva emits the inter-slot rhythm; the
 * Table molecule owns the surface treatment.
 *
 * Owns four internal coordinated states: sort coordinate (`null | { columnId,
 * direction }`), filter query (string), current page (1-indexed), and
 * selected row ids (`Set<DataTableRowId>`). The displayed slice flows through
 * `filter → sort → page` and is the input to both the visible-checkbox
 * indeterminate logic and the page indicator. `onSelectionChange` is the
 * only callback exposed; sort, filter, and page are purely internal for this
 * iteration (no controlled-passthrough API).
 *
 * Pagination is composed inline using `ButtonGroup` + `Button` atoms + lucide
 * `ChevronLeft` / `ChevronRight` icons. The dedicated `Pagination` organism is
 * a sibling under `src/organisms/`; the organism layer's `no-restricted-imports`
 * guard blocks organism-to-organism imports. The inline pagination here is
 * intentionally simpler than `Pagination` (prev / next + page indicator, no
 * sibling ellipsis range) since DataTable's footer rarely needs the full
 * 2-sibling slot budget.
 *
 * Generic type parameter `<T>` is preserved through the public API via a
 * cast around `React.forwardRef`; the canonical generic-forwardRef pattern.
 *
 * @example
 * ```tsx
 * interface Person { id: number; name: string; email: string; age: number }
 *
 * const columns: ColumnDef<Person>[] = [
 *   { id: 'name',  header: 'Name',  accessor: (r) => r.name,  sortable: true, filterable: true },
 *   { id: 'email', header: 'Email', accessor: (r) => r.email, filterable: true },
 *   { id: 'age',   header: 'Age',   accessor: (r) => r.age,   sortable: true },
 * ];
 *
 * <DataTable
 *   data={people}
 *   columns={columns}
 *   sortable
 *   filterable
 *   selectable
 *   pageSize={10}
 *   getRowId={(person) => person.id}
 *   onSelectionChange={(ids) => console.log(ids)}
 *   aria-label="People"
 * />
 * ```
 */
export interface DataTableProps<T> extends DataTableVariants {
  /** Source rows — generic over `T`. */
  data: T[];
  /** Column descriptors driving headers, cells, sort, and filter. */
  columns: ColumnDef<T>[];
  /** Maximum rows rendered per page. Defaults to `10`. */
  pageSize?: number;
  /** When `true`, sortable columns gain a clickable three-state sort header. Defaults to `false`. */
  sortable?: boolean;
  /** When `true`, a substring filter `Input` is rendered above the table and applied to filterable columns. Defaults to `false`. */
  filterable?: boolean;
  /** When `true`, a selection column with master + per-row checkboxes is prepended. Defaults to `false`. */
  selectable?: boolean;
  /** Resolves the stable identity for each row. Defaults to `(_, index) => index`. */
  getRowId?: (row: T, index: number) => DataTableRowId;
  /** Fires with the selected row ids after every selection change. */
  onSelectionChange?: (selectedIds: DataTableRowId[]) => void;
  /** Placeholder rendered inside the filter `Input`. Defaults to `'Filter…'`. */
  filterPlaceholder?: string;
  /** Message rendered when `data` (or the filtered slice) is empty. Defaults to `'No data to display.'`. */
  emptyMessage?: React.ReactNode;
  /** Accessible label forwarded to the composed `<table>` via `Table`'s `{...rest}`. */
  'aria-label'?: string;
}

const buttonSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const inputSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const checkboxSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const tableSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const tableDensityForDensity = {
  comfortable: 'comfortable',
  compact: 'compact',
} as const;
const chevronSizeForSize = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-5',
} as const;

/**
 * Pure helper exported for unit testing. Returns the sort delta between two
 * accessor outputs: numeric subtraction for two numbers; otherwise a
 * locale-aware string comparison with `numeric: true` so "10" sorts after
 * "2" instead of before it. `null` and `undefined` are normalized to the
 * empty string so they sort first in ascending order.
 */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper exposed for unit-testing the sort path without rendering; HMR is a dev-only concern
export function compareNodeValues(
  a: React.ReactNode,
  b: React.ReactNode,
): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Pure helper exported for unit testing. Returns `true` when the query is
 * empty OR the accessor output's string form contains the query as a
 * case-insensitive substring. Non-stringable values (`null`, `undefined`,
 * `boolean`) never match a non-empty query.
 */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper exposed for unit-testing the filter path without rendering; HMR is a dev-only concern
export function matchesFilter(value: React.ReactNode, query: string): boolean {
  if (query.length === 0) return true;
  if (value === null || value === undefined || typeof value === 'boolean') {
    return false;
  }
  return String(value).toLowerCase()
    .includes(query.toLowerCase());
}

interface IndexedRow<T> {
  row: T;
  id: DataTableRowId;
}

function DataTableImpl<T>(props: DataTableProps<T>): React.JSX.Element {
  const {
    data,
    columns,
    pageSize = 10,
    sortable = false,
    filterable = false,
    selectable = false,
    getRowId,
    onSelectionChange,
    size,
    density,
    filterPlaceholder = 'Filter…',
    emptyMessage = 'No data to display.',
    'aria-label': ariaLabel,
  } = props;

  const resolvedSize = size ?? 'md';
  const resolvedDensity = density ?? 'comfortable';

  const [sort, setSort] = React.useState<DataTableSortState | null>(null);
  const [filter, setFilter] = React.useState<string>('');
  const [page, setPage] = React.useState<number>(1);
  const [selectedIds, setSelectedIds] = React.useState<Set<DataTableRowId>>(
    () => new Set(),
  );

  const indexedData = React.useMemo<IndexedRow<T>[]>(
    () => data.map((row, index) => ({
      row,
      id: getRowId !== undefined
        ? getRowId(row, index)
        : index,
    })),
    [data, getRowId],
  );

  const filteredData = React.useMemo<IndexedRow<T>[]>(() => {
    if (!filterable || filter.length === 0) return indexedData;
    const filterableColumns = columns.filter((c) => c.filterable === true);
    if (filterableColumns.length === 0) return indexedData;
    return indexedData.filter(({ row }) => filterableColumns.some((col) => matchesFilter(col.accessor(row), filter)));
  }, [indexedData, filterable, filter, columns]);

  const sortedData = React.useMemo<IndexedRow<T>[]>(() => {
    if (!sortable || sort === null) return filteredData;
    const sortColumn = columns.find((c) => c.id === sort.columnId);
    if (sortColumn === undefined) return filteredData;
    const copy = [...filteredData];
    copy.sort((left, right) => {
      const delta = compareNodeValues(
        sortColumn.accessor(left.row),
        sortColumn.accessor(right.row),
      );
      return sort.direction === 'asc'
        ? delta
        : -delta;
    });
    return copy;
  }, [filteredData, sortable, sort, columns]);

  const total = sortedData.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(Math.max(page, 1), pageCount);
  const pageStart = (clampedPage - 1) * pageSize;
  const visibleRows = sortedData.slice(pageStart, pageStart + pageSize);

  const visibleSelectedCount = visibleRows.reduce(
    (count, entry) => (selectedIds.has(entry.id)
      ? count + 1
      : count),
    0,
  );
  const allVisibleSelected
    = visibleRows.length > 0 && visibleSelectedCount === visibleRows.length;
  const someVisibleSelected
    = visibleSelectedCount > 0 && !allVisibleSelected;

  const emitSelection = (next: Set<DataTableRowId>): void => {
    setSelectedIds(next);
    onSelectionChange?.(Array.from(next));
  };

  const handleSortClick = (columnId: string): void => {
    setSort((prev) => {
      if (prev === null || prev.columnId !== columnId) {
        return { columnId, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { columnId, direction: 'desc' };
      }
      return null;
    });
  };

  const handleFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setFilter(event.currentTarget.value);
    setPage(1);
  };

  const handleRowToggle = (
    id: DataTableRowId,
    checked: boolean | 'indeterminate',
  ): void => {
    const next = new Set(selectedIds);
    if (checked === true) {
      next.add(id);
    } else {
      next.delete(id);
    }
    emitSelection(next);
  };

  const handleMasterToggle = (checked: boolean | 'indeterminate'): void => {
    const next = new Set(selectedIds);
    if (checked === true) {
      for (const entry of visibleRows) next.add(entry.id);
    } else {
      for (const entry of visibleRows) next.delete(entry.id);
    }
    emitSelection(next);
  };

  const handlePageDelta = (delta: number): void => {
    setPage((current) => {
      const next = current + delta;
      return Math.min(Math.max(next, 1), pageCount);
    });
  };

  const headers: React.ReactNode[] = [];
  if (selectable) {
    const masterChecked: boolean | 'indeterminate' = someVisibleSelected
      ? 'indeterminate'
      : allVisibleSelected;
    headers.push(
      <Checkbox
        key="__select-master"
        size={checkboxSizeForSize[resolvedSize]}
        checked={masterChecked}
        onCheckedChange={handleMasterToggle}
        disabled={visibleRows.length === 0}
        aria-label="Select all rows on this page"
        data-slot="data-table-select-all"
      />,
    );
  }
  for (const col of columns) {
    const isColSortable = sortable && col.sortable === true;
    const isActive = sort !== null && sort.columnId === col.id;
    if (isColSortable) {
      const directionLabel = isActive
        ? (sort.direction === 'asc'
          ? 'ascending'
          : 'descending')
        : 'unsorted';
      const headerText = typeof col.header === 'string'
        ? col.header
        : col.id;
      const SortIcon = isActive
        ? (sort.direction === 'asc'
          ? ArrowUp
          : ArrowDown)
        : ArrowUpDown;
      headers.push(
        <button
          key={col.id}
          type="button"
          onClick={() => handleSortClick(col.id)}
          aria-label={`Sort by ${headerText}, currently ${directionLabel}`}
          data-slot="data-table-sort-button"
          data-column-id={col.id}
          data-sort={isActive
            ? sort.direction
            : 'none'}
          className={cn(dataTableSortButtonVariants())}
        >
          <span data-slot="data-table-sort-label">{col.header}</span>
          <SortIcon
            aria-hidden
            data-slot="data-table-sort-icon"
            className={cn(dataTableSortIconVariants({ size: resolvedSize }))}
          />
        </button>,
      );
    } else {
      headers.push(
        <span
          key={col.id}
          data-slot="data-table-header-label"
          data-column-id={col.id}
        >
          {col.header}
        </span>,
      );
    }
  }

  const rows: React.ReactNode[][] = visibleRows.map(({ row, id }) => {
    const cells: React.ReactNode[] = [];
    if (selectable) {
      const isChecked = selectedIds.has(id);
      cells.push(
        <Checkbox
          size={checkboxSizeForSize[resolvedSize]}
          checked={isChecked}
          onCheckedChange={(next) => handleRowToggle(id, next)}
          aria-label={`Select row ${String(id)}`}
          data-slot="data-table-select-row"
          data-row-id={String(id)}
        />,
      );
    }
    for (const col of columns) {
      cells.push(col.cell !== undefined
        ? col.cell(row)
        : col.accessor(row));
    }
    return cells;
  });

  const showPagination = total > pageSize;
  const atFirst = clampedPage <= 1;
  const atLast = clampedPage >= pageCount;

  return (
    <div
      data-slot="data-table-root"
      data-size={resolvedSize}
      data-density={resolvedDensity}
      className={cn(dataTableVariants({
        size: resolvedSize,
        density: resolvedDensity,
      }))}
    >
      {filterable
        ? (
          <div
            data-slot="data-table-toolbar"
            className={cn(dataTableToolbarVariants())}
          >
            <Input
              type="search"
              size={inputSizeForSize[resolvedSize]}
              value={filter}
              onChange={handleFilterChange}
              placeholder={filterPlaceholder}
              aria-label={filterPlaceholder}
              data-slot="data-table-filter-input"
            />
          </div>
        )
        : null}
      <Table
        size={tableSizeForSize[resolvedSize]}
        density={tableDensityForDensity[resolvedDensity]}
        headers={headers}
        rows={rows.length > 0
          ? rows
          : undefined}
        aria-label={ariaLabel}
        data-slot="data-table-table"
      />
      {total === 0
        ? (
          <div
            role="status"
            aria-live="polite"
            data-slot="data-table-empty"
            className={cn(dataTableEmptyVariants({ size: resolvedSize }))}
          >
            {emptyMessage}
          </div>
        )
        : null}
      {showPagination
        ? (
          <nav
            aria-label="Pagination"
            data-slot="data-table-pagination"
            className={cn(dataTableFooterVariants({ size: resolvedSize }))}
          >
            <span
              data-slot="data-table-page-info"
              className={cn(dataTablePageInfoVariants())}
            >
              {`Page ${clampedPage} of ${pageCount}`}
            </span>
            <ButtonGroup
              attached={false}
              aria-label="Pagination controls"
              data-slot="data-table-pagination-group"
            >
              <Button
                size={buttonSizeForSize[resolvedSize]}
                variant="outline"
                disabled={atFirst}
                aria-label="Previous page"
                data-slot="data-table-prev"
                onClick={() => handlePageDelta(-1)}
              >
                <ChevronLeft aria-hidden className={chevronSizeForSize[resolvedSize]} />
              </Button>
              <Button
                size={buttonSizeForSize[resolvedSize]}
                variant="outline"
                disabled={atLast}
                aria-label="Next page"
                data-slot="data-table-next"
                onClick={() => handlePageDelta(1)}
              >
                <ChevronRight aria-hidden className={chevronSizeForSize[resolvedSize]} />
              </Button>
            </ButtonGroup>
          </nav>
        )
        : null}
    </div>
  );
}

/**
 * Generic-preserving cast around `DataTableImpl`. React function components
 * cannot natively express `<T>` generics in their type, so the canonical
 * pattern is to type the public export as a generic function and bind the
 * unparameterized implementation through a one-step assertion.
 */
export const DataTable = DataTableImpl as <T>(
  props: DataTableProps<T>,
) => React.JSX.Element;
