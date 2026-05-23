import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root frame for the Sidebar template. Renders as an `<aside>` landmark
 * that anchors to the left or right viewport edge. The `collapsed` boolean
 * axis flips the rail between the persistent expanded state (rail width
 * `16rem`) and the mobile-collapsed slide-out state (rail visually
 * translated off-screen via a side-aware transform). The `side` axis flips
 * the anchoring edge AND the slide-out direction; the `density` axis tunes
 * the rail's internal vertical rhythm without changing its width.
 *
 * The `collapsed` axis is intentionally a single source of truth for both
 * the desktop-persistent and mobile-slide-out modes — see the README's
 * "Two-branch" section for why the template does not use Sheet for the
 * mobile branch (template-composes-template is BLOCKED by the layer
 * guard, and the simple transform-based slide-out keeps the template
 * self-contained until a future iteration lifts the shared
 * anchored-surface treatment to `src/particles/anchored-surface.variants.ts`).
 */
export const sidebarVariants = cva(
  // Always-visible base: fixed-position rail with focus-ring + transition
  // tokens so the slide-out animation reads as a deliberate motion choice
  // rather than a layout-shifting jump.
  'flex h-full shrink-0 flex-col border-border bg-background '
  + 'text-foreground transition-[transform,width] duration-200 ease-out '
  + 'focus-within:outline-none',
  {
    variants: {
      collapsed: {
        true: 'w-0 overflow-hidden pointer-events-none',
        false: 'w-64 pointer-events-auto',
      },
      side: {
        left: 'border-r',
        right: 'border-l',
      },
      density: {
        compact: '',
        comfortable: '',
      },
    },
    compoundVariants: [
      {
        collapsed: true,
        side: 'left',
        class: '-translate-x-full',
      },
      {
        collapsed: true,
        side: 'right',
        class: 'translate-x-full',
      },
      {
        collapsed: false,
        side: 'left',
        class: 'translate-x-0',
      },
      {
        collapsed: false,
        side: 'right',
        class: 'translate-x-0',
      },
    ],
    defaultVariants: {
      collapsed: false,
      side: 'left',
      density: 'comfortable',
    },
  },
);

export type SidebarVariants = VariantProps<typeof sidebarVariants>;

/**
 * Header band. Renders inside `<header>` at the top of the rail. The
 * `density` axis tunes the vertical padding so compact rails feel tighter
 * than comfortable ones — the horizontal padding stays constant to keep
 * the header content aligned with the nav list below.
 */
export const sidebarHeaderVariants = cva(
  'flex shrink-0 items-center gap-2 border-b border-border px-4',
  {
    variants: {
      density: {
        compact: 'h-12',
        comfortable: 'h-14',
      },
    },
    defaultVariants: { density: 'comfortable' },
  },
);

/**
 * Nav rail container. Renders inside `<nav>` between header and footer.
 * Scrolls when the nav list overflows the available height so the header
 * and footer stay pinned to the top and bottom of the rail.
 */
export const sidebarNavVariants = cva(
  'flex flex-1 flex-col overflow-y-auto',
  {
    variants: {
      density: {
        compact: 'gap-0.5 p-2',
        comfortable: 'gap-1 p-3',
      },
    },
    defaultVariants: { density: 'comfortable' },
  },
);

/**
 * Nav list (`<ul>`) holding the rendered link items. Empty cva — the
 * spacing rhythm lives on the nav container; the list itself contributes
 * no extra padding so the link surface aligns flush with the container's
 * inner edge.
 */
export const sidebarNavListVariants = cva('flex w-full list-none flex-col gap-1');

/**
 * Per nav-link `<a>` surface. Owns the link's hover / focus / active
 * treatment because nav links are NOT composed via the Button atom — the
 * descriptor specifies plain anchors so consumers can use the
 * platform-native browser semantics + Next/React-Router `<Link>` composition.
 * The `data-active=""` selector ties to the descriptor's `active` flag for
 * the persistent route-highlight state.
 */
export const sidebarNavLinkVariants = cva(
  'group inline-flex w-full items-center gap-2 rounded-md text-sm '
  + 'font-medium text-foreground transition-colors '
  + 'hover:bg-accent hover:text-accent-foreground '
  + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
  + 'focus-visible:ring-offset-2 data-[active]:bg-accent '
  + 'data-[active]:text-accent-foreground',
  {
    variants: {
      density: {
        compact: 'h-8 px-2.5',
        comfortable: 'h-9 px-3',
      },
    },
    defaultVariants: { density: 'comfortable' },
  },
);

/**
 * Leading / trailing icon slot inside a link entry. Sizes the
 * consumer-supplied node so it lines up on the text baseline regardless
 * of density.
 */
export const sidebarNavLinkIconVariants = cva('inline-flex size-4 shrink-0');

/**
 * Footer band. Renders inside `<footer>` at the bottom of the rail.
 * Mirrors the header's density-driven height so the rail feels balanced
 * top-to-bottom.
 */
export const sidebarFooterVariants = cva(
  'flex shrink-0 items-center gap-2 border-t border-border px-4',
  {
    variants: {
      density: {
        compact: 'h-12',
        comfortable: 'h-14',
      },
    },
    defaultVariants: { density: 'comfortable' },
  },
);
