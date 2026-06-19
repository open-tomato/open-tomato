import { cva, type VariantProps } from 'class-variance-authority';

export const buttonBaseEffects = [
  'transition-colors', 'focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-ring',
  'focus-visible:ring-offset-2', 'disabled:pointer-events-none', 'disabled:opacity-50',
  'active:scale-97', 'hover:brightness-96',
];

export const buttonVariants = cva(
  ['inline-flex', 'items-center', 'justify-center', 'gap-2', 'rounded-md', 'text-sm', 'font-medium',
    ...buttonBaseEffects] ,
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        lg: 'h-10 px-6',
        icon: 'size-9 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
