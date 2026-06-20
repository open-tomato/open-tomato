import { cva, type VariantProps } from 'class-variance-authority';

export const buttonGroupVariants = cva('inline-flex', {
  variants: {
    orientation: {
      horizontal: 'flex-row',
      vertical: 'flex-col',
    },
    attached: {
      true: '',
      false: 'gap-2',
    },
  },
  compoundVariants: [
    {
      orientation: 'horizontal',
      attached: true,
      class:
        '[&>*]:rounded-none [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md '
        + '[&>*:not(:first-child)]:-ml-px [&>*:focus-visible]:relative [&>*:focus-visible]:z-10',
    },
    {
      orientation: 'vertical',
      attached: true,
      class:
        '[&>*]:rounded-none [&>*:first-child]:rounded-t-md [&>*:last-child]:rounded-b-md '
        + '[&>*:not(:first-child)]:-mt-px [&>*:focus-visible]:relative [&>*:focus-visible]:z-10',
    },
  ],
  defaultVariants: { orientation: 'horizontal', attached: false },
});

export type ButtonGroupVariants = VariantProps<typeof buttonGroupVariants>;
