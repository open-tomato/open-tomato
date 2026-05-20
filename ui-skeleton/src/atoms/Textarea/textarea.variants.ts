import { cva, type VariantProps } from 'class-variance-authority';

export const textareaVariants = cva(
  'flex w-full rounded-md border bg-background text-foreground '
  + 'placeholder:text-muted-foreground transition-colors resize-y '
  + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 '
  + 'disabled:cursor-not-allowed disabled:opacity-50 '
  + 'data-[auto-resize]:resize-none data-[auto-resize]:overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-input focus-visible:ring-ring',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-emerald-500 focus-visible:ring-emerald-500',
      },
      size: {
        sm: 'min-h-[60px] px-2.5 py-1.5 text-xs',
        md: 'min-h-[80px] px-3 py-2 text-sm',
        lg: 'min-h-[100px] px-3.5 py-2.5 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export type TextareaVariants = VariantProps<typeof textareaVariants>;
