import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root container for the resizable panel group. `react-resizable-panels`
 * owns the Group's `display`, `flex-direction`, `flex-wrap`, and `overflow`
 * styles internally (the library docs explicitly list those as
 * non-overridable), so the cva here is intentionally minimal — it carries
 * sizing and the `data-direction` hook for downstream styling.
 */
export const resizableVariants = cva('h-full w-full', {
  variants: {
    direction: {
      horizontal: '',
      vertical: '',
    },
  },
  defaultVariants: { direction: 'horizontal' },
});

export type ResizableVariants = VariantProps<typeof resizableVariants>;

/**
 * Per-panel className. `react-resizable-panels` applies this to a nested
 * `<div>` inside the Panel root so flex sizing is not interfered with —
 * see the library docs. The class supplies minimal `overflow-hidden` and
 * `relative` defaults so panel content can position freely without
 * affecting the surrounding layout.
 */
export const resizablePanelVariants = cva('relative overflow-hidden');

/**
 * Resize-handle separator. `react-resizable-panels` owns the Separator's
 * `flex-grow` and `flex-shrink` styles (non-overridable per the library
 * docs); the cva here drives the cross-axis thickness, hover affordance,
 * and the focus-visible ring. The visible bar stays at 1px while the
 * library-managed hit-target sits inside the gap, ensuring the
 * interactive area is large enough for accessibility.
 */
export const resizableHandleVariants = cva(
  'relative flex items-center justify-center bg-border outline-none '
  + 'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 '
  + 'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
  {
    variants: {
      direction: {
        horizontal: 'w-px',
        vertical: 'h-px',
      },
    },
    defaultVariants: { direction: 'horizontal' },
  },
);

/**
 * Visible grip decoration rendered inside the Separator when
 * `withHandle: true`. A small bordered surface centered on the handle so
 * consumers see a tangible drag affordance — the bare 1px bar alone is
 * hard to discover on dense layouts. The icon rotates 90° in vertical
 * mode so the visual grip orientation always aligns with the drag axis.
 */
export const resizableHandleDecorationVariants = cva(
  'z-10 flex items-center justify-center rounded-sm border border-border bg-background text-muted-foreground',
  {
    variants: {
      direction: {
        horizontal: 'h-4 w-3 [&_svg]:size-2.5',
        vertical: 'h-3 w-4 [&_svg]:size-2.5 [&_svg]:rotate-90',
      },
    },
    defaultVariants: { direction: 'horizontal' },
  },
);
