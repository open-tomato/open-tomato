import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root cva carrying the public `size` and `density` axes. The root is a real
 * `<div>` that stacks an optional filter toolbar, the composed `Table`
 * molecule, an optional empty-state slot, and an optional pagination footer.
 * The cva owns only the inter-slot rhythm; everything else (table surface,
 * checkbox sizing, button height) is delegated to composed pieces through
 * lookup tables.
 */
export const dataTableVariants = cva('flex w-full flex-col', {
  variants: {
    size: {
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
    },
    density: {
      comfortable: '',
      compact: '',
    },
  },
  defaultVariants: { size: 'md', density: 'comfortable' },
});

export type DataTableVariants = VariantProps<typeof dataTableVariants>;

/**
 * Toolbar row hosting the filter `Input`. Owns horizontal layout only — the
 * Input atom supplies its own border / focus ring / height via its `size`
 * axis.
 */
export const dataTableToolbarVariants = cva('flex w-full items-center');

/**
 * Pagination footer row. Splits page indicator (start) from navigation
 * buttons (end) and tunes typography rhythm against the active `size`.
 */
export const dataTableFooterVariants = cva(
  'flex w-full items-center justify-between',
  {
    variants: {
      size: {
        sm: 'gap-2 text-xs',
        md: 'gap-3 text-sm',
        lg: 'gap-4 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Sortable column header button. Inherits `<th>`'s `font-semibold` +
 * `text-foreground` via `text-current`, then adds layout + focus ring. The
 * button frame is transparent so the underlying `<th>` styling stays the
 * dominant surface; only the focus ring overlays on keyboard navigation.
 */
export const dataTableSortButtonVariants = cva(
  'inline-flex w-full cursor-pointer items-center justify-between gap-2 '
  + 'rounded-sm bg-transparent text-left text-current transition-colors '
  + 'hover:text-foreground '
  + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

/**
 * Decorative sort-direction icon. Sized to match the column-header label
 * rhythm at each `size` so the icon doesn't dominate the header cell.
 */
export const dataTableSortIconVariants = cva('inline-flex shrink-0 opacity-60', {
  variants: {
    size: {
      sm: 'size-3',
      md: 'size-3.5',
      lg: 'size-4',
    },
  },
  defaultVariants: { size: 'md' },
});

/**
 * Empty-state surface rendered when `data` is empty (or filtered to nothing).
 * Sized to match the toolbar / footer typography so the empty surface sits at
 * the same vertical scale as a populated table.
 */
export const dataTableEmptyVariants = cva(
  'flex w-full items-center justify-center text-center text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'py-4 text-xs',
        md: 'py-6 text-sm',
        lg: 'py-8 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Page indicator label rendered at the start of the pagination footer. Muted
 * so the visual emphasis stays on the navigation buttons.
 */
export const dataTablePageInfoVariants = cva('text-muted-foreground');
