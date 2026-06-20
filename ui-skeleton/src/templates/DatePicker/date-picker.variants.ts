import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Public type contract for the DatePicker template's single `size` axis.
 *
 * DatePicker composes the Popover molecule (open/close + portaled surface),
 * the Calendar organism (date grid), and the Button atom (trigger element).
 * Each composed piece owns its own visible styling via its own cva, so this
 * file's root cva intentionally emits empty class strings — the template's
 * job is to coordinate the three pieces and forward `size` to each, not to
 * draw its own surface.
 *
 * The cva still exists so `VariantProps<typeof datePickerVariants>` produces
 * the public type that the props interface extends. When a future axis grows
 * real classes (a `density` axis on the trigger, a `tone` axis on the
 * formatted-date treatment), it lands here without churn at the call site.
 */
export const datePickerVariants = cva('', {
  variants: {
    size: {
      sm: '',
      md: '',
      lg: '',
    },
  },
  defaultVariants: { size: 'md' },
});

export type DatePickerVariants = VariantProps<typeof datePickerVariants>;
