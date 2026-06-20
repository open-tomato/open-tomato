import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root layout for Pagination. The root is a `<nav>` wrapping a single
 * `ButtonGroup`. `size` is reflected on the root but its visual effect lives
 * downstream — it propagates to each Button's `size` axis and to the
 * auto-injected chevron icon size via lookup tables in the component file —
 * so the root cva leaves all `size` branches empty. The `align` axis is
 * owned at the root and controls horizontal alignment of the inner
 * ButtonGroup via flex justification utilities.
 */
export const paginationVariants = cva('flex w-full', {
  variants: {
    size: {
      sm: '',
      md: '',
      lg: '',
    },
    align: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
    },
  },
  defaultVariants: { size: 'md', align: 'center' },
});

export type PaginationVariants = VariantProps<typeof paginationVariants>;

/**
 * Ellipsis placeholder rendered in place of skipped page ranges. Sized to
 * match the surrounding Button atoms (height ≈ Button `h-8` / `h-9` / `h-10`)
 * so the row stays visually aligned. Color is `text-muted-foreground` because
 * ellipses are decorative — the surrounding page buttons carry the semantic
 * information for assistive tech.
 */
export const paginationEllipsisVariants = cva(
  'inline-flex shrink-0 items-center justify-center text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'size-8 text-xs',
        md: 'size-9 text-sm',
        lg: 'size-10 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
