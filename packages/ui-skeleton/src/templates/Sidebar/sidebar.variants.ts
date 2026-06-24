import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root frame for the Sidebar template. Renders as an `<aside>` landmark
 * that anchors to the left or right viewport edge. The `mode` tri-state
 * axis is the single source of truth for the rail's visibility:
 *
 * - `expanded` — full 264px rail, all content visible and interactive.
 * - `rail`     — 64px icon-only rail; content stays in the AT tree and
 *                remains keyboard-focusable. Visual labels collapse via
 *                the descriptor slots, not via `aria-hidden`.
 * - `hidden`   — rail slid off-screen via a side-aware `translate-x`
 *                transform; the entire `<aside>` is removed from the AT
 *                tree (`aria-hidden="true"`) and made inert
 *                (`pointer-events-none`). This is the mobile-menu hide
 *                mode.
 *
 * The visibility-state distinction matters for accessibility: stamping
 * `aria-hidden` on the icon-rail branch would create "ghost focusable"
 * anchors (focus lands on links AT cannot announce — WCAG 4.1.2). The
 * three states are not orthogonal capabilities; they are exhaustive
 * values on the same visibility axis.
 *
 * The `side` axis flips the anchoring edge AND the slide-out direction
 * (only meaningful in `mode='hidden'`). The `density` axis tunes the
 * rail's internal vertical rhythm (nav-link height + padding) without
 * changing its width or its header/footer band heights.
 */
export const sidebarVariants = cva(
  // Always-visible base: column-flex rail with focus-ring + transition
  // tokens so the slide-out animation reads as a deliberate motion choice
  // rather than a layout-shifting jump.
  'flex h-full shrink-0 flex-col border-border bg-surface-1 border-soft '
  + 'text-foreground transition-[transform,width] duration-base ease-out '
  + 'focus-within:outline-none',
  {
    variants: {
      mode: {
        expanded: 'w-sidebar pointer-events-auto translate-x-0',
        rail: 'w-sidebar-rail pointer-events-auto translate-x-0',
        hidden: 'w-0 overflow-hidden pointer-events-none',
      },
      side: {
        left: 'border-r',
        right: 'border-l',
      },
      density: {
        compact: '',
        comfortable: '',
      },
      // When `floating=true`, the rail lifts out of the document flow
      // and pins to the viewport edge (mobile overlay treatment). The
      // `false` branch keeps the rail in-flow so its width drives the
      // page main column. `fixed` here overrides `h-full` from the base
      // because `h-screen` lines up with the viewport while the
      // `<aside>` is detached from its parent's height.
      floating: {
        true: 'fixed top-0 z-50 h-screen shadow-lg',
        false: '',
      },
    },
    compoundVariants: [
      // Only the `hidden` branch needs the side-aware slide-out — the
      // `expanded` and `rail` branches bake `translate-x-0` into their
      // own variant value.
      { mode: 'hidden', side: 'left', class: '-translate-x-full' },
      { mode: 'hidden', side: 'right', class: 'translate-x-full' },
      // Floating + side determines which viewport edge the fixed rail
      // anchors against. Without these, `position: fixed` would inherit
      // a default `left: auto` that collapses against `inset-x-0` styles
      // from any ancestor.
      { floating: true, side: 'left', class: 'left-0' },
      { floating: true, side: 'right', class: 'right-0' },
    ],
    defaultVariants: {
      mode: 'expanded',
      side: 'left',
      density: 'comfortable',
      floating: false,
    },
  },
);

export type SidebarVariants = VariantProps<typeof sidebarVariants>;

/**
 * Header band. Renders inside `<header>` at the top of the rail. The
 * minimum height is anchored to the design-system `--header-h` token
 * (64px) so the rail's header landmark aligns horizontally with the
 * page Topbar above sibling layout regions; consumers stacking
 * additional content inside the header (workspace switcher, search
 * bar) can grow past that floor. The `mode` axis controls the
 * horizontal padding so the rail branch centers brand content while
 * the expanded branch left-aligns it.
 */
export const sidebarHeaderVariants = cva(
  'flex items-center h-header shrink-0 gap-2 border-b border-border',
  {
    variants: {
      mode: {
        expanded: 'py-0 px-5 justify-start',
        rail: 'py-0 px-0 justify-center ',
        hidden: 'py-3 px-0',
      },
    },
    defaultVariants: { mode: 'expanded' },
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
  // `no-underline` defeats the design-system's `a { text-decoration:
  // underline }` default; `text-left` neutralizes the `<button>`
  // user-agent default of `text-align: center` so this variant renders
  // identically on both an anchor (default `text-align: start`) and a
  // button (default `text-align: center`).
  'group inline-flex w-full items-center gap-2 rounded-md text-sm '
  + 'font-medium text-foreground text-left no-underline transition-colors '
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
export const sidebarNavLinkIconVariants = cva('inline-flex size-5 shrink-0');

/**
 * Footer band. Renders inside `<footer>` at the bottom of the rail.
 * `min-h-*` (not `h-*`) so a multi-section bottom region — token-budget
 * card + secondary nav + collapse toggle — can expand naturally while a
 * compact single-row consumer still gets its tight band. Horizontal
 * padding collapses to `0` in the rail / hidden branches so icon-only
 * footer items align with their nav-list counterparts above.
 */
export const sidebarFooterVariants = cva(
  'flex shrink-0 flex-col gap-2 border-t border-border',
  {
    variants: {
      density: {
        compact: 'min-h-12 py-2',
        comfortable: 'min-h-14 py-3',
      },
      mode: {
        expanded: 'px-4',
        rail: 'px-2',
        hidden: 'px-0',
      },
    },
    defaultVariants: { density: 'comfortable', mode: 'expanded' },
  },
);
