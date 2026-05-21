import { cva, type VariantProps } from 'class-variance-authority';

export const itemVariants = cva(
  'flex w-full items-center text-left',
  {
    variants: {
      size: {
        sm: 'gap-2 p-2',
        md: 'gap-3 p-3',
        lg: 'gap-4 p-4',
      },
      interactive: {
        true:
          'cursor-pointer rounded-md transition-colors hover:bg-muted/50 '
          + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
          + 'disabled:cursor-not-allowed disabled:opacity-50',
        false: '',
      },
    },
    defaultVariants: { size: 'md', interactive: false },
  },
);

export type ItemVariants = VariantProps<typeof itemVariants>;
