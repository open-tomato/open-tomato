import { cva, type VariantProps } from 'class-variance-authority';

export const tableVariants = cva(
  'w-full caption-bottom border-collapse text-foreground '
  + '[&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground '
  + '[&_thead]:border-b [&_thead]:border-border '
  + '[&_tfoot]:border-t [&_tfoot]:border-border [&_tfoot]:font-medium',
  {
    variants: {
      variant: {
        default:
          '[&_tbody_tr]:border-b [&_tbody_tr]:border-border '
          + '[&_tbody_tr:last-child]:border-0',
        striped: '[&_tbody_tr:nth-child(even)]:bg-muted/40',
        bordered:
          'border border-border [&_th]:border [&_th]:border-border '
          + '[&_td]:border [&_td]:border-border',
      },
      size: {
        sm: 'text-xs [&_th]:px-2 [&_td]:px-2',
        md: 'text-sm [&_th]:px-3 [&_td]:px-3',
        lg: 'text-base [&_th]:px-4 [&_td]:px-4',
      },
      density: {
        comfortable: '[&_th]:py-3 [&_td]:py-3',
        compact: '[&_th]:py-1.5 [&_td]:py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      density: 'comfortable',
    },
  },
);

export type TableVariants = VariantProps<typeof tableVariants>;
