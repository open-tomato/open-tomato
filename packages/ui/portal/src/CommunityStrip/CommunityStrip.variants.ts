import { cva, type VariantProps } from 'class-variance-authority';

/**
 * CommunityStrip — the "built with friends" band: a solid-accent section
 * with a faint circuit pattern, heading + lead, three contributor quotes,
 * and an inverse CTA pair.
 */
export const portalCommunityStrip = cva(
  'relative overflow-hidden bg-accent px-7 py-15 text-on-accent',
);

/** A contributor quote card — translucent cream over the accent fill. */
export const quoteCard = cva([
  'flex flex-col gap-3 rounded-lg p-4.5',
  'bg-[color-mix(in_oklab,var(--cream-50)_10%,transparent)]',
  'border border-[color-mix(in_oklab,var(--cream-50)_20%,transparent)]',
]);

/** The quote author's initial avatar. */
export const quoteAvatar = cva([
  'flex size-7 items-center justify-center rounded-full',
  'bg-[color-mix(in_oklab,var(--cream-50)_22%,transparent)]',
  'font-display text-xs font-bold',
]);

/**
 * Inverse CTA treatments for the accent strip — these override the shared
 * Button's fill so its label/sizing/shape stay reused. `solid` is a cream
 * chip with green-700 text; `outline` is a cream-bordered ghost. Applied by
 * CommunityStrip itself (its own variants, not caller inline styling).
 */
export const communityCta = cva('', {
  variants: {
    tone: {
      solid: 'border-transparent bg-cream-50 text-green-700 shadow-xs hover:bg-cream-100',
      outline:
        'border-[color-mix(in_oklab,var(--cream-50)_30%,transparent)] bg-transparent text-cream-50 hover:bg-[color-mix(in_oklab,var(--cream-50)_10%,transparent)]',
    },
  },
  defaultVariants: { tone: 'solid' },
});

export type PortalCommunityStripVariants = VariantProps<typeof portalCommunityStrip>;
export type CommunityCtaVariants = VariantProps<typeof communityCta>;
