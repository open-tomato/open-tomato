import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Backdrop overlay rendered behind the centered Content. Animates with the
 * Radix Root open/close state so the fade timing stays in sync with Content.
 */
export const dialogOverlayVariants = cva(
  'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm '
  + 'data-[state=open]:animate-in data-[state=closed]:animate-out '
  + 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
);

/**
 * Content positioning + sizing. Surface styling (border, bg, shadow, padding,
 * tone-driven title tint) is intentionally sibling-cva (see
 * {@link dialogContentSurfaceVariants}) so the two concerns stay separable
 * per the portal-based pitfalls in `skills/molecule-authoring/SKILL.md` —
 * sizing tunes the dialog width while the surface owns the visual frame.
 *
 * The `tone` axis has empty class strings here because tone affects the
 * title text color via a descendant selector applied on the surface, not the
 * Content frame itself. Same shape as AlertDialog's `severity` axis.
 */
export const dialogContentVariants = cva(
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
      tone: {
        neutral: '',
        info: '',
      },
    },
    defaultVariants: { size: 'md', tone: 'neutral' },
  },
);

export type DialogVariants = VariantProps<typeof dialogContentVariants>;

/**
 * Surface styling applied to the dialog Content. Sibling to
 * {@link dialogContentVariants} per the portal-based organism pitfalls
 * (see `skills/molecule-authoring/SKILL.md` and `skills/organism-authoring/SKILL.md`):
 * sizing and surface are intentionally separable so a future variant that
 * composes a Card atom can swap the surface cva conditionally rather than
 * touching the sizing cva. Mirrors AlertDialog and Drawer.
 *
 * The `tone` axis tints the title via a descendant selector — neutral keeps
 * the default `text-foreground`, info routes the title text through
 * `text-primary` for an accented heading. Mirrors the Empty organism's
 * descendant-selector tone pattern so the slot content stays raw while the
 * surface owns the tint.
 */
export const dialogContentSurfaceVariants = cva(
  'rounded-lg border border-border bg-background text-foreground shadow-elev-2',
  {
    variants: {
      size: {
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
        xl: 'p-6',
      },
      tone: {
        neutral: '',
        info: '[&_[data-slot=dialog-title]]:text-primary',
      },
    },
    defaultVariants: { size: 'md', tone: 'neutral' },
  },
);

export const dialogHeaderVariants = cva('flex flex-col gap-2 text-left');

export const dialogTitleVariants = cva(
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

export const dialogDescriptionVariants = cva(
  'text-sm text-muted-foreground',
);

export const dialogBodyVariants = cva('flex flex-1 flex-col');

export const dialogFooterVariants = cva(
  'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
);
