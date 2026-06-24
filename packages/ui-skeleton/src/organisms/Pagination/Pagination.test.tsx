import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { buildPaginationRange, Pagination } from './Pagination';

describe('buildPaginationRange', () => {
  it('returns one item per page when pageCount fits the slot budget', () => {
    const range = buildPaginationRange({ page: 1, pageCount: 5, siblingCount: 1 });
    expect(range).toEqual([
      { type: 'page', page: 1 },
      { type: 'page', page: 2 },
      { type: 'page', page: 3 },
      { type: 'page', page: 4 },
      { type: 'page', page: 5 },
    ]);
  });

  it('emits only a trailing ellipsis when the current page sits near the start', () => {
    expect(buildPaginationRange({ page: 2, pageCount: 10, siblingCount: 1 })).toEqual([
      { type: 'page', page: 1 },
      { type: 'page', page: 2 },
      { type: 'page', page: 3 },
      { type: 'page', page: 4 },
      { type: 'page', page: 5 },
      { type: 'ellipsis', position: 'trailing' },
      { type: 'page', page: 10 },
    ]);
  });

  it('emits only a leading ellipsis when the current page sits near the end', () => {
    expect(buildPaginationRange({ page: 9, pageCount: 10, siblingCount: 1 })).toEqual([
      { type: 'page', page: 1 },
      { type: 'ellipsis', position: 'leading' },
      { type: 'page', page: 6 },
      { type: 'page', page: 7 },
      { type: 'page', page: 8 },
      { type: 'page', page: 9 },
      { type: 'page', page: 10 },
    ]);
  });

  it('emits both ellipses when the current page sits in the middle', () => {
    expect(buildPaginationRange({ page: 5, pageCount: 10, siblingCount: 1 })).toEqual([
      { type: 'page', page: 1 },
      { type: 'ellipsis', position: 'leading' },
      { type: 'page', page: 4 },
      { type: 'page', page: 5 },
      { type: 'page', page: 6 },
      { type: 'ellipsis', position: 'trailing' },
      { type: 'page', page: 10 },
    ]);
  });

  it('clamps an out-of-range current page before building the range', () => {
    const high = buildPaginationRange({ page: 99, pageCount: 10, siblingCount: 1 });
    expect(high[high.length - 1]).toEqual({ type: 'page', page: 10 });
    expect(high).toContainEqual({ type: 'ellipsis', position: 'leading' });

    const low = buildPaginationRange({ page: -3, pageCount: 10, siblingCount: 1 });
    expect(low[0]).toEqual({ type: 'page', page: 1 });
    expect(low).toContainEqual({ type: 'ellipsis', position: 'trailing' });
  });

  it('returns an empty array when pageCount is not positive', () => {
    expect(buildPaginationRange({ page: 1, pageCount: 0, siblingCount: 1 })).toEqual([]);
    expect(buildPaginationRange({ page: 1, pageCount: -5, siblingCount: 1 })).toEqual([]);
  });
});

describe('Pagination', () => {
  it('renders the nav root, the inner ButtonGroup, prev / next, page buttons, and ellipses for a mid-range page', () => {
    const { container } = render(
      <Pagination page={5} pageCount={10} onPageChange={() => {}} />,
    );

    const root = container.querySelector('[data-slot="pagination-root"]');
    expect(root).not.toBeNull();
    expect(root?.tagName).toBe('NAV');

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Pagination controls' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 10' })).toBeInTheDocument();

    const ellipses = container.querySelectorAll('[data-slot="pagination-ellipsis"]');
    expect(ellipses).toHaveLength(2);
    const positions = Array.from(ellipses).map((node) => node.getAttribute('data-position'));
    expect(positions).toEqual(['leading', 'trailing']);
  });

  it('marks the current page with aria-current="page" and data-active', () => {
    render(<Pagination page={3} pageCount={5} onPageChange={() => {}} />);
    const current = screen.getByRole('button', { name: 'Page 3' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveAttribute('data-active', '');
    expect(current).toHaveAttribute('data-variant', 'outline');

    const other = screen.getByRole('button', { name: 'Page 1' });
    expect(other).not.toHaveAttribute('aria-current');
    expect(other).not.toHaveAttribute('data-active');
    expect(other).toHaveAttribute('data-variant', 'ghost');
  });

  it('propagates size to each Button via data-size and applies align at the root', () => {
    const { container } = render(
      <Pagination
        page={1}
        pageCount={5}
        size="lg"
        align="end"
        onPageChange={() => {}}
      />,
    );
    const root = container.querySelector('[data-slot="pagination-root"]');
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('data-align', 'end');
    expect(root?.className).toMatch(/\bjustify-end\b/);

    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('data-size', 'lg');
    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveAttribute('data-size', 'lg');
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveAttribute('data-size', 'lg');
  });

  it('disables previous / next at the boundaries and skips firing for the current page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination page={1} pageCount={5} onPageChange={onPageChange} />,
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Page 1' }));
    expect(onPageChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);

    await user.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);

    rerender(<Pagination page={5} pageCount={5} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('renders the first / last navigation buttons when showFirstLast is true and fires onPageChange with 1 and pageCount', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        page={5}
        pageCount={10}
        showFirstLast
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'First page' }));
    await user.click(screen.getByRole('button', { name: 'Last page' }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 10);
  });

  it('omits the first / last navigation buttons by default', () => {
    render(<Pagination page={5} pageCount={10} onPageChange={() => {}} />);
    expect(screen.queryByRole('button', { name: 'First page' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Last page' })).toBeNull();
  });

  it('renders nothing when pageCount is zero', () => {
    const { container } = render(
      <Pagination page={1} pageCount={0} onPageChange={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('forwards the ref to the underlying nav element', () => {
    const ref = { current: null as HTMLElement | null };
    render(
      <Pagination ref={ref} page={1} pageCount={5} onPageChange={() => {}} />,
    );
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('NAV');
  });

  it('honours a consumer-supplied aria-label on the nav root', () => {
    render(
      <Pagination
        aria-label="Search results pagination"
        page={1}
        pageCount={3}
        onPageChange={() => {}}
      />,
    );
    expect(
      screen.getByRole('navigation', { name: 'Search results pagination' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Search results pagination controls' }),
    ).toBeInTheDocument();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Pagination
        page={3}
        pageCount={10}
        siblingCount={2}
        showFirstLast
        onPageChange={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
