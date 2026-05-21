import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Table } from './Table';

describe('Table', () => {
  it('renders caption, headers, rows, and footer slots', () => {
    render(
      <Table
        caption="Recent orders"
        headers={['Order', 'Customer', 'Amount']}
        rows={[
          ['#1023', 'Alex', '$48.20'],
          ['#1024', 'Sam', '$112.00'],
        ]}
        footer={['Total', '', '$160.20']}
      />,
    );
    expect(screen.getByText('Recent orders')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Order' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Customer' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '#1023' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '$160.20' })).toBeInTheDocument();
  });

  it('composes a semantic table with the expected aria roles', () => {
    render(
      <Table
        headers={['A', 'B']}
        rows={[['1', '2'], ['3', '4']]}
      />,
    );
    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('data-slot', 'table-root');
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    // 1 header row + 2 body rows = 3 rows total
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getAllByRole('cell')).toHaveLength(4);
  });

  it('propagates variant / size / density to data attributes on the table root', () => {
    render(
      <Table
        variant="striped"
        size="lg"
        density="compact"
        headers={['A']}
        rows={[['1']]}
      />,
    );
    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('data-variant', 'striped');
    expect(table).toHaveAttribute('data-size', 'lg');
    expect(table).toHaveAttribute('data-density', 'compact');
  });

  it('renders the caption inside Typography with variant="caption"', () => {
    render(<Table caption="Notes" />);
    const caption = screen.getByText('Notes');
    expect(caption).toHaveAttribute('data-slot', 'typography');
    expect(caption).toHaveAttribute('data-variant', 'caption');
  });

  it('omits thead, tbody, and tfoot when their slot arrays are not provided', () => {
    const { container } = render(<Table caption="Empty table" />);
    expect(container.querySelector('thead')).toBeNull();
    expect(container.querySelector('tbody')).toBeNull();
    expect(container.querySelector('tfoot')).toBeNull();
    expect(container.querySelector('caption')).not.toBeNull();
  });

  it('marks headers with scope="col" for assistive-tech column association', () => {
    render(<Table headers={['Name', 'Age']} rows={[['Ada', '36']]} />);
    const headers = screen.getAllByRole('columnheader');
    for (const th of headers) {
      expect(th).toHaveAttribute('scope', 'col');
      expect(th).toHaveAttribute('data-slot', 'table-head');
    }
  });

  it('tags cells with data-slot="table-cell" on body and footer rows', () => {
    const { container } = render(
      <Table
        headers={['A']}
        rows={[['body-1']]}
        footer={['footer-1']}
      />,
    );
    const tbody = container.querySelector('tbody');
    const tfoot = container.querySelector('tfoot');
    expect(tbody).not.toBeNull();
    expect(tfoot).not.toBeNull();
    expect(within(tbody as HTMLElement).getByRole('cell', { name: 'body-1' }))
      .toHaveAttribute('data-slot', 'table-cell');
    expect(within(tfoot as HTMLElement).getByRole('cell', { name: 'footer-1' }))
      .toHaveAttribute('data-slot', 'table-cell');
  });

  it('has no a11y violations for a fully populated table', async () => {
    const { container } = render(
      <Table
        caption="Quarterly results"
        headers={['Quarter', 'Revenue']}
        rows={[
          ['Q1', '$1.2M'],
          ['Q2', '$1.5M'],
        ]}
        footer={['Total', '$2.7M']}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
