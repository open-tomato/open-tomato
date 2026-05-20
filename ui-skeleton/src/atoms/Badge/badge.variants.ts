import { cva, type VariantProps } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-full border font-medium '
  + 'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
  + 'focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-5 px-2 text-[10px] leading-none',
        md: 'h-6 px-2.5 text-xs leading-none',
        lg: 'h-7 px-3 text-sm leading-none',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;
