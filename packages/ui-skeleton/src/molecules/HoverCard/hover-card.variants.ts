import { cva, type VariantProps } from 'class-variance-authority';

/**
 * HoverCard Content positioning + sizing axes. Surface styling (border, bg,
 * shadow, padding) is delegated to the composed `Card` atom rendered inside
 * the portaled Content, so the variant string controls only width and the
 * shared open/close animations. Width values mirror Popover for visual
 * parity across the portal-based wrapper family.
 */
export const hoverCardContentVariants = cva(
  'z-50 outline-none focus-visible:outline-none '
  + 'animate-in fade-in-0 zoom-in-95 '
  + 'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 '
  + 'data-[state=closed]:zoom-out-95',
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
    },
    defaultVariants: { size: 'md', placement: 'bottom' },
  },
);

export type HoverCardVariants = VariantProps<typeof hoverCardContentVariants>;
