import { cva, type VariantProps } from 'class-variance-authority';

export const spinnerVariants = cva(
  'inline-block align-middle rounded-full border-solid border-current border-t-transparent animate-spin',
  {
    variants: {
      variant: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        primary: 'text-primary',
        destructive: 'text-destructive',
      },
      size: {
        sm: 'size-4 border-2',
        md: 'size-6 border-2',
        lg: 'size-8 border-[3px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export type SpinnerVariants = VariantProps<typeof spinnerVariants>;
