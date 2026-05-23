import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root bar surface. Hosts the top-level triggers in a horizontal flex row.
 * The `density` axis controls the gap between adjacent triggers; the `size`
 * axis is intentionally an empty pass-through here because per-trigger
 * padding / font-size is owned by `menubarTriggerVariants`.
 */
export const menubarVariants = cva(
  'flex items-center rounded-md border border-border bg-background p-1 shadow-elev-1',
  {
    variants: {
      size: {
        sm: '',
        md: '',
        lg: '',
      },
      density: {
        compact: 'gap-0',
        comfortable: 'gap-1',
      },
    },
    defaultVariants: { size: 'md', density: 'comfortable' },
  },
);

export type MenubarVariants = VariantProps<typeof menubarVariants>;

/**
 * Top-level menu trigger button. Radix sets `data-state="open" | "closed"`,
 * `data-highlighted` (active in the roving-focus group), and `data-disabled`
 * on the rendered button — the selectors below pick those up for the active
 * + focus treatments.
 */
export const menubarTriggerVariants = cva(
  'inline-flex select-none items-center rounded-sm font-medium text-foreground outline-none transition-colors '
  + 'hover:bg-accent hover:text-accent-foreground '
  + 'focus-visible:outline-2 focus-visible:outline-ring '
  + 'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground '
  + 'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground '
  + 'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Portaled per-menu Content surface. The `data-[side=*]:slide-*` selectors
 * read Radix's authoritative `data-side` after collision detection — the
 * organism's mirrored `data-align` / `data-side` carry the prop values for
 * test propagation, not the post-collision values.
 */
export const menubarContentVariants = cva(
  'z-50 overflow-hidden rounded-md border border-border bg-background text-foreground shadow-elev-2 '
  + 'outline-none focus-visible:outline-none '
  + 'data-[state=open]:animate-in data-[state=closed]:animate-out '
  + 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 '
  + 'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 '
  + 'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 '
  + 'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
  {
    variants: {
      size: {
        sm: 'min-w-[8rem]',
        md: 'min-w-[10rem]',
        lg: 'min-w-[14rem]',
      },
      density: {
        compact: 'p-0.5',
        comfortable: 'p-1',
      },
    },
    defaultVariants: { size: 'md', density: 'comfortable' },
  },
);

/**
 * Selectable menu row. Mirrors DropdownMenu's item treatment so consumers
 * carrying both organisms see identical row behaviour.
 */
export const menubarItemVariants = cva(
  'relative flex cursor-default select-none items-center gap-2 rounded-sm '
  + 'text-foreground outline-none transition-colors '
  + 'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground '
  + 'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
      density: {
        compact: 'px-2 py-0.5',
        comfortable: 'px-2 py-1.5',
      },
    },
    compoundVariants: [
      { size: 'lg', density: 'comfortable', class: 'px-3 py-2' },
      { size: 'lg', density: 'compact', class: 'px-3 py-1' },
    ],
    defaultVariants: { size: 'md', density: 'comfortable' },
  },
);

/**
 * Section heading inside a menu's Content — same role/styling vocabulary as
 * the DropdownMenu label so muscle memory carries over.
 */
export const menubarLabelVariants = cva(
  'select-none font-semibold uppercase tracking-wider text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'px-2 py-1 text-[0.625rem]',
        md: 'px-2 py-1.5 text-xs',
        lg: 'px-3 py-2 text-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** Thin horizontal rule rendered between adjacent groups / sections. */
export const menubarSeparatorVariants = cva(
  '-mx-1 my-1 h-px bg-border',
);

/**
 * Leading / trailing icon slot inside a menu row. The size axis aligns the
 * icon to the row text baseline without extra wrapping.
 */
export const menubarIconVariants = cva('inline-flex shrink-0', {
  variants: {
    size: {
      sm: 'size-3',
      md: 'size-4',
      lg: 'size-5',
    },
  },
  defaultVariants: { size: 'md' },
});
