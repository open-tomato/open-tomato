import { cva, type VariantProps } from 'class-variance-authority';

import { buttonBaseEffects } from '@/atoms/Button/button.variants';

export const toggleWrapperVariants = cva(
  [
    'flex', 'items-center', 'justify-center', 'h-10', 'w-10', 'rounded-full', 
    'bg-transparent', 'text-gray-500', 'hover:bg-gray-100', 'focus:outline-none', 
    'focus:ring-2', 'focus:ring-gray-300', 'border-soft', 'border', 'bg-secondary',
    'fixed', 'transition-[transform,width]', 'duration-base', 'ease-out', 'z-50', 
    'isolate', 
  ],
  {
    variants: {
      isCompact: {
        true: ['top-11', 'left-11'],
        false: ['top-11', 'left-61'],
      },
    },
  },
);

export type ToggleWrapperVariants = VariantProps<typeof toggleWrapperVariants>;

export const toggleSidebarVariants = cva(
  [
    'flex', 'gap-2', 'rounded-md', 'text-left', 'text-sm font-medium', //layout
    'justify-start', 'items-center',  // position + alignment
    'text-md',// font
    'text-secondary-foreground', ' bg-transparent', ' text-fg-2',// colors
    ...buttonBaseEffects, // inherited effects
    'cursor-default', 'hover:cursor-pointer',
    ' transition background var(--dur-fast) var(--ease-out)',
  ],
  {
    variants: {
      isCompact: {
        true: {

        },
        false: {

        },
      },

    },
  },
);

export type ToggleSidebarVariants = VariantProps<typeof toggleSidebarVariants>;
