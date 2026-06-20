import { cva, type VariantProps } from 'class-variance-authority';

export const alertVariants = cva('', {
  variants: {
    severity: {
      info: '',
      success: '',
      warning: '',
      error: '',
    },
    size: {
      sm: '',
      md: '',
      lg: '',
    },
  },
  defaultVariants: { severity: 'info', size: 'md' },
});

export type AlertVariants = VariantProps<typeof alertVariants>;

export const alertHeaderVariants = cva('flex items-start gap-3', {
  variants: {
    severity: {
      info: '[&_[data-slot=alert-leading]]:text-foreground',
      success: '[&_[data-slot=alert-leading]]:text-emerald-600',
      warning: '[&_[data-slot=alert-leading]]:text-amber-600',
      error: '[&_[data-slot=alert-leading]]:text-destructive',
    },
  },
  defaultVariants: { severity: 'info' },
});
