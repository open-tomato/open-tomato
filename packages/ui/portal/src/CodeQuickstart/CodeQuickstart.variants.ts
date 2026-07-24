import { cva, type VariantProps } from 'class-variance-authority';

/**
 * CodeQuickstart — the "install, seed, run" band: copy on the left, a
 * charcoal terminal card on the right. Part of the Landing composition.
 */
export const portalCodeQuickstart = cva('px-7 pt-5 pb-10');

/** The terminal card — charcoal chrome with a titlebar and code body. */
export const terminalCard = cva(
  'overflow-hidden rounded-lg border border-char-200 bg-char-500 shadow-md',
);

export type PortalCodeQuickstartVariants = VariantProps<typeof portalCodeQuickstart>;
