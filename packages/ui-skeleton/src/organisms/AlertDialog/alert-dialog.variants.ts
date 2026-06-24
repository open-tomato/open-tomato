import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Backdrop overlay rendered behind the centered Content. Animates with the
 * Radix Root open/close state so the fade timing stays in sync with Content.
 */
export const alertDialogOverlayVariants = cva(
  'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm '
  + 'data-[state=open]:animate-in data-[state=closed]:animate-out '
  + 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
);

/**
 * Content positioning + sizing. Surface styling (border, bg, shadow, padding)
 * is intentionally sibling-cva (see {@link alertDialogContentSurfaceVariants})
 * so the two concerns stay separable per the molecule-skill portal pitfalls
 * — sizing tunes the dialog width while the surface owns the visual frame.
 *
 * The `severity` axis has empty class strings here because severity affects
 * the confirm Button's `variant` axis (via the lookup table colocated with
 * the component), not the Content frame itself.
 */
export const alertDialogContentVariants = cva(
  'fixed left-1/2 top-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 '
  + 'duration-200 outline-none focus-visible:outline-none '
  + 'data-[state=open]:animate-in data-[state=closed]:animate-out '
  + 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 '
  + 'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
      },
      severity: {
        info: '',
        warning: '',
        danger: '',
      },
    },
    defaultVariants: { size: 'md', severity: 'info' },
  },
);

export type AlertDialogVariants = VariantProps<typeof alertDialogContentVariants>;

/**
 * Surface styling applied to the alertdialog Content. Sibling to
 * {@link alertDialogContentVariants} per the portal-based molecule pitfalls
 * (see `skills/molecule-authoring/SKILL.md`): sizing and surface are
 * intentionally separable so future composition with a Card atom would
 * compose this cva conditionally rather than the base.
 */
export const alertDialogContentSurfaceVariants = cva(
  'rounded-lg border border-border bg-background text-foreground shadow-elev-2',
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

export const alertDialogHeaderVariants = cva('flex flex-col gap-2 text-left');

export const alertDialogTitleVariants = cva(
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

export const alertDialogDescriptionVariants = cva(
  'text-sm text-muted-foreground',
);

export const alertDialogFooterVariants = cva(
  'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
);
