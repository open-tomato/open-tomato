import { cva, type VariantProps } from 'class-variance-authority';

export const toggleGroupVariants = cva('inline-flex items-center', {
  variants: {
    orientation: {
      horizontal: 'flex-row gap-1',
      vertical: 'flex-col gap-1',
    },
  },
  defaultVariants: { orientation: 'horizontal' },
});

export type ToggleGroupVariants = VariantProps<typeof toggleGroupVariants>;
