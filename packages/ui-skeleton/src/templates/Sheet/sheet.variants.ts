import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Public type contract for the Sheet template's two axes (`side` + `size`).
 *
 * Sheet composes the Dialog organism for portal + accessibility + visible
 * surface treatment, so its own root cva intentionally emits empty class
 * strings — Dialog's `dialogContentVariants` + `dialogContentSurfaceVariants`
 * own the visible root styling. The only template-owned visual concern is
 * the side-anchored positioning that overrides Dialog's centered fixed
 * positioning, and that override flows through inline `style` projected
 * via Dialog's `contentProps.style` (Dialog's `contentProps` type omits
 * `'className'` per its cardinal no-className rule; `style` is the only
 * sanctioned override path that respects that rule).
 *
 * When the Phase 4 Sidebar task lands and the shared anchored-surface
 * treatment is lifted to `src/particles/anchored-surface.variants.ts`,
 * both Sheet and Sidebar consume that particle and the positioning
 * lookup tables in `Sheet.tsx` collapse into the particle's cva. Until
 * then, the lookup tables are the single source of truth for the
 * side-anchored frame and this file's role is purely to derive the
 * `SheetVariants` public type from cva.
 */
export const sheetContentVariants = cva('', {
  variants: {
    side: {
      top: '',
      right: '',
      bottom: '',
      left: '',
    },
    size: {
      sm: '',
      md: '',
      lg: '',
      xl: '',
    },
  },
  defaultVariants: { side: 'right', size: 'md' },
});

export type SheetVariants = VariantProps<typeof sheetContentVariants>;
