import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Header — the portal's sticky top chrome. A translucent blurred bar over
 * the page background, brand lockup + nav on the left, search / social /
 * theme / CTA on the right.
 *
 * `--header-h` and `--bg` are theme tokens referenced as arbitrary values
 * (no Tailwind spacing/opacity utility maps them). The 80%-bg mix + blur is
 * the frosted-glass treatment; it stays in the variant, never inline.
 */
export const portalHeader = cva([
  'sticky top-0 z-30 flex h-[var(--header-h)] items-center gap-4 px-7',
  'border-b border-border-soft',
  'bg-[color-mix(in_oklab,var(--bg)_80%,transparent)]',
  'backdrop-blur-[16px]',
]);

/**
 * A single primary-nav link. Active reads in fg1 on a sunk fill; inactive
 * is a quieter fg2 that warms to the same fill on hover. `!` overrides beat
 * tokens.css's unlayered `a` element rule (color + underline).
 */
export const portalNavLink = cva(
  ['rounded-md px-3 py-1.5 text-sm !no-underline transition-colors'],
  {
    variants: {
      active: {
        true: '!text-fg1 bg-surface-sunk font-semibold',
        false: '!text-fg2 font-medium hover:bg-surface-sunk',
      },
    },
    defaultVariants: { active: false },
  },
);

export type PortalNavLinkVariants = VariantProps<typeof portalNavLink>;
