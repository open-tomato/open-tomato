import { cva, type VariantProps } from 'class-variance-authority';

export const collapsibleVariants = cva('flex flex-col', {
  variants: {
    size: {
      sm: 'gap-1',
      md: 'gap-2',
      lg: 'gap-3',
    },
    chevron: {
      leading: '',
      trailing: '',
      none: '',
    },
  },
  defaultVariants: { size: 'md', chevron: 'trailing' },
});

export type CollapsibleVariants = VariantProps<typeof collapsibleVariants>;

export const collapsibleContentVariants = cva('overflow-hidden', {
  variants: {
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: { size: 'md' },
});
