import * as React from 'react';

import { cn } from '@/particles/cn';

import { typographyVariants, type TypographyVariants } from './typography.variants';

/**
 * Set of HTML tags Typography can render. Constrained on purpose: anything
 * outside this set is either inappropriate for inline/block text (e.g. `div`)
 * or has dedicated atoms (e.g. `Kbd` for `<kbd>` semantics).
 */
export type TypographyAs =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'span'
  | 'code';

type TypographyVariant = NonNullable<TypographyVariants['variant']>;

/**
 * Default rendered tag per `variant`. Consumers override via the `as` prop
 * when visual hierarchy and semantic outline diverge (e.g. a hero card
 * with `variant="h2" as="h1"`).
 */
const variantToTag: Record<TypographyVariant, TypographyAs> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  body: 'p',
  caption: 'span',
  code: 'code',
  kbd: 'span',
};

/**
 * Typography — pure CVA wrapper that decouples visual style (`variant`) from
 * the rendered HTML tag (`as`). The `variant` axis drives size, weight,
 * tracking, leading, and any inline chip/code/kbd treatments; `as` controls
 * the element so the document outline stays correct regardless of the
 * visual hierarchy.
 *
 * @remarks All visual customization is controlled exclusively through
 * `variant`, `weight`, and `align`. There is no `className` escape hatch — if
 * a knob is missing, add a variant axis instead. Typography has no underlying
 * Radix primitive — composes safely inside paragraphs, headings, cards,
 * lists, etc.
 *
 * For keyboard-input semantics, prefer the dedicated `Kbd` atom (renders a
 * native `<kbd>`). The `kbd` *variant* here is a typographic style applied
 * to a `<span>` by default — use it when you want kbd-looking chips inside
 * larger text without the keyboard-input semantics.
 *
 * @example
 * ```tsx
 * <Typography variant="h1">Page title</Typography>
 * <Typography variant="body">Paragraph body.</Typography>
 * <Typography variant="h2" as="h1">Visually h2, semantically h1</Typography>
 * <Typography variant="code">npm install</Typography>
 * ```
 */
export interface TypographyProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color' | 'className'>,
  TypographyVariants {
  /**
   * The HTML element to render. Defaults to a sensible tag based on
   * `variant` (e.g. `variant="h2"` → `<h2>`, `variant="body"` → `<p>`,
   * `variant="code"` → `<code>`). Override when the visual style and the
   * semantic outline need to diverge.
   */
  as?: TypographyAs;
}

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ as, variant, weight, align, color, ...rest }, ref) => {
    const resolvedVariant: TypographyVariant = variant ?? 'body';
    const resolvedAs: TypographyAs = as ?? variantToTag[resolvedVariant];
    const Component = resolvedAs as React.ElementType;

    return (
      <Component
        ref={ref}
        data-slot="typography"
        data-variant={resolvedVariant}
        data-as={resolvedAs}
        className={cn(
          typographyVariants({ variant: resolvedVariant, weight, align, color }),
        )}
        {...rest}
      />
    );
  },
);
Typography.displayName = 'Typography';
