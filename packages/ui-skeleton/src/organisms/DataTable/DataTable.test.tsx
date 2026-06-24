import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import {
  compareNodeValues,
  DataTable,
  matchesFilter,
  type ColumnDef,
} from './DataTable';

interface Person {
  id: number;
  name: string;
  email: string;
  role: string;
  age: number;
}

const people: Person[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin', age: 30 },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'editor', age: 25 },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'viewer', age: 40 },
  { id: 4, name: 'Diana', email: 'diana@example.com', role: 'editor', age: 35 },
  { id: 5, name: 'Eve', email: 'eve@example.com', role: 'admin', age: 22 },
];

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, sortable: true, filterable: true },
  { id: 'email', header: 'Email', accessor: (r) => r.email, filterable: true },
  { id: 'role', header: 'Role', accessor: (r) => r.role, sortable: true },
  { id: 'age', header: 'Age', accessor: (r) => r.age, sortable: true },
];

describe('compareNodeValues (helper)', () => {
  it('subtracts two numbers', () => {
    expect(compareNodeValues(5, 3)).toBe(2);
    expect(compareNodeValues(1, 9)).toBe(-8);
  });

  it('compares strings via locale-aware numeric comparison', () => {
    expect(compareNodeValues('alice', 'bob')).toBeLessThan(0);
    expect(compareNodeValues('zoe', 'alice')).toBeGreaterThan(0);
    // numeric: true so "10" sorts after "2"
    expect(compareNodeValues('2', '10')).toBeLessThan(0);
  });

  it('normalizes null/undefined to the empty string', () => {
    expect(compareNodeValues(undefined, 'a')).toBeLessThan(0);
    expect(compareNodeValues(null, '')).toBe(0);
  });
});

describe('matchesFilter (helper)', () => {
  it('returns true for any value when the query is empty', () => {
    expect(matchesFilter('whatever', '')).toBe(true);
    expect(matchesFilter(null, '')).toBe(true);
  });

  it('does a case-insensitive substring match', () => {
    expect(matchesFilter('Alice', 'ali')).toBe(true);
    expect(matchesFilter('Alice', 'ICE')).toBe(true);
    expect(matchesFilter('Alice', 'xyz')).toBe(false);
  });

  it('coerces numbers to strings before matching', () => {
    expect(matchesFilter(42, '4')).toBe(true);
    expect(matchesFilter(42, '99')).toBe(false);
  });

  it('returns false for null / undefined / boolean against a non-empty query', () => {
    expect(matchesFilter(null, 'a')).toBe(false);
    expect(matchesFilter(undefined, 'a')).toBe(false);
    expect(matchesFilter(true, 'true')).toBe(false);
  });
});

describe('DataTable', () => {
  it('renders headers and rows via the composed Table molecule', () => {
    render(<DataTable data={people} columns={columns} aria-label="People" />);

    const table = screen.getByRole('table');
    // DataTable forwards `data-slot="data-table-table"` to the composed Table,
    // overriding the molecule's own `data-slot="table-root"` via {...rest}.
    expect(table).toHaveAttribute('data-slot', 'data-table-table');
    expect(table).toHaveAttribute('aria-label', 'People');

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
    expect(headers[0]).toHaveTextContent('Name');
    expect(headers[1]).toHaveTextContent('Email');
    expect(headers[2]).toHaveTextContent('Role');
    expect(headers[3]).toHaveTextContent('Age');

    // 5 body rows + 1 header row.
    expect(screen.getAllByRole('row')).toHaveLength(6);

    // Plain-header columns render a span with data-slot, NOT a sort button.
    expect(
      screen.queryByRole('button', { name: /sort by/i }),
    ).not.toBeInTheDocument();
  });

  it('propagates size and density axes to the composed Table molecule', () => {
    const { container } = render(
      <DataTable
        data={people}
        columns={columns}
        size="lg"
        density="compact"
        aria-label="People"
      />,
    );

    const root = container.querySelector('[data-slot="data-table-root"]');
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('data-density', 'compact');

    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('data-size', 'lg');
    expect(table).toHaveAttribute('data-density', 'compact');
  });

  it('renders the filter toolbar Input only when filterable=true', () => {
    const { rerender } = render(
      <DataTable data={people} columns={columns} aria-label="People" />,
    );
    expect(
      screen.queryByPlaceholderText('Filter…'),
    ).not.toBeInTheDocument();

    rerender(
      <DataTable
        data={people}
        columns={columns}
        filterable
        aria-label="People"
      />,
    );
    expect(screen.getByPlaceholderText('Filter…')).toHaveAttribute(
      'data-slot',
      'data-table-filter-input',
    );
  });

  it('filters rows by substring against filterable columns only', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        data={people}
        columns={columns}
        filterable
        filterPlaceholder="Search"
        aria-label="People"
      />,
    );

    const filterInput = screen.getByPlaceholderText('Search');
    await user.type(filterInput, 'alice');

    // Only Alice's row is in the body.
    const dataRows = screen.getAllByRole('row').slice(1);
    expect(dataRows).toHaveLength(1);
    const [aliceRow] = dataRows;
    expect(aliceRow).toBeDefined();
    expect(within(aliceRow!).getByText('Alice')).toBeInTheDocument();

    // The role column is NOT filterable — typing 'admin' should match nothing
    // (Alice/Eve are admins, but `role` is filterable=false, so substring
    // matches against name/email which don't contain 'admin'). One of Alice's
    // string fields contains 'admin' as a substring inside 'admin@...' —
    // double-check that doesn't happen here. Use a strict non-match instead.
    await user.clear(filterInput);
    await user.type(filterInput, 'viewer');
    expect(screen.queryAllByRole('row').slice(1)).toHaveLength(0);
  });

  it('cycles sort direction asc → desc → none via header clicks', async () => {
    const user = userEvent.setup();
    render(
      <DataTable data={people} columns={columns} sortable aria-label="People" />,
    );

    const nameSortBtn = screen.getByRole('button', {
      name: /^sort by name, currently unsorted$/i,
    });
    expect(nameSortBtn).toHaveAttribute('data-sort', 'none');

    await user.click(nameSortBtn);
    const ascBtn = screen.getByRole('button', {
      name: /^sort by name, currently ascending$/i,
    });
    expect(ascBtn).toHaveAttribute('data-sort', 'asc');
    let dataRows = screen.getAllByRole('row').slice(1);
    expect(within(dataRows[0]!).getByText('Alice')).toBeInTheDocument();
    expect(within(dataRows[4]!).getByText('Eve')).toBeInTheDocument();

    await user.click(ascBtn);
    const descBtn = screen.getByRole('button', {
      name: /^sort by name, currently descending$/i,
    });
    expect(descBtn).toHaveAttribute('data-sort', 'desc');
    dataRows = screen.getAllByRole('row').slice(1);
    expect(within(dataRows[0]!).getByText('Eve')).toBeInTheDocument();
    expect(within(dataRows[4]!).getByText('Alice')).toBeInTheDocument();

    await user.click(descBtn);
    const offBtn = screen.getByRole('button', {
      name: /^sort by name, currently unsorted$/i,
    });
    expect(offBtn).toHaveAttribute('data-sort', 'none');
  });

  it('omits the sort button when DataTable.sortable=false even if the column is sortable', () => {
    render(<DataTable data={people} columns={columns} aria-label="People" />);
    // sortable=false at the root, so neither name/role/age becomes a sort button.
    expect(
      screen.queryByRole('button', { name: /sort by/i }),
    ).not.toBeInTheDocument();
  });

  it('paginates rows when total > pageSize and advances via prev/next', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        data={people}
        columns={columns}
        pageSize={2}
        aria-label="People"
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav).toHaveAttribute('data-slot', 'data-table-pagination');
    expect(nav).toHaveTextContent('Page 1 of 3');

    // Two rows on page 1.
    let dataRows = screen.getAllByRole('row').slice(1);
    expect(dataRows).toHaveLength(2);
    expect(within(dataRows[0]!).getByText('Alice')).toBeInTheDocument();
    expect(within(dataRows[1]!).getByText('Bob')).toBeInTheDocument();

    const prev = screen.getByRole('button', { name: 'Previous page' });
    const next = screen.getByRole('button', { name: 'Next page' });
    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();

    await user.click(next);
    expect(nav).toHaveTextContent('Page 2 of 3');
    dataRows = screen.getAllByRole('row').slice(1);
    expect(within(dataRows[0]!).getByText('Charlie')).toBeInTheDocument();

    await user.click(next);
    expect(nav).toHaveTextContent('Page 3 of 3');
    expect(next).toBeDisabled();
    dataRows = screen.getAllByRole('row').slice(1);
    expect(dataRows).toHaveLength(1);
    expect(within(dataRows[0]!).getByText('Eve')).toBeInTheDocument();

    await user.click(prev);
    expect(nav).toHaveTextContent('Page 2 of 3');
  });

  it('does not render the pagination nav when data fits in one page', () => {
    render(
      <DataTable
        data={people}
        columns={columns}
        pageSize={10}
        aria-label="People"
      />,
    );
    expect(
      screen.queryByRole('navigation', { name: 'Pagination' }),
    ).not.toBeInTheDocument();
  });

  it('renders selection checkboxes and fires onSelectionChange via row + master', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn<(ids: (string | number)[]) => void>();
    render(
      <DataTable
        data={people}
        columns={columns}
        selectable
        getRowId={(r) => r.id}
        onSelectionChange={onSelectionChange}
        aria-label="People"
      />,
    );

    // Master + 5 row checkboxes.
    expect(screen.getAllByRole('checkbox')).toHaveLength(6);

    const master = screen.getByRole('checkbox', {
      name: 'Select all rows on this page',
    });
    expect(master).toHaveAttribute('data-state', 'unchecked');

    // Tick row 1.
    await user.click(
      screen.getByRole('checkbox', { name: 'Select row 1' }),
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith([1]);
    expect(master).toHaveAttribute('data-state', 'indeterminate');

    // Click master from indeterminate state → selects all visible rows.
    await user.click(master);
    expect(onSelectionChange).toHaveBeenLastCalledWith([1, 2, 3, 4, 5]);
    expect(master).toHaveAttribute('data-state', 'checked');

    // Click master from checked state → deselects all visible rows.
    await user.click(master);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(master).toHaveAttribute('data-state', 'unchecked');
  });

  it('renders the empty-state message when data is empty', () => {
    const { container } = render(
      <DataTable data={[]} columns={columns} aria-label="People" />,
    );
    const empty = container.querySelector('[data-slot="data-table-empty"]');
    expect(empty).not.toBeNull();
    expect(empty).toHaveAttribute('role', 'status');
    expect(empty).toHaveTextContent('No data to display.');
  });

  it('respects per-column cell renderer override', () => {
    const customColumns: ColumnDef<Person>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: (r) => r.name,
        cell: (r) => <strong data-testid={`uppercase-${r.id}`}>{r.name.toUpperCase()}</strong>,
      },
    ];
    render(
      <DataTable
        data={people.slice(0, 1)}
        columns={customColumns}
        aria-label="People"
      />,
    );
    const cell = screen.getByTestId('uppercase-1');
    expect(cell.tagName).toBe('STRONG');
    expect(cell).toHaveTextContent('ALICE');
  });

  it('has no a11y violations across sort + filter + select + paginate', async () => {
    const { container } = render(
      <DataTable
        data={people}
        columns={columns}
        sortable
        filterable
        selectable
        pageSize={3}
        aria-label="People"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
