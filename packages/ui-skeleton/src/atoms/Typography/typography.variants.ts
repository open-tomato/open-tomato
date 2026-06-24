import { cva, type VariantProps } from 'class-variance-authority';

export const typographyVariants = cva('text-foreground', {
  variants: {
    variant: {
      display: 'text-6xl font-bold tracking-tight leading-none',
      h1: 'text-4xl font-bold tracking-tight leading-tight',
      h2: 'text-3xl font-bold tracking-tight leading-tight',
      h3: 'text-2xl font-semibold tracking-tight leading-snug',
      h4: 'text-xl font-semibold tracking-tight leading-snug',
      h5: 'text-lg font-semibold tracking-tight leading-snug',
      body: 'text-base leading-relaxed',
      caption: 'text-xs leading-normal text-muted-foreground',
      code: 'font-mono text-sm bg-muted rounded px-1.5 py-0.5',
      kbd:
        'inline-flex items-center font-mono text-xs bg-muted border border-border '
        + 'rounded px-1.5 leading-none shadow-elev-1 align-middle',
    },
    weight: {
      light: 'font-light',
      regular: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    },
    // `color: 'inherit'` lets composing molecules (e.g. Item's active
    // state) drive the text color via the parent's text-* class.
    // `default` keeps the base `text-foreground` so standalone usage in
    // body context is unchanged. The axis is declared LAST so cva
    // applies its class after the variant axis — tailwind-merge then
    // resolves `text-inherit` over any earlier `text-*` for color
    // inheritance to actually take effect.
    color: {
      default: '',
      inherit: 'text-inherit',
    },
  },
  defaultVariants: { variant: 'body', color: 'default' },
});

export type TypographyVariants = VariantProps<typeof typographyVariants>;
