import * as React from 'react';

import { Typography } from '@/atoms/Typography';
import { cn } from '@/particles/cn';

import { tableVariants, type TableVariants } from './table.variants';

/**
 * Table — stateless molecule that composes the `Typography` atom (for the
 * caption) into a structured `<table>` with caption / headers / rows / footer
 * slot props.
 *
 * @remarks All visual customization flows through `variant`, `size`, and
 * `density`. There is no `className` escape hatch and no `className` is
 * forwarded to the composed `Typography` atom — the caption renders raw inside
 * `Typography variant="caption"`, while header and body cells are styled via
 * descendant selectors driven by the cva on the `<table>` root.
 *
 * The molecule does NOT own scroll behavior; for overflow on narrow viewports,
 * wrap the rendered `<Table />` in the `ScrollArea` atom and let it manage
 * horizontal scrolling. Sticky headers, sortable columns, virtualized rows,
 * and pagination are organism-level concerns and live outside this molecule.
 *
 * @example
 * ```tsx
 * <Table
 *   caption="Recent orders, week of Nov 4."
 *   headers={['Order', 'Customer', 'Amount']}
 *   rows={[
 *     ['#1023', 'Alex', '$48.20'],
 *     ['#1024', 'Sam',  '$112.00'],
 *   ]}
 *   footer={['Total', '', '$160.20']}
 * />
 *
 * <Table variant="striped" density="compact" headers={['Key', 'Value']} rows={pairs} />
 * ```
 */
export interface TableProps
  extends Omit<React.TableHTMLAttributes<HTMLTableElement>, 'className'>,
  TableVariants {
  /** Caption rendered inside `<caption>` via `Typography variant="caption"`. */
  caption?: React.ReactNode;
  /** Header cells. When provided, renders `<thead>` with one `<tr>` of `<th scope="col">` cells. */
  headers?: React.ReactNode[];
  /** Body rows. Each outer entry is a row; each inner entry is a `<td>` cell. */
  rows?: React.ReactNode[][];
  /** Footer cells. When provided, renders `<tfoot>` with one `<tr>` of `<td>` cells. */
  footer?: React.ReactNode[];
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    {
      variant,
      size,
      density,
      caption,
      headers,
      rows,
      footer,
      children,
      ...rest
    },
    ref,
  ) => {
    const resolvedVariant = variant ?? 'default';
    const resolvedSize = size ?? 'md';
    const resolvedDensity = density ?? 'comfortable';

    return (
      <table
        ref={ref}
        data-slot="table-root"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        data-density={resolvedDensity}
        className={cn(tableVariants({
          variant: resolvedVariant,
          size: resolvedSize,
          density: resolvedDensity,
        }))}
        {...rest}
      >
        {caption !== undefined
          ? (
            <caption data-slot="table-caption">
              <Typography as="span" variant="caption">{caption}</Typography>
            </caption>
          )
          : null}
        {headers !== undefined && headers.length > 0
          ? (
            <thead data-slot="table-thead">
              <tr data-slot="table-row">
                {headers.map((cell, index) => (
                  <th key={index} scope="col" data-slot="table-head">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
          )
          : null}
        {rows !== undefined && rows.length > 0
          ? (
            <tbody data-slot="table-tbody">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} data-slot="table-row">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} data-slot="table-cell">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )
          : null}
        {footer !== undefined && footer.length > 0
          ? (
            <tfoot data-slot="table-tfoot">
              <tr data-slot="table-row">
                {footer.map((cell, index) => (
                  <td key={index} data-slot="table-cell">
                    {cell}
                  </td>
                ))}
              </tr>
            </tfoot>
          )
          : null}
        {children}
      </table>
    );
  },
);
Table.displayName = 'Table';
