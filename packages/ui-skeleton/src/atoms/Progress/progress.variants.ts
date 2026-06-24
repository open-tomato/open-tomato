import { cva, type VariantProps } from 'class-variance-authority';

export const progressVariants = cva(
  'relative w-full overflow-hidden rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-secondary',
        success: 'bg-emerald-100',
        warning: 'bg-amber-100',
        destructive: 'bg-destructive/20',
      },
      size: {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export type ProgressVariants = VariantProps<typeof progressVariants>;

export const progressIndicatorVariants = cva(
  'h-full w-full flex-1 transition-transform duration-300 ease-out data-[state=indeterminate]:animate-progress-indeterminate',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        destructive: 'bg-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);
