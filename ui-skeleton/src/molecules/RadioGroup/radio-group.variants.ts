import { cva, type VariantProps } from 'class-variance-authority';

export const radioGroupVariants = cva('flex', {
  variants: {
    orientation: {
      vertical: 'flex-col gap-2.5',
      horizontal: 'flex-row flex-wrap gap-4',
    },
  },
  defaultVariants: { orientation: 'vertical' },
});

export type RadioGroupOrientationVariants = VariantProps<typeof radioGroupVariants>;

export const radioGroupItemVariants = cva(
  'peer aspect-square shrink-0 rounded-full border border-input bg-background text-primary '
  + 'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
  + 'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 '
  + 'data-[state=checked]:border-primary',
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

export type RadioGroupSizeVariants = VariantProps<typeof radioGroupItemVariants>;

export const radioGroupIndicatorVariants = cva(
  'flex h-full w-full items-center justify-center after:block after:rounded-full after:bg-primary',
  {
    variants: {
      size: {
        sm: 'after:size-1.5',
        md: 'after:size-2',
        lg: 'after:size-2.5',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export const radioGroupItemRowVariants = cva('flex items-start', {
  variants: {
    size: {
      sm: 'gap-1.5',
      md: 'gap-2',
      lg: 'gap-2.5',
    },
  },
  defaultVariants: { size: 'md' },
});

export const radioGroupItemLabelVariants = cva(
  'select-none text-foreground',
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

export const radioGroupItemDescriptionVariants = cva(
  'select-none text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'text-xs leading-tight',
        md: 'text-xs leading-tight',
        lg: 'text-sm leading-snug',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
