import { cva, type VariantProps } from 'class-variance-authority';

export const accordionVariants = cva('flex w-full', {
  variants: {
    orientation: {
      vertical: 'flex-col',
      horizontal: 'flex-row',
    },
    size: {
      sm: '',
      md: '',
      lg: '',
    },
  },
  defaultVariants: { orientation: 'vertical', size: 'md' },
});

export type AccordionVariants = VariantProps<typeof accordionVariants>;

export const accordionItemVariants = cva('border-b border-border last:border-b-0', {
  variants: {
    orientation: {
      vertical: '',
      horizontal: 'border-r border-b-0 last:border-r-0',
    },
    size: {
      sm: '',
      md: '',
      lg: '',
    },
  },
  defaultVariants: { orientation: 'vertical', size: 'md' },
});

export const accordionTriggerVariants = cva(
  'flex w-full flex-1 items-center justify-between gap-2 font-medium text-foreground transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'py-2 text-xs',
        md: 'py-3 text-sm',
        lg: 'py-4 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export const accordionContentSpacingVariants = cva('text-foreground', {
  variants: {
    size: {
      sm: 'pb-2',
      md: 'pb-3',
      lg: 'pb-4',
    },
  },
  defaultVariants: { size: 'md' },
});
