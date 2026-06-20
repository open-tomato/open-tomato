import { cva, type VariantProps } from 'class-variance-authority';

export const kbdVariants = cva(
  'inline-flex items-center justify-center font-mono font-medium leading-none '
  + 'text-foreground rounded-md align-middle whitespace-nowrap select-none',
  {
    variants: {
      variant: {
        outline: 'border border-border bg-muted shadow-elev-1',
        solid: 'border border-transparent bg-muted text-muted-foreground',
        ghost: 'border border-transparent bg-transparent text-muted-foreground',
      },
      size: {
        sm: 'h-5 min-w-5 px-1.5 text-[10px]',
        md: 'h-6 min-w-6 px-2 text-xs',
        lg: 'h-7 min-w-7 px-2.5 text-sm',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
);

export type KbdVariants = VariantProps<typeof kbdVariants>;
