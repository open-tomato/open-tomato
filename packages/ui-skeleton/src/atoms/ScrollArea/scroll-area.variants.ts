import { cva, type VariantProps } from 'class-variance-authority';

export const scrollAreaVariants = cva(
  'relative overflow-hidden',
  {
    variants: {
      orientation: {
        vertical: 'data-[orientation=vertical]:isolate',
        horizontal: 'data-[orientation=horizontal]:isolate',
        both: 'data-[orientation=both]:isolate',
      },
      frame: {
        none: '',
        bordered: 'border rounded-md',
        card: 'border rounded-md bg-card',
      },
    },
    defaultVariants: { orientation: 'vertical', frame: 'none' },
  },
);

export type ScrollAreaVariants = VariantProps<typeof scrollAreaVariants>;

export const scrollAreaViewportVariants = cva(
  'size-full rounded-[inherit] outline-none transition-[color,box-shadow] '
  + 'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-1',
  {
    variants: {
      padding: {
        none: '',
        sm: 'p-2',
        md: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: { padding: 'none' },
  },
);

export type ScrollAreaViewportVariants = VariantProps<typeof scrollAreaViewportVariants>;

export const scrollAreaScrollbarVariants = cva(
  'flex touch-none select-none p-px transition-colors',
  {
    variants: {
      orientation: {
        vertical: 'h-full w-2.5 border-l border-l-transparent',
        horizontal: 'h-2.5 flex-col border-t border-t-transparent',
      },
    },
    defaultVariants: { orientation: 'vertical' },
  },
);

export const scrollAreaThumbVariants = cva(
  'relative flex-1 rounded-full bg-border',
);
