import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Hero — the landing marquee: a two-column band with the release badge,
 * oversized display headline, lead, CTA pair, and social-proof stats on the
 * left; the mascot in a gold glow on the right. A faint accent circuit-vine
 * ornament bleeds behind everything.
 */
export const portalHero = cva('relative overflow-hidden px-7 pt-20 pb-15');

/**
 * The gold radial glow behind the hero media. `filter`/`radial-gradient`
 * with a theme token have no utility, so the recipe lives here (not inline
 * on the caller).
 */
export const heroGlow = cva([
  'absolute -inset-2 rounded-full blur-[20px]',
  'bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold-500)_18%,transparent),transparent_70%)]',
]);

export type PortalHeroVariants = VariantProps<typeof portalHero>;
