import { cva, type VariantProps } from 'class-variance-authority';

/**
 * BlogPost — the single-article layout: a narrow reading column with a back
 * link, meta row, display headline, author card, prose body, and a footer
 * nav. Tones reuse the shared blog `PostTone` axis (see
 * `BlogIndex.variants.ts`).
 */
export const portalBlogPost = cva('mx-auto max-w-[740px] px-7 pb-[60px] pt-8');

/**
 * The round author avatar — filled in the post's tone with a cream initial.
 * Tone values mirror the blog index gradients' base colors.
 */
export const blogAuthorAvatar = cva(
  'flex size-10 items-center justify-center rounded-full font-display text-base font-bold text-cream-50',
  {
    variants: {
      tone: {
        green: 'bg-green-500',
        primary: 'bg-primary',
        gold: 'bg-gold-500',
        info: 'bg-info',
        accent: 'bg-accent',
      },
    },
    defaultVariants: { tone: 'accent' },
  },
);

/** Footer prev/next post link. `!` beats the unlayered `a` underline. */
export const blogFooterLink = cva('text-[13px] text-accent !no-underline');

export type BlogAuthorAvatarVariants = VariantProps<typeof blogAuthorAvatar>;
