import { cva, type VariantProps } from 'class-variance-authority';

export const checkboxVariants = cva(
  'peer inline-flex shrink-0 items-center justify-center rounded-sm border border-input bg-background text-primary '
  + 'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 '
  + 'disabled:cursor-not-allowed disabled:opacity-50 '
  + 'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground '
  + 'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
  {
    variants: {
      size: {
        sm: 'size-4',
        md: 'size-5',
        lg: 'size-6',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type CheckboxVariants = VariantProps<typeof checkboxVariants>;

export const checkboxIndicatorVariants = cva(
  'group flex items-center justify-center text-current',
);

export const checkboxIconVariants = cva('', {
  variants: {
    size: {
      sm: 'size-3',
      md: 'size-3.5',
      lg: 'size-4',
    },
  },
  defaultVariants: { size: 'md' },
});

export const checkboxRootVariants = cva('inline-flex items-center', {
  variants: {
    size: {
      sm: 'gap-1.5',
      md: 'gap-2',
      lg: 'gap-2.5',
    },
  },
  defaultVariants: { size: 'md' },
});

export const checkboxLabelVariants = cva(
  'select-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'text-sm leading-none',
        md: 'text-sm leading-none',
        lg: 'text-base leading-none',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
