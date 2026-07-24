import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Callout — the tinted admonition block used in docs/blog prose (rendered by
 * DocsLayout + BlogPost). A soft tone-tinted fill with a 3px colored left
 * rule.
 *
 * The tone axis is named `tone` to match the catalog's tonal-component
 * convention (Badge/Banner use `tone` for a color axis). The tint mixes the
 * tone into `--bg` (not transparent) so the fill reads identically on cream
 * and charcoal pages.
 */
export const calloutBlock = cva(
  'my-[18px] rounded-md border-l-[3px] px-[18px] py-3.5',
  {
    variants: {
      tone: {
        leaf: 'border-green-400 bg-[color-mix(in_oklab,var(--leaf)_16%,var(--bg))]',
        warning: 'border-gold-500 bg-[color-mix(in_oklab,var(--warning)_18%,var(--bg))]',
        danger: 'border-danger bg-[color-mix(in_oklab,var(--danger)_14%,var(--bg))]',
      },
    },
    defaultVariants: { tone: 'leaf' },
  },
);

export type CalloutVariants = VariantProps<typeof calloutBlock>;
