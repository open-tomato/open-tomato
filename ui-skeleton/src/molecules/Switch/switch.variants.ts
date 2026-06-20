import { cva, type VariantProps } from 'class-variance-authority';

export const switchVariants = cva(
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent '
  + 'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
  + 'focus-visible:ring-offset-2 focus-visible:ring-offset-background '
  + 'disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-input',
  {
    variants: {
      size: {
        sm: 'h-5 w-9',
        md: 'h-6 w-11',
        lg: 'h-7 w-14',
      },
      variant: {
        default: 'data-[state=checked]:bg-primary',
        success: 'data-[state=checked]:bg-emerald-500',
        destructive: 'data-[state=checked]:bg-destructive',
      },
    },
    defaultVariants: { size: 'md', variant: 'default' },
  },
);

export type SwitchVariants = VariantProps<typeof switchVariants>;

export const switchThumbVariants = cva(
  'pointer-events-none block rounded-full bg-background shadow-lg ring-0 '
  + 'transition-transform data-[state=unchecked]:translate-x-0',
  {
    variants: {
      size: {
        sm: 'size-4 data-[state=checked]:translate-x-4',
        md: 'size-5 data-[state=checked]:translate-x-5',
        lg: 'size-6 data-[state=checked]:translate-x-7',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export const switchRootVariants = cva('inline-flex items-center', {
  variants: {
    size: {
      sm: 'gap-1.5',
      md: 'gap-2',
      lg: 'gap-2.5',
    },
  },
  defaultVariants: { size: 'md' },
});

export const switchLabelVariants = cva(
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
