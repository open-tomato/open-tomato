import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Footer — the portal's link-column footer: a sunk surface with a brand
 * column, four link columns, and a mono legal bar. `--content-max` centers
 * the inner block; it has no Tailwind spacing utility so it is referenced as
 * an arbitrary value.
 */
export const portalFooter = cva([
  'bg-surface-sunk border-t border-border-soft',
  'px-7 pt-15 pb-8 mt-20',
]);

/** A column heading — mono, tracked-out, uppercase, quiet. */
export const footerHeading = cva(
  'mb-3.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg3',
);

/**
 * SocialPill — a 36px bordered icon link. `!` overrides beat tokens.css's
 * unlayered `a` rule (accent color + underline).
 */
export const socialPill = cva([
  'inline-flex size-9 items-center justify-center rounded-md',
  'border border-border-soft bg-surface-1 !text-fg1 !no-underline',
  'transition-colors hover:bg-surface-2',
]);

export type PortalFooterVariants = VariantProps<typeof portalFooter>;
