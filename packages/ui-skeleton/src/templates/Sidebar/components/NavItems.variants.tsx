import { cva, type VariantProps } from 'class-variance-authority';

import { buttonBaseEffects } from '@/atoms/Button/button.variants';

export const buttonNavItemVariants = cva(
  [
    'flex', 'gap-2', 'rounded-md', 'text-left', 'text-sm font-medium', //layout
    'justify-start', 'items-center',  // position + alignment
    'text-sm',// font
    'text-secondary-foreground', ' bg-transparent', ' text-fg-2',// colors
    ...buttonBaseEffects, // inherited effects
    'cursor-default', 'hover:cursor-pointer',
    ' transition background var(--dur-fast) var(--ease-out)',
  ],
  {
    variants: {
      variant: {
        default: ' ',
    
      },
      active: {
        true: 'bg-muted text-secondary-foreground cursor-default hover:cursor-default',
        false: ' hover:text-accent-foreground hover:bg-accent/90',
      },
      collapsed: {
        true: ['px-1', 'pt-2', 'pb-3', 'justify-center'],
        false: ['px-3', 'pt-2', 'pb-3', 'justify-start'],
      },
    },
    defaultVariants: { 
      variant: 'default', 
      active: false, 
      collapsed: false,
    },
  },
);

export type ButtonNavItemVariants = VariantProps<typeof buttonNavItemVariants>;
