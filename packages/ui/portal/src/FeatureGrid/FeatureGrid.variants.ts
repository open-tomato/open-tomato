import { cva, type VariantProps } from 'class-variance-authority';

/**
 * FeatureGrid — the 3-up feature blocks: a section heading over a
 * three-column grid of FeatureCards.
 */
export const portalFeatureGrid = cva(
  'mx-auto w-full max-w-[var(--content-max)] px-7 py-15',
);

/**
 * FeatureCard — a bordered surface card that lifts on hover. The lift uses
 * compositor-friendly transform + shadow only.
 */
export const featureCard = cva([
  'flex flex-col gap-3.5 rounded-lg border border-border-soft bg-surface-1 p-6 shadow-xs',
  'transition-[transform,box-shadow] duration-200 ease-out',
  'hover:-translate-y-0.5 hover:shadow-md',
]);

/**
 * The card's icon tile — a 44px rounded square, tinted 14% in the feature's
 * tone with the glyph in the solid tone. Tones are enumerated (not
 * caller-driven color): the six marketing accents.
 */
export const featureIconTile = cva(
  'flex size-11 items-center justify-center rounded-md',
  {
    variants: {
      tone: {
        primary: 'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary',
        accent: 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent',
        gold: 'bg-[color-mix(in_oklab,var(--gold-500)_14%,transparent)] text-gold-500',
        green: 'bg-[color-mix(in_oklab,var(--green-500)_14%,transparent)] text-green-500',
        info: 'bg-[color-mix(in_oklab,var(--info)_14%,transparent)] text-info',
        red: 'bg-[color-mix(in_oklab,var(--red-700)_14%,transparent)] text-red-700',
      },
    },
    defaultVariants: { tone: 'primary' },
  },
);

/** The mono tag pill pinned to the card's foot. */
export const featureTag = cva(
  'rounded-full border border-border-soft bg-surface-sunk px-2 py-0.5 font-mono text-[11px] text-fg3',
);

export type FeatureIconTileVariants = VariantProps<typeof featureIconTile>;
