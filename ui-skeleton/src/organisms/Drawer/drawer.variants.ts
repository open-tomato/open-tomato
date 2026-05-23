import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Backdrop overlay rendered behind the side-anchored Content. Animates with
 * the vaul Root open/close state so the fade timing stays in sync with
 * Content.
 */
export const drawerOverlayVariants = cva(
  'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm '
  + 'data-[state=open]:animate-in data-[state=closed]:animate-out '
  + 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
);

/**
 * Content positioning + sizing per `side`. Surface styling (border, bg,
 * shadow, padding) is intentionally sibling-cva (see
 * {@link drawerContentSurfaceVariants}) so the two concerns stay separable
 * per the molecule-skill portal pitfalls — sizing/anchoring tunes the
 * drawer's edge-anchored frame while the surface owns the visual treatment.
 *
 * Unlike Dialog (centered, scrim-modal, focus-trapped), Drawer is
 * gesture-driven: vaul handles the swipe-to-dismiss math, snap-point
 * animation, and side anchoring. The `side` axis here only emits the
 * positional + max-size classes; vaul's `direction` prop (mapped 1:1 from
 * `side`) handles the gesture physics.
 *
 * The `size` axis maps to a cross-axis dimension: width for `left`/`right`,
 * height for `top`/`bottom`. The cva selects the dimension by combining the
 * `side` and `size` values — see the compound classes in the variants
 * below.
 */
export const drawerContentVariants = cva(
  'fixed z-50 flex h-auto flex-col outline-none focus-visible:outline-none '
  + 'data-[state=open]:animate-in data-[state=closed]:animate-out '
  + 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 mt-0 '
          + 'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top '
          + 'rounded-b-lg border-b',
        right: 'inset-y-0 right-0 '
          + 'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right '
          + 'rounded-l-lg border-l',
        bottom: 'inset-x-0 bottom-0 mt-24 '
          + 'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom '
          + 'rounded-t-lg border-t',
        left: 'inset-y-0 left-0 '
          + 'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left '
          + 'rounded-r-lg border-r',
      },
      size: {
        sm: '',
        md: '',
        lg: '',
        xl: '',
      },
    },
    compoundVariants: [
      // Horizontal-axis sides (left/right) take the size as a width.
      { side: 'left', size: 'sm', class: 'w-72 max-w-[80vw]' },
      { side: 'left', size: 'md', class: 'w-80 max-w-[85vw]' },
      { side: 'left', size: 'lg', class: 'w-96 max-w-[90vw]' },
      { side: 'left', size: 'xl', class: 'w-[32rem] max-w-[95vw]' },
      { side: 'right', size: 'sm', class: 'w-72 max-w-[80vw]' },
      { side: 'right', size: 'md', class: 'w-80 max-w-[85vw]' },
      { side: 'right', size: 'lg', class: 'w-96 max-w-[90vw]' },
      { side: 'right', size: 'xl', class: 'w-[32rem] max-w-[95vw]' },
      // Vertical-axis sides (top/bottom) take the size as a height.
      { side: 'top', size: 'sm', class: 'h-48 max-h-[60vh]' },
      { side: 'top', size: 'md', class: 'h-64 max-h-[70vh]' },
      { side: 'top', size: 'lg', class: 'h-80 max-h-[80vh]' },
      { side: 'top', size: 'xl', class: 'h-96 max-h-[90vh]' },
      { side: 'bottom', size: 'sm', class: 'h-48 max-h-[60vh]' },
      { side: 'bottom', size: 'md', class: 'h-64 max-h-[70vh]' },
      { side: 'bottom', size: 'lg', class: 'h-80 max-h-[80vh]' },
      { side: 'bottom', size: 'xl', class: 'h-96 max-h-[90vh]' },
    ],
    defaultVariants: { side: 'right', size: 'md' },
  },
);

export type DrawerVariants = VariantProps<typeof drawerContentVariants>;

/**
 * Surface styling applied to the drawer Content. Sibling to
 * {@link drawerContentVariants} per the portal-based organism pitfalls
 * (see `skills/molecule-authoring/SKILL.md` and `skills/organism-authoring/SKILL.md`):
 * sizing/anchoring and surface are intentionally separable so a future
 * composition with a Card atom would compose this cva conditionally rather
 * than the base.
 */
export const drawerContentSurfaceVariants = cva(
  'border-border bg-background text-foreground shadow-elev-2 gap-4',
  {
    variants: {
      size: {
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
        xl: 'p-6',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Gesture handle rendered above the body content for vertical drawers
 * (`top` / `bottom`). vaul ships its own `Handle` component; the cva here
 * just owns the visual pill treatment + spacing.
 */
export const drawerHandleVariants = cva(
  'mx-auto h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30',
);

export const drawerHeaderVariants = cva('flex flex-col gap-2 text-left');

export const drawerTitleVariants = cva(
  'font-semibold leading-none tracking-tight text-foreground',
  {
    variants: {
      size: {
        sm: 'text-base',
        md: 'text-lg',
        lg: 'text-xl',
        xl: 'text-2xl',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export const drawerDescriptionVariants = cva(
  'text-sm text-muted-foreground',
);

export const drawerBodyVariants = cva('flex flex-1 flex-col overflow-y-auto');

export const drawerFooterVariants = cva(
  'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
);
