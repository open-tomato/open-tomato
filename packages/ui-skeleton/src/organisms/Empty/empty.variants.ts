import { cva, type VariantProps } from 'class-variance-authority';

export const emptyVariants = cva('', {
  variants: {
    size: {
      sm: '',
      md: '',
      lg: '',
    },
    tone: {
      neutral: '',
      info: '',
    },
  },
  defaultVariants: { size: 'md', tone: 'neutral' },
});

export type EmptyVariants = VariantProps<typeof emptyVariants>;

/**
 * Inner body layout. Empty renders a vertically stacked, centered surface
 * regardless of size — the size axis tunes spacing rhythm, while tone tints
 * the optional leading icon slot via a descendant selector.
 */
export const emptyBodyVariants = cva(
  'flex w-full flex-col items-center text-center',
  {
    variants: {
      size: {
        sm: 'gap-2',
        md: 'gap-3',
        lg: 'gap-4',
      },
      tone: {
        neutral: '[&_[data-slot=empty-leading]]:text-muted-foreground',
        info: '[&_[data-slot=empty-leading]]:text-primary',
      },
    },
    defaultVariants: { size: 'md', tone: 'neutral' },
  },
);

export const emptyActionsVariants = cva(
  'flex flex-wrap items-center justify-center',
  {
    variants: {
      size: {
        sm: 'gap-1.5',
        md: 'gap-2',
        lg: 'gap-3',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
