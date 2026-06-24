import { cva, type VariantProps } from 'class-variance-authority';

export const tabsVariants = cva('flex w-full', {
  variants: {
    orientation: {
      horizontal: 'flex-col',
      vertical: 'flex-row',
    },
    size: {
      sm: '',
      md: '',
      lg: '',
    },
    density: {
      compact: '',
      comfortable: '',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
    size: 'md',
    density: 'comfortable',
  },
});

export type TabsVariants = VariantProps<typeof tabsVariants>;

export const tabsListVariants = cva(
  'inline-flex items-center text-muted-foreground',
  {
    variants: {
      orientation: {
        horizontal: 'flex-row border-b border-border',
        vertical: 'flex-col border-r border-border self-stretch',
      },
      size: {
        sm: 'gap-1',
        md: 'gap-1.5',
        lg: 'gap-2',
      },
      density: {
        compact: 'p-0.5',
        comfortable: 'p-1',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
      size: 'md',
      density: 'comfortable',
    },
  },
);

export const tabsContentVariants = cva(
  'flex-1 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      orientation: {
        horizontal: 'pt-3',
        vertical: 'pl-3',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
      density: {
        compact: '',
        comfortable: '',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
      size: 'md',
      density: 'comfortable',
    },
  },
);
