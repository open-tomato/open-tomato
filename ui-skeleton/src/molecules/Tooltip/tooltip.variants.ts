import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Tooltip Content positioning + sizing axes. Surface styling (border, bg,
 * shadow, padding) is intentionally baked into the base string because
 * Tooltip — unlike Popover — never composes the Card atom: tooltips are
 * always short text and the Radix Content is the only DOM element between
 * the portal and the Typography wrapper.
 */
export const tooltipContentVariants = cva(
  'z-50 rounded-md border border-border bg-background text-foreground '
  + 'shadow-elev-2 outline-none focus-visible:outline-none '
  + 'animate-in fade-in-0 zoom-in-95 '
  + 'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 '
  + 'data-[state=closed]:zoom-out-95',
  {
    variants: {
      size: {
        sm: 'max-w-48 px-2 py-1',
        md: 'max-w-64 px-2.5 py-1.5',
        lg: 'max-w-80 px-3 py-2',
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
    defaultVariants: { size: 'md', placement: 'top', align: 'center' },
  },
);

export type TooltipVariants = VariantProps<typeof tooltipContentVariants>;
