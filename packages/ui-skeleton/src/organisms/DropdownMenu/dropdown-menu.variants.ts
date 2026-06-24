import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Content positioning + surface for the portaled DropdownMenu. Unlike
 * Dialog / AlertDialog / Drawer, DropdownMenu does NOT render a scrim
 * overlay — Radix only portals the menu surface itself, and outside-click /
 * escape dismissal is handled by the underlying menu primitive without a
 * blocking backdrop.
 *
 * The `align` and `side` axes carry empty class strings because Radix owns
 * the actual positioning math (it sets its own `data-side` / `data-align`
 * attributes after collision detection). The organism re-emits the resolved
 * values as `data-align` / `data-side` on the Content so tests can assert
 * variant propagation without scraping classNames; the `data-[side=*]`
 * animation selectors on the base classes pick up Radix's authoritative
 * post-collision value, not the prop value.
 *
 * Surface styling lives on the base classes (no sibling cva) because the
 * Content frame here is a flat list — there is no future composition path
 * with a Card or other surface atom to swap, unlike Dialog where the sibling
 * pattern earns its keep.
 */
export const dropdownMenuContentVariants = cva(
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
        sm: 'min-w-[8rem] p-1',
        md: 'min-w-[10rem] p-1',
        lg: 'min-w-[14rem] p-1.5',
      },
      align: {
        start: '',
        center: '',
        end: '',
      },
      side: {
        top: '',
        right: '',
        bottom: '',
        left: '',
      },
    },
    defaultVariants: { size: 'md', align: 'center', side: 'bottom' },
  },
);

export type DropdownMenuVariants = VariantProps<typeof dropdownMenuContentVariants>;

/**
 * Selectable menu row. Drives the per-item hover / focus / disabled
 * treatment. Radix sets `data-highlighted` on the focused item and
 * `data-disabled` on disabled items — the selectors below pick those up
 * for the accent treatment.
 */
export const dropdownMenuItemVariants = cva(
  'relative flex cursor-default select-none items-center gap-2 rounded-sm '
  + 'text-foreground outline-none transition-colors '
  + 'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground '
  + 'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2 py-1.5 text-sm',
        lg: 'px-3 py-2 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Section heading rendered above a group's items, or as a standalone
 * `type: 'label'` descriptor at the root level. Visually subdued — labels
 * are not selectable and Radix renders them with `role="presentation"`.
 */
export const dropdownMenuLabelVariants = cva(
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
export const dropdownMenuSeparatorVariants = cva(
  '-mx-1 my-1 h-px bg-border',
);

/**
 * Leading / trailing icon slot inside an item. The size axis lines the
 * icon up with the row height so consumer-supplied lucide icons sit on the
 * text baseline without extra wrapping.
 */
export const dropdownMenuIconVariants = cva('inline-flex shrink-0', {
  variants: {
    size: {
      sm: 'size-3',
      md: 'size-4',
      lg: 'size-5',
    },
  },
  defaultVariants: { size: 'md' },
});
