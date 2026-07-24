import { cva, type VariantProps } from 'class-variance-authority';

/**
 * DocsTOC — the docs right rail: a sticky "On this page" anchor list plus an
 * "edit this page" card.
 */
export const docsTocAside = cva('sticky top-20 self-start');

/** The mono "On this page" eyebrow. */
export const docsTocLabel = cva(
  'mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg3',
);

/**
 * An anchor link in the list. `!` beats tokens.css's unlayered `a` rule
 * (accent color + underline); the active anchor darkens and its rail turns
 * primary.
 */
export const docsTocLink = cva(
  'block border-l pl-2.5 text-[13px] !no-underline',
  {
    variants: {
      active: {
        true: 'border-primary !text-fg1',
        false: 'border-border-soft !text-fg2 hover:!text-fg1',
      },
    },
    defaultVariants: { active: false },
  },
);

export type DocsTocLinkVariants = VariantProps<typeof docsTocLink>;
