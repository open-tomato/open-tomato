import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Landing — the marketing home composition wrapper. The sections own their
 * own vertical rhythm, so the wrapper only stacks them; it carries no chrome
 * of its own.
 */
export const portalLanding = cva('flex flex-col');

export type PortalLandingVariants = VariantProps<typeof portalLanding>;
