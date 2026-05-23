import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Sonner's Toaster is a global host — it manages its own DOM (a `<section
 * data-sonner-toaster>` with portaled toasts inside) and owns every visual
 * concern: positioning, theming, animation, and per-toast styling. The
 * organism does not render any wrapping surface, so this cva block emits
 * empty class strings for every variant: its role is to type the public API
 * axes via {@link VariantProps} and to keep the default-variant story
 * documented alongside the rest of the organism layer.
 *
 * **Position deviation.** sonner ships six positions
 * (`top-{left,center,right}` and `bottom-{left,center,right}`); there is no
 * middle-row anchor in the upstream library. The organism mirrors the
 * library — adding `middle-*` positions here would type-check at the
 * organism boundary but pass an invalid value into the Toaster at runtime.
 *
 * **Boolean axes.** `richColors`, `expand`, and `closeButton` are pure
 * passthroughs to the matching Toaster props; the cva still types them so
 * the consumer's `<Sonner richColors />` invocation gets the same treatment
 * as `<Toaster richColors />` would.
 */
export const sonnerVariants = cva('', {
  variants: {
    position: {
      'top-left': '',
      'top-center': '',
      'top-right': '',
      'bottom-left': '',
      'bottom-center': '',
      'bottom-right': '',
    },
    richColors: { true: '', false: '' },
    expand: { true: '', false: '' },
    closeButton: { true: '', false: '' },
  },
  defaultVariants: {
    position: 'bottom-right',
    richColors: false,
    expand: false,
    closeButton: false,
  },
});

export type SonnerVariants = VariantProps<typeof sonnerVariants>;
