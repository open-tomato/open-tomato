import { cva, type VariantProps } from 'class-variance-authority';

export const separatorVariants = cva(
  'shrink-0',
  {
    variants: {
      orientation: {
        horizontal: 'h-px w-full',
        vertical: 'h-full w-px',
      },
      variant: {
        default: 'bg-border',
        subtle: 'bg-border/50',
        strong: 'bg-foreground/20',
      },
    },
    defaultVariants: { orientation: 'horizontal', variant: 'default' },
  },
);

export type SeparatorVariants = VariantProps<typeof separatorVariants>;
