import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Shared wrapper-frame variants consumed by input-shaped atoms and molecules
 * (Input, Textarea, NativeSelect, Select). Standardizes the visible frame
 * (border, ring, padding, height) so the four surfaces stay visually aligned.
 *
 * Axes:
 * - `variant`  — validation intent (default | error | success).
 * - `size`     — overall scale (sm | md | lg). Drives height and horizontal padding.
 * - `density`  — vertical compression. `compact` overrides the size-derived height
 *                for use inside tighter rows. Textarea consumers may swap `h-*`
 *                for `min-h-*` at the call site if a multi-line affordance is required.
 * - `tone`     — surface treatment. `subtle` removes the border and uses a muted
 *                background for embedded use; `inverted` paints over dark backdrops.
 *
 * Composition rule: this particle is consumed by atom variant files (and by Select's
 * trigger in the molecule layer). It MUST NOT be exposed directly to product code —
 * downstream consumers interact with the wrapping atom/molecule's variant axes.
 */
export const wrapperFrameVariants = cva(
  'flex w-full items-center gap-2 rounded-md text-sm transition-colors '
  + 'focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-input focus-within:ring-ring',
        error: 'border-destructive focus-within:ring-destructive',
        success: 'border-emerald-500 focus-within:ring-emerald-500',
      },
      size: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-3.5 text-base',
      },
      density: {
        comfortable: '',
        compact: '[&]:h-7 py-0',
      },
      tone: {
        neutral: 'border bg-background',
        subtle: 'border-0 bg-muted/40',
        inverted: 'border border-foreground/20 bg-foreground text-background',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      density: 'comfortable',
      tone: 'neutral',
    },
  },
);

export type WrapperFrameVariants = VariantProps<typeof wrapperFrameVariants>;
