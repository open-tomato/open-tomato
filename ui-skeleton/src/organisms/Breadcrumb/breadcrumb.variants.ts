import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root nav for Breadcrumb. The `size` axis drives base text size on the root,
 * inter-item gap on the inner ordered list, and separator-icon size via the
 * descendant `[&_svg]:size-*` selector on the separator subpart.
 */
export const breadcrumbVariants = cva('w-full', {
  variants: {
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: { size: 'md' },
});

export type BreadcrumbVariants = VariantProps<typeof breadcrumbVariants>;

/**
 * Inner ordered list. Renders crumbs and separators as a wrapping horizontal
 * row; gap is the only size-driven axis since text size is owned by the root.
 */
export const breadcrumbListVariants = cva(
  'flex flex-wrap items-center text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'gap-1',
        md: 'gap-1.5',
        lg: 'gap-2',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Anchor styling for non-current crumbs that carry an `href`. Hover and
 * focus-visible states keep the link discoverable without depending on
 * color alone.
 */
export const breadcrumbLinkVariants = cva(
  'inline-flex items-center rounded-sm transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring',
  {
    variants: {
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Current-page span styling. Rendered without an anchor wrapper because
 * `aria-current="page"` is mutually exclusive with link semantics — the
 * current crumb is the page the user is on, not a destination.
 */
export const breadcrumbPageVariants = cva(
  'inline-flex items-center font-medium text-foreground',
  {
    variants: {
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Separator row. Each separator renders inside a presentation-only `<li>`
 * so the surrounding screen-reader announcement stays "crumb, crumb, crumb",
 * not "crumb, slash, crumb, slash, crumb". Icon size is driven through a
 * descendant selector so consumer-supplied icons (any svg, span, or text
 * node) inherit a consistent visual rhythm.
 */
export const breadcrumbSeparatorVariants = cva(
  'inline-flex shrink-0 items-center text-muted-foreground',
  {
    variants: {
      size: {
        sm: '[&_svg]:size-3',
        md: '[&_svg]:size-3.5',
        lg: '[&_svg]:size-4',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
