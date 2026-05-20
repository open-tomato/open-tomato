import { cva, type VariantProps } from 'class-variance-authority';

export const inputVariants = cva(
  'flex w-full items-center gap-2 rounded-md border bg-background text-sm '
  + 'transition-colors '
  + 'focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 '
  + 'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input focus-within:ring-ring',
        error: 'border-destructive focus-within:ring-destructive',
        success: 'border-emerald-500 focus-within:ring-emerald-500',
      },
      size: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-3.5 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export type InputVariants = VariantProps<typeof inputVariants>;

export const inputControlVariants = cva(
  'min-w-0 flex-1 bg-transparent text-foreground outline-none '
  + 'placeholder:text-muted-foreground disabled:cursor-not-allowed '
  + 'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
);

export const inputIconVariants = cva(
  'inline-flex shrink-0 items-center justify-center text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'size-3.5 [&_svg]:size-3.5',
        md: 'size-4 [&_svg]:size-4',
        lg: 'size-5 [&_svg]:size-5',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
