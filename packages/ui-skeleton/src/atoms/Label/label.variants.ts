import { cva, type VariantProps } from 'class-variance-authority';

export const labelVariants = cva(
  'inline-flex items-center gap-0.5 font-medium leading-none text-foreground '
  + 'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
      required: {
        true: '',
        false: '',
      },
    },
    defaultVariants: { size: 'md', required: false },
  },
);

export type LabelVariants = VariantProps<typeof labelVariants>;

export const labelRequiredIndicatorVariants = cva(
  'ml-0.5 select-none font-medium leading-none text-destructive',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
