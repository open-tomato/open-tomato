import { cva, type VariantProps } from 'class-variance-authority';

export const popoverContentVariants = cva(
  'z-50 outline-none focus-visible:outline-none',
  {
    variants: {
      size: {
        sm: 'w-56',
        md: 'w-72',
        lg: 'w-96',
      },
      placement: {
        top: '',
        right: '',
        bottom: '',
        left: '',
      },
      align: {
        start: '',
        center: '',
        end: '',
      },
    },
    defaultVariants: { size: 'md', placement: 'bottom', align: 'center' },
  },
);

export type PopoverVariants = VariantProps<typeof popoverContentVariants>;

/**
 * Surface styling applied to the popover Content only when the molecule is
 * NOT composing the Card atom (i.e., neither `title` nor `description` is
 * provided). When Card is composed, the Card supplies the surface via its
 * `elevated` variant + `padding` axis, and Content stays unpadded to avoid
 * a doubly-padded shell.
 */
export const popoverContentSurfaceVariants = cva(
  'rounded-md border border-border bg-background text-foreground shadow-elev-2',
  {
    variants: {
      size: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
