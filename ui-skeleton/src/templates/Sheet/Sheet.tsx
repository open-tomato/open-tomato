import * as React from 'react';

import { Dialog } from '@/organisms/Dialog';

import {
  sheetContentVariants,
  type SheetVariants,
} from './sheet.variants';

type SheetSide = NonNullable<SheetVariants['side']>;
type SheetSize = NonNullable<SheetVariants['size']>;

type DialogProps = React.ComponentPropsWithoutRef<typeof Dialog>;
type DialogContentProps = NonNullable<DialogProps['contentProps']>;

/**
 * Lookup table from the Sheet's `side` axis to the inline CSS positioning
 * that overrides Dialog's centered fixed positioning. Inline `style` is
 * used rather than `className` because Dialog intentionally omits
 * `'className'` from its `contentProps` type per the Dialog README's
 * "No `className` flows downward" rule. `style` is the only sanctioned
 * override path that keeps that rule intact — inline styles also beat the
 * Tailwind utility classes Dialog's own cva emits, so the side-anchoring
 * works without touching Dialog's API.
 *
 * `transform: 'translate(0, 0)'` resets the `-translate-x-1/2`
 * `-translate-y-1/2` that Dialog applies for centering; without it the
 * Sheet content sits off-screen by half its size.
 */
const positionStyleForSide: Record<SheetSide, React.CSSProperties> = {
  top: {
    top: 0,
    right: 0,
    left: 0,
    bottom: 'auto',
    transform: 'translate(0, 0)',
  },
  right: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 'auto',
    transform: 'translate(0, 0)',
  },
  bottom: {
    right: 0,
    bottom: 0,
    left: 0,
    top: 'auto',
    transform: 'translate(0, 0)',
  },
  left: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 'auto',
    transform: 'translate(0, 0)',
  },
};

/**
 * Lookup table from `(side, size)` to the cross-axis dimension that
 * anchors Sheet's surface to the chosen viewport edge:
 *
 * - Horizontal sides (`left` / `right`) take `size` as a width and span
 *   the full viewport height.
 * - Vertical sides (`top` / `bottom`) take `size` as a height and span
 *   the full viewport width.
 *
 * Values are intentionally aligned with `drawerContentVariants` in the
 * Drawer organism (the gesture-driven equivalent) so the two surfaces
 * feel consistent when an iteration moves between them. The Sheet's
 * `size` axis also forwards to Dialog's `size` axis via a direct
 * passthrough — see {@link dialogSizeForSheetSize} — so the surface
 * padding and title text scale stay in sync.
 */
const dimensionStyleForSideSize: Record<
  SheetSide,
  Record<SheetSize, React.CSSProperties>
> = {
  left: {
    sm: { width: '18rem', maxWidth: '80vw' },
    md: { width: '20rem', maxWidth: '85vw' },
    lg: { width: '24rem', maxWidth: '90vw' },
    xl: { width: '32rem', maxWidth: '95vw' },
  },
  right: {
    sm: { width: '18rem', maxWidth: '80vw' },
    md: { width: '20rem', maxWidth: '85vw' },
    lg: { width: '24rem', maxWidth: '90vw' },
    xl: { width: '32rem', maxWidth: '95vw' },
  },
  top: {
    sm: { height: '12rem', maxHeight: '60vh' },
    md: { height: '16rem', maxHeight: '70vh' },
    lg: { height: '20rem', maxHeight: '80vh' },
    xl: { height: '24rem', maxHeight: '90vh' },
  },
  bottom: {
    sm: { height: '12rem', maxHeight: '60vh' },
    md: { height: '16rem', maxHeight: '70vh' },
    lg: { height: '20rem', maxHeight: '80vh' },
    xl: { height: '24rem', maxHeight: '90vh' },
  },
};

/**
 * Direct passthrough lookup table from Sheet's `size` axis to Dialog's
 * `size` axis. The two axes share the same union shape so the table is
 * trivially identity — kept as an explicit table to match the canonical
 * template-authoring lookup-table pattern and to surface any future axis
 * divergence at compile time.
 */
const dialogSizeForSheetSize = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
} as const;

/**
 * Sheet — side-anchored template that composes the Dialog organism for
 * portal + accessibility + visible surface treatment, and owns only the
 * positioning axis (`side`) and the cross-axis sizing axis (`size`). Slot
 * vocabulary mirrors Dialog one-to-one (`trigger`, `title`, `description`,
 * `header`, `footer`, `children`) and is forwarded transparently.
 *
 * @remarks
 * Sheet vs Dialog vs Drawer. Dialog is centered, scrim-modal, and
 * dismisses on escape or outside-click; the interaction model is "modal
 * interruption with a confirm or cancel". Drawer is side-anchored AND
 * gesture-driven via vaul — bottom sheets on touch, side panels on
 * desktop; reach for Drawer when the surface should feel native and
 * swipe-aware. Sheet is side-anchored but NOT gesture-driven; it reuses
 * Dialog's portal + focus trap + accessibility machinery and only owns
 * the positional axis. Reach for Sheet when the surface should be a
 * side-anchored, modal-style panel (a settings drawer that doesn't need
 * native-feeling gestures, a quick-access side panel, a content browser
 * that opens from an edge).
 *
 * All visual customization flows through `side` and `size`. There is no
 * `className` escape hatch. The `size` axis forwards 1:1 to Dialog's
 * `size` axis (drives surface padding + title scale) via the
 * {@link dialogSizeForSheetSize} lookup table, and the `(side, size)`
 * pair drives the cross-axis dimension via the
 * {@link dimensionStyleForSideSize} lookup table. Positioning overrides
 * flow through inline `style` projected via Dialog's `contentProps.style`
 * — Dialog's `contentProps` type omits `'className'` per its cardinal
 * no-className rule, but `style` and `data-*` are explicitly allowed, so
 * the side-anchored positioning lands without modifying Dialog's API.
 *
 * `trigger` is forwarded as-is to Dialog's `trigger` slot — Dialog owns
 * the internal `<RadixDialog.Trigger asChild>` wiring. Pass a `Button`
 * atom (or any single React element with an accessible name) per the
 * `trigger: React.ReactElement` signature.
 *
 * Dialog (via Radix Dialog) renders the Content with `role="dialog"` and
 * auto-wires `aria-labelledby` (Title) and `aria-describedby`
 * (Description). Tests MUST scan `document.body` with axe, not
 * `container` — Radix portals into `document.body` and a container-scoped
 * axe scan misses the portaled Content. The Sheet template surfaces its
 * resolved `side` as a `data-side` attribute on the Dialog Content via
 * `contentProps` so tests and downstream styling can introspect the
 * anchoring axis without className inspection.
 *
 * Entrance/exit animations from Dialog (zoom + fade) are partially
 * overridden by the inline `transform: 'translate(0, 0)'` reset; this is
 * a deliberate trade-off until the Phase 4 Sidebar task lifts the shared
 * anchored-surface treatment into `src/particles/anchored-surface.variants.ts`,
 * at which point Sheet and Sidebar both consume the particle (with proper
 * slide-in keyframes) and this trade-off goes away.
 *
 * @example
 * ```tsx
 * <Sheet
 *   trigger={<Button>Open settings</Button>}
 *   title="Settings"
 *   description="Configure your workspace preferences."
 * >
 *   <SettingsForm />
 * </Sheet>
 *
 * <Sheet
 *   side="bottom"
 *   size="lg"
 *   trigger={<Button>Filters</Button>}
 *   title="Filter results"
 *   footer={<Button>Apply</Button>}
 * >
 *   <FilterList />
 * </Sheet>
 * ```
 */
export interface SheetProps
  extends Omit<DialogProps, 'size' | 'tone' | 'contentProps'>,
  SheetVariants {
  /**
   * Pass-through props for the underlying Dialog Content (focus handlers,
   * escape-key handlers, etc.). `className`, `children`, `style`, and
   * `data-side` are owned by the template and excluded — the template
   * uses `style` + `data-side` to project its `side`/`size` overrides
   * into the composed Dialog's Content, and the Dialog organism itself
   * already blocks `className` on its `contentProps` per the
   * no-className-downward cardinal rule.
   */
  contentProps?: Omit<DialogContentProps, 'style' | 'data-side'>;
}

export const Sheet = React.forwardRef<HTMLDivElement, SheetProps>((
  {
    side,
    size,
    trigger,
    title,
    description,
    header,
    footer,
    children,
    contentProps,
    ...rest
  },
  ref,
) => {
  const resolvedSide: SheetSide = side ?? 'right';
  const resolvedSize: SheetSize = size ?? 'md';

  // Touch the variants helper so the cva block is referenced at the call
  // site even though Sheet's visible styling lives in Dialog + inline
  // style. Keeps `sheetContentVariants` in the type graph for the
  // `SheetVariants` export and stops tree-shakers from pruning the cva
  // block if a future axis grows real classes.
  void sheetContentVariants({ side: resolvedSide, size: resolvedSize });

  const projectedStyle: React.CSSProperties = {
    ...positionStyleForSide[resolvedSide],
    ...dimensionStyleForSideSize[resolvedSide][resolvedSize],
  };

  // Widen the projected contentProps to accept `style` + `data-side`,
  // which are owned by the template projection (and are intentionally
  // not part of the public `contentProps` type so consumers cannot
  // override them). Radix's typed Content props do not declare a
  // `data-*` index signature, so a one-step cast is the minimal-friction
  // path to pass the attribute through cleanly.
  const projectedContentProps = {
    ...(contentProps ?? {}),
    'data-side': resolvedSide,
    style: projectedStyle,
  } as DialogContentProps;

  return (
    <Dialog
      ref={ref}
      size={dialogSizeForSheetSize[resolvedSize]}
      trigger={trigger}
      title={title}
      description={description}
      header={header}
      footer={footer}
      contentProps={projectedContentProps}
      {...rest}
    >
      {children}
    </Dialog>
  );
});
Sheet.displayName = 'Sheet';
