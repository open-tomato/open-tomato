import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root frame for the NavigationMenu shell. Renders as a Radix `<nav>` and
 * owns the orientation-aware flex axis. Visible styling is intentionally
 * minimal — the trigger rail (List subpart) and the viewport-based Content
 * carry the visible surface treatment.
 */
export const navigationMenuVariants = cva(
  'relative z-10 flex max-w-max flex-1 text-foreground',
  {
    variants: {
      orientation: {
        horizontal: 'items-center',
        vertical: 'flex-col items-start',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
);

export type NavigationMenuVariants = VariantProps<typeof navigationMenuVariants>;

/**
 * Trigger rail (Radix `NavigationMenu.List` — a `<ul>`). Holds each top-level
 * link, menu trigger, and decorative separator. The orientation axis flips
 * the flex direction so vertical menus stack triggers downward.
 */
export const navigationMenuListVariants = cva(
  'group flex flex-1 list-none gap-1 p-1',
  {
    variants: {
      orientation: {
        horizontal: 'flex-row items-center justify-center',
        vertical: 'flex-col items-stretch',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
);

/**
 * Per-menu Content panel. When a `Viewport` is rendered (default), Radix
 * projects the active Content into the Viewport instead of inlining it next
 * to its Trigger — the absolute positioning + width tokens below position
 * the projected panel relative to the Viewport's anchor.
 *
 * The base classes use `data-state` selectors that pick up Radix's
 * authoritative open/closed state for entry / exit animations; the
 * `data-motion` selectors pick up Radix's tab-style left/right slide motion
 * when the active menu changes between siblings.
 *
 * Per the portal-pitfalls section of the molecule-authoring skill, this
 * cva does NOT re-emit `data-side` / `data-placement` — Radix owns the
 * viewport's positioning math and the consumer-facing `orientation` is the
 * template's request, not the resolved position.
 */
export const navigationMenuContentVariants = cva(
  'left-0 top-0 w-full p-4 outline-none focus-visible:outline-none '
  + 'data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out '
  + 'data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out '
  + 'data-[motion=from-end]:slide-in-from-right-52 '
  + 'data-[motion=from-start]:slide-in-from-left-52 '
  + 'data-[motion=to-end]:slide-out-to-right-52 '
  + 'data-[motion=to-start]:slide-out-to-left-52',
  {
    variants: {
      orientation: {
        horizontal: 'absolute md:w-auto',
        vertical: 'static',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
);

/**
 * Decorative chevron indicator auto-injected as a trailing icon on each
 * menu trigger. Rotates 180° when the chevron carries `data-open=""` —
 * the template stamps the attribute based on its internal active-menu
 * state (which menu is currently open) via the controlled-passthrough
 * pattern. The Button atom rejects `className` at the type level, so the
 * rotation cannot be driven through a parent group selector on the
 * trigger; the per-icon attribute is the only viable seam.
 */
export const navigationMenuTriggerIconVariants = cva(
  'relative inline-flex shrink-0 transition-transform duration-200 '
  + 'data-[open]:rotate-180',
  {
    variants: {
      orientation: {
        horizontal: 'top-px size-3',
        vertical: 'size-3',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
);

/**
 * Link surface delta inside a `NavigationMenu.Link` (`<a>`). The link owns
 * its own hover/focus styling here — links are NOT composed via the Button
 * atom (the task descriptor specifies links as `<a href>` elements, not
 * Buttons) so this cva carries the visible treatment that Button would
 * otherwise provide.
 */
export const navigationMenuLinkVariants = cva(
  'inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium '
  + 'text-foreground transition-colors '
  + 'hover:bg-accent hover:text-accent-foreground '
  + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
  + 'focus-visible:ring-offset-2 data-[active]:bg-accent '
  + 'data-[active]:text-accent-foreground',
  {
    variants: {
      orientation: {
        horizontal: 'justify-center',
        vertical: 'w-full justify-start',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
);

/**
 * Leading icon slot inside a link entry. Sizes the consumer-supplied icon
 * to line up on the text baseline regardless of orientation.
 */
export const navigationMenuLinkIconVariants = cva(
  'inline-flex shrink-0 size-4',
);

/**
 * Decorative thin rule between top-level entries. The orientation axis
 * flips the rule's axis (vertical rule for horizontal menus, horizontal
 * rule for vertical menus) so the visual divider always cuts across the
 * flow direction.
 */
export const navigationMenuSeparatorVariants = cva(
  'shrink-0 bg-border',
  {
    variants: {
      orientation: {
        horizontal: 'mx-1 h-5 w-px self-center',
        vertical: 'my-1 h-px w-full',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
);

/**
 * Viewport host for the active menu's Content. Renders below the trigger
 * rail in horizontal mode and inline in vertical mode; absolute positioning
 * in horizontal mode anchors the viewport just under the rail without
 * pushing sibling layout.
 *
 * `bg-background` + `text-foreground` are used here rather than the
 * (undeclared) `bg-popover` / `text-popover-foreground` tokens — the
 * molecule-authoring skill calls out the silent token drop these would
 * trigger under the current Tailwind v4 `@theme` config.
 */
export const navigationMenuViewportContainerVariants = cva(
  'flex justify-center',
  {
    variants: {
      orientation: {
        horizontal: 'absolute left-0 top-full',
        vertical: 'static',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
);

export const navigationMenuViewportVariants = cva(
  'relative mt-1.5 overflow-hidden rounded-md border border-border '
  + 'bg-background text-foreground shadow-elev-2 '
  + 'origin-[top_center] '
  + 'data-[state=open]:animate-in data-[state=closed]:animate-out '
  + 'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 '
  + 'h-[var(--radix-navigation-menu-viewport-height)]',
  {
    variants: {
      orientation: {
        horizontal: 'w-[var(--radix-navigation-menu-viewport-width)] md:w-[var(--radix-navigation-menu-viewport-width)]',
        vertical: 'w-full',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
);
