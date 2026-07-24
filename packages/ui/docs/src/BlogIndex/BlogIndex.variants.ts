import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Blog post accent tones. Each post is pinned to an enumerated `tone` axis
 * (never a caller-driven color value) shared by the category label, the
 * featured-card gradient, and the BlogPost author avatar so the blog index
 * and a post can never drift.
 */
export type PostTone = 'green' | 'primary' | 'gold' | 'info' | 'accent';

/** Container — centered column with the blog index width/padding. */
export const portalBlogIndex = cva(
  'mx-auto max-w-[var(--content-max)] px-7 pt-12',
);

/** The mono category label; colored by post tone. */
export const postCategoryText = cva('font-mono font-semibold', {
  variants: {
    tone: {
      green: 'text-green-500',
      primary: 'text-primary',
      gold: 'text-gold-500',
      info: 'text-info',
      accent: 'text-accent',
    },
  },
  defaultVariants: { tone: 'accent' },
});

/** Featured-card shell — two-column, lifts its shadow on hover. */
export const featuredCard = cva([
  'group relative grid cursor-pointer grid-cols-[1.1fr_1.4fr] overflow-hidden',
  'rounded-xl border border-border-soft bg-surface-1 shadow-sm',
  'transition-shadow duration-200 ease-out hover:shadow-md',
]);

/** Featured-card media panel — a diagonal tone-tinted wash behind the mascot. */
export const featuredMedia = cva(
  'relative flex min-h-[260px] items-center justify-center',
  {
    variants: {
      tone: {
        green: 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--green-500)_70%,transparent),color-mix(in_oklab,var(--green-500)_30%,transparent))]',
        primary: 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_70%,transparent),color-mix(in_oklab,var(--primary)_30%,transparent))]',
        gold: 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--gold-500)_70%,transparent),color-mix(in_oklab,var(--gold-500)_30%,transparent))]',
        info: 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--info)_70%,transparent),color-mix(in_oklab,var(--info)_30%,transparent))]',
        accent: 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent)_70%,transparent),color-mix(in_oklab,var(--accent)_30%,transparent))]',
      },
    },
    defaultVariants: { tone: 'accent' },
  },
);

/** Small post card — lifts and gains a shadow on hover (transform only). */
export const postCard = cva([
  'group relative flex cursor-pointer flex-col gap-3',
  'rounded-lg border border-border-soft bg-surface-1 p-[22px]',
  'transition-[transform,box-shadow] duration-200 ease-out',
  'hover:-translate-y-0.5 hover:shadow-sm',
]);

/**
 * The stretched overlay link that makes the whole card clickable while keeping
 * the heading a real heading (accessible clickable-card pattern). `!` beats
 * the unlayered `a` underline; `z-10` keeps it above the card content.
 */
export const postCardLink = cva('absolute inset-0 z-10 !no-underline');

/** The cream category chip pinned to the featured media (fixed cream tone). */
export const featuredCategoryChip = cva(
  'absolute left-4 top-4 rounded-full bg-cream-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-char-300',
);

export type FeaturedMediaVariants = VariantProps<typeof featuredMedia>;
