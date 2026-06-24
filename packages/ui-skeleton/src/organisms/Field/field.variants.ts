import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root layout for Field. Renders a vertical stack of Label → Input → optional
 * description / error message. `size` tunes inter-row gap rhythm; `invalid` is
 * a boolean axis whose visual effect lives downstream (it maps to Input's
 * `variant="error"` via a lookup table in the component file), so the root
 * cva leaves both `true` and `false` empty.
 */
export const fieldVariants = cva('flex w-full flex-col', {
  variants: {
    size: {
      sm: 'gap-1',
      md: 'gap-1.5',
      lg: 'gap-2',
    },
    invalid: {
      true: '',
      false: '',
    },
  },
  defaultVariants: { size: 'md', invalid: false },
});

export type FieldVariants = VariantProps<typeof fieldVariants>;

/**
 * Message-row styling for the description and error slots. The `tone` axis
 * tints the inner Typography via a descendant selector targeting
 * `data-slot="typography"` — Typography's own `text-muted-foreground` (from
 * `variant="caption"`) is overridden by the descendant selector's higher
 * specificity (one class + one attribute beats one class).
 *
 * `neutral` leaves Typography's caption color intact (muted-foreground);
 * `destructive` overrides to the destructive token for the error slot.
 */
export const fieldMessageVariants = cva('inline-block', {
  variants: {
    tone: {
      neutral: '',
      destructive: '[&_[data-slot=typography]]:text-destructive',
    },
  },
  defaultVariants: { tone: 'neutral' },
});
