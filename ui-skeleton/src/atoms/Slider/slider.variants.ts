import { cva, type VariantProps } from 'class-variance-authority';

export const sliderVariants = cva(
  'relative flex w-full touch-none select-none items-center '
  + 'data-[disabled]:opacity-50 '
  + 'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:min-h-44',
  {
    variants: {
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type SliderVariants = VariantProps<typeof sliderVariants>;

export const sliderTrackVariants = cva(
  'relative grow overflow-hidden rounded-full bg-secondary '
  + 'data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full',
  {
    variants: {
      size: {
        sm: 'data-[orientation=horizontal]:h-1 data-[orientation=vertical]:w-1',
        md: 'data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:w-1.5',
        lg: 'data-[orientation=horizontal]:h-2 data-[orientation=vertical]:w-2',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export const sliderRangeVariants = cva(
  'absolute bg-primary '
  + 'data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full',
);

export const sliderThumbVariants = cva(
  'block shrink-0 rounded-full border border-primary bg-background shadow '
  + 'ring-ring/50 transition-[color,box-shadow] '
  + 'hover:ring-4 focus-visible:outline-none focus-visible:ring-4 '
  + 'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'size-3',
        md: 'size-4',
        lg: 'size-5',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
