import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Context menu Content positioning, sizing, and surface styling. Radix
 * ContextMenu does not auto-compose a Card atom (consumer-supplied items
 * are first-class), so the Content carries its own surface (border, bg,
 * shadow) inlined alongside the size-driven width and padding.
 *
 * The descendant selector on `[data-slot=context-menu-separator]` adds the
 * group-divider margin without forcing the Separator atom to expose a
 * `className` escape hatch — the atom is composed as-is and the layout is
 * driven from the parent Content's variants string.
 */
export const contextMenuContentVariants = cva(
  'z-50 overflow-hidden rounded-md border border-border bg-background text-foreground shadow-elev-2 outline-none '
  + 'animate-in fade-in-0 zoom-in-95 '
  + 'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 '
  + 'data-[state=closed]:zoom-out-95 '
  + '[&_[data-slot=context-menu-separator]]:my-1',
  {
    variants: {
      size: {
        sm: 'min-w-40 p-1 text-xs',
        md: 'min-w-48 p-1 text-sm',
        lg: 'min-w-56 p-1.5 text-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type ContextMenuVariants = VariantProps<typeof contextMenuContentVariants>;

/**
 * Per-item row (Item, CheckboxItem, SubTrigger). Drives interactive padding,
 * highlight state, disabled treatment, and the shortcut chip layout via
 * descendant selectors on `[data-slot=context-menu-shortcut]`.
 */
export const contextMenuItemVariants = cva(
  'relative flex cursor-default select-none items-center gap-2 rounded-sm outline-none transition-colors '
  + 'focus:bg-muted focus:text-foreground '
  + 'data-[highlighted]:bg-muted data-[highlighted]:text-foreground '
  + 'data-[state=open]:bg-muted data-[state=open]:text-foreground '
  + 'data-[disabled]:pointer-events-none data-[disabled]:opacity-50 '
  + '[&_[data-slot=context-menu-leading]]:flex [&_[data-slot=context-menu-leading]]:size-4 '
  + '[&_[data-slot=context-menu-leading]]:items-center [&_[data-slot=context-menu-leading]]:justify-center '
  + '[&_[data-slot=context-menu-leading]_svg]:size-4 '
  + '[&_[data-slot=context-menu-shortcut]]:ml-auto [&_[data-slot=context-menu-shortcut]]:pl-4 '
  + '[&_[data-slot=context-menu-shortcut]]:text-xs [&_[data-slot=context-menu-shortcut]]:tracking-widest '
  + '[&_[data-slot=context-menu-shortcut]]:text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2 py-1.5 text-sm',
        lg: 'px-3 py-2 text-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Non-interactive section heading row. Padding mirrors `contextMenuItemVariants`
 * at each size so labels align with the items below them.
 */
export const contextMenuLabelVariants = cva(
  'select-none font-semibold uppercase tracking-wider text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'px-2 py-1 text-[0.625rem]',
        md: 'px-2 py-1.5 text-xs',
        lg: 'px-3 py-2 text-xs',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
