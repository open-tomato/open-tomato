import { cva, type VariantProps } from 'class-variance-authority';

export const skeletonVariants = cva(
  'block bg-muted',
  {
    variants: {
      variant: {
        rect: 'rounded-md',
        circle: 'rounded-full aspect-square',
        text: 'h-4 rounded-sm',
      },
      animate: {
        pulse: 'animate-pulse',
        wave: 'bg-gradient-to-r from-muted via-muted-foreground/20 to-muted bg-[length:200%_100%] animate-wave',
        none: '',
      },
    },
    defaultVariants: { variant: 'rect', animate: 'pulse' },
  },
);

export type SkeletonVariants = VariantProps<typeof skeletonVariants>;
