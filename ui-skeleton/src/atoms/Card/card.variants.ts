import { cva, type VariantProps } from 'class-variance-authority';

export const cardVariants = cva(
  'flex flex-col rounded-lg bg-card text-card-foreground',
  {
    variants: {
      variant: {
        default: 'border border-border bg-background',
        elevated: 'border border-transparent bg-background shadow-elev-2',
        outlined: 'border border-border bg-transparent',
      },
      padding: {
        none: 'gap-0',
        sm: 'gap-3',
        md: 'gap-4',
        lg: 'gap-6',
      },
    },
    defaultVariants: { variant: 'default', padding: 'md' },
  },
);

export type CardVariants = VariantProps<typeof cardVariants>;

/**
 * Padding class applied to each rendered section (header / content / footer).
 * Kept parallel to `cardVariants.padding` so the root gap and inner padding
 * stay aligned per variant.
 */
export const cardSectionPaddingMap = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

export type CardPadding = keyof typeof cardSectionPaddingMap;

export const cardHeaderVariants = cva('flex flex-col gap-1.5');

export const cardTitleVariants = cva('text-base font-semibold leading-none tracking-tight');

export const cardDescriptionVariants = cva('text-sm text-muted-foreground');

export const cardContentVariants = cva('flex-1');

export const cardFooterVariants = cva('flex items-center gap-2');
