import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react';
import * as React from 'react';

import { Button, type ButtonProps } from '@/atoms/Button';
import { ButtonGroup } from '@/molecules/ButtonGroup';
import { cn } from '@/particles/cn';

import {
  paginationEllipsisVariants,
  paginationVariants,
  type PaginationVariants,
} from './pagination.variants';

/**
 * Single displayed entry produced by `buildPaginationRange`. Discriminated by
 * `type`: `'page'` carries the 1-indexed page number; `'ellipsis'` marks a
 * skipped range with its `position` relative to the current page so tests and
 * consumers can distinguish the two ellipses when both appear in the same
 * range.
 */
export type PaginationRangeItem =
  | { type: 'page'; page: number }
  | { type: 'ellipsis'; position: 'leading' | 'trailing' };

interface BuildPaginationRangeInput {
  page: number;
  pageCount: number;
  siblingCount: number;
}

/**
 * Pure helper that returns the displayed pagination range as an array of
 * descriptors: current page ± `siblingCount`, plus first / last anchors, plus
 * leading / trailing ellipses when gaps between anchors exceed one page.
 *
 * The total visible slot budget is `2 * siblingCount + 5` (first + 2 siblings
 * on each side of current + last + 2 ellipses). When `pageCount` fits inside
 * the budget, every page number is rendered without ellipses. Pages outside
 * `[1, pageCount]` are clamped before the range is built. Returns an empty
 * array when `pageCount <= 0`.
 *
 * Exposed so adjacent UI (e.g. an SEO-targeted server-rendered pagination)
 * can mirror the organism's display logic without re-importing the
 * organism itself.
 */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper exposed for adjacent-UI parity; HMR is a dev-only concern
export function buildPaginationRange({
  page,
  pageCount,
  siblingCount,
}: BuildPaginationRangeInput): PaginationRangeItem[] {
  if (pageCount <= 0) return [];
  if (pageCount === 1) return [{ type: 'page', page: 1 }];

  const totalSlots = 2 * siblingCount + 5;
  if (pageCount <= totalSlots) {
    return Array.from({ length: pageCount }, (_, i) => ({
      type: 'page' as const,
      page: i + 1,
    }));
  }

  const clamped = Math.min(Math.max(page, 1), pageCount);
  const leftSibling = Math.max(clamped - siblingCount, 1);
  const rightSibling = Math.min(clamped + siblingCount, pageCount);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < pageCount - 1;

  const items: PaginationRangeItem[] = [];

  if (!showLeftDots && showRightDots) {
    const leftRangeEnd = 3 + 2 * siblingCount;
    for (let i = 1; i <= leftRangeEnd; i++) {
      items.push({ type: 'page', page: i });
    }
    items.push({ type: 'ellipsis', position: 'trailing' });
    items.push({ type: 'page', page: pageCount });
    return items;
  }

  if (showLeftDots && !showRightDots) {
    items.push({ type: 'page', page: 1 });
    items.push({ type: 'ellipsis', position: 'leading' });
    const rightRangeStart = pageCount - (3 + 2 * siblingCount) + 1;
    for (let i = rightRangeStart; i <= pageCount; i++) {
      items.push({ type: 'page', page: i });
    }
    return items;
  }

  items.push({ type: 'page', page: 1 });
  items.push({ type: 'ellipsis', position: 'leading' });
  for (let i = leftSibling; i <= rightSibling; i++) {
    items.push({ type: 'page', page: i });
  }
  items.push({ type: 'ellipsis', position: 'trailing' });
  items.push({ type: 'page', page: pageCount });
  return items;
}

const buttonSizeForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const chevronSizeForSize = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-5',
} as const;

/**
 * Pagination — composition-only organism that composes the `ButtonGroup`
 * molecule + `Button` atoms with lucide-react chevron icons to render a
 * page-navigation control. The displayed range (current ± `siblingCount`,
 * plus optional first / last anchors, plus ellipses for skipped ranges) is
 * computed by the pure `buildPaginationRange` helper at the top of this file.
 *
 * @remarks All visual customization flows through `size` and `align`. There
 * is no `className` escape hatch. `size` propagates to each Button's `size`
 * axis (passthrough via `buttonSizeForSize`) and to the auto-injected chevron
 * icon size (explicit lookup via `chevronSizeForSize`). `align` is owned at
 * the root `<nav>` and never propagates downward.
 *
 * The current page Button is rendered with `variant="outline"` (others use
 * `'ghost'`) and is marked with `aria-current="page"` plus `data-active=""`.
 * Previous / Next / First / Last navigation buttons are auto-disabled at the
 * boundaries via the native `disabled` attribute. Ellipses are decorative
 * `<span aria-hidden>` placeholders carrying their own
 * `data-slot="pagination-ellipsis"` for test queries.
 *
 * `onPageChange` never fires for the current page or for values outside
 * `[1, pageCount]`, so re-rendering with a stale `page` won't double-fire.
 *
 * @example
 * ```tsx
 * const [page, setPage] = React.useState(1);
 *
 * <Pagination
 *   page={page}
 *   pageCount={20}
 *   onPageChange={setPage}
 * />
 *
 * <Pagination
 *   page={page}
 *   pageCount={20}
 *   onPageChange={setPage}
 *   siblingCount={2}
 *   showFirstLast
 *   size="lg"
 *   align="end"
 * />
 * ```
 */
export interface PaginationProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'className'>,
  PaginationVariants {
  /** 1-indexed current page. Values outside `[1, pageCount]` are clamped. */
  page: number;
  /** Total number of pages. Values `<= 0` render nothing. */
  pageCount: number;
  /** Fires with the requested 1-indexed page number when navigation occurs. */
  onPageChange: (page: number) => void;
  /** Number of sibling page buttons rendered on each side of the current page. Defaults to `1`. */
  siblingCount?: number;
  /** When `true`, renders dedicated first / last navigation buttons in addition to previous / next. Defaults to `false`. */
  showFirstLast?: boolean;
}

export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  (props, ref) => {
    const {
      page,
      pageCount,
      onPageChange,
      siblingCount = 1,
      showFirstLast = false,
      size,
      align,
      'aria-label': ariaLabel = 'Pagination',
      ...rest
    } = props;

    const resolvedSize = size ?? 'md';
    const resolvedAlign = align ?? 'center';

    const items = buildPaginationRange({
      page,
      pageCount,
      siblingCount,
    });

    if (items.length === 0) return null;

    const clampedPage = Math.min(Math.max(page, 1), pageCount);
    const atFirst = clampedPage <= 1;
    const atLast = clampedPage >= pageCount;
    const buttonSize: ButtonProps['size'] = buttonSizeForSize[resolvedSize];
    const chevronClass = chevronSizeForSize[resolvedSize];

    const handlePageClick = (next: number): void => {
      if (next < 1 || next > pageCount) return;
      if (next === clampedPage) return;
      onPageChange(next);
    };

    return (
      <nav
        ref={ref}
        aria-label={ariaLabel}
        data-slot="pagination-root"
        data-size={resolvedSize}
        data-align={resolvedAlign}
        className={cn(paginationVariants({
          size: resolvedSize,
          align: resolvedAlign,
        }))}
        {...rest}
      >
        <ButtonGroup
          orientation="horizontal"
          attached={false}
          data-slot="pagination-group"
          aria-label={`${ariaLabel} controls`}
        >
          {showFirstLast
            ? (
              <Button
                size={buttonSize}
                variant="ghost"
                disabled={atFirst}
                aria-label="First page"
                data-slot="pagination-first"
                onClick={() => handlePageClick(1)}
              >
                <ChevronsLeft aria-hidden className={chevronClass} />
              </Button>
            )
            : null}
          <Button
            size={buttonSize}
            variant="ghost"
            disabled={atFirst}
            aria-label="Previous page"
            data-slot="pagination-previous"
            onClick={() => handlePageClick(clampedPage - 1)}
          >
            <ChevronLeft aria-hidden className={chevronClass} />
          </Button>
          {items.map((item) => {
            if (item.type === 'ellipsis') {
              return (
                <span
                  key={`pagination-ellipsis-${item.position}`}
                  aria-hidden
                  data-slot="pagination-ellipsis"
                  data-position={item.position}
                  className={cn(paginationEllipsisVariants({ size: resolvedSize }))}
                >
                  <MoreHorizontal className={chevronClass} />
                </span>
              );
            }
            const isCurrent = item.page === clampedPage;
            return (
              <Button
                key={`pagination-page-${item.page}`}
                size={buttonSize}
                variant={isCurrent
                  ? 'outline'
                  : 'ghost'}
                aria-label={`Page ${item.page}`}
                aria-current={isCurrent
                  ? 'page'
                  : undefined}
                data-slot="pagination-page"
                data-active={isCurrent
                  ? ''
                  : undefined}
                onClick={() => handlePageClick(item.page)}
              >
                {item.page}
              </Button>
            );
          })}
          <Button
            size={buttonSize}
            variant="ghost"
            disabled={atLast}
            aria-label="Next page"
            data-slot="pagination-next"
            onClick={() => handlePageClick(clampedPage + 1)}
          >
            <ChevronRight aria-hidden className={chevronClass} />
          </Button>
          {showFirstLast
            ? (
              <Button
                size={buttonSize}
                variant="ghost"
                disabled={atLast}
                aria-label="Last page"
                data-slot="pagination-last"
                onClick={() => handlePageClick(pageCount)}
              >
                <ChevronsRight aria-hidden className={chevronClass} />
              </Button>
            )
            : null}
        </ButtonGroup>
      </nav>
    );
  },
);
Pagination.displayName = 'Pagination';
