/* eslint-disable react-refresh/only-export-components --
 * Sidebar exports the component plus its `useSidebar` hook in the same
 * file — this matches the template-authoring skill's convention that
 * context hooks colocate with the owning template (see
 * `skills/template-authoring/SKILL.md` → "Internal state and context").
 * Fast-refresh's only-component-exports rule is incompatible with that
 * convention; the disable matches the precedent set by AppContextProvider
 * / AuthProvider in `packages/shared/eslint-config/AGENTS.md`.
 */

import { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/particles/cn';

import { ButtonNavItem } from './components/ButtonNavItem';
import {
  sidebarFooterVariants,
  sidebarHeaderVariants,
  sidebarNavLinkIconVariants,
  // sidebarNavLinkVariants,
  sidebarNavListVariants,
  sidebarNavVariants,
  sidebarVariants,
  type SidebarVariants,
} from './sidebar.variants';

type ResolvedMode = NonNullable<SidebarVariants['mode']>;
type ResolvedSide = NonNullable<SidebarVariants['side']>;
type ResolvedDensity = NonNullable<SidebarVariants['density']>;

/**
 * Descriptor for a single nav link rendered inside the Sidebar's `<nav>`.
 * Single-shape descriptor (no discriminator) — the rail holds links only;
 * separators / submenus would belong to a future axis or a different
 * template.
 */
export interface SidebarNavItem {
  /** Stable identifier used as the React key (defaults to `href` when omitted). */
  id?: string;
  /** Visible label rendered inside the `<a>` element. */
  label: React.ReactNode;
  /** Target URL passed straight to the underlying `<a href>`. */
  href: string;
  /**
   * Optional leading icon (lucide-react node, badge, avatar). Rendered raw
   * inside an `aria-hidden` span sized by {@link sidebarNavLinkIconVariants}
   * — decorative because the link's accessible name comes from `label`.
   */
  leading?: React.ElementType<LucideIcon> | React.ReactNode;
  /**
   * Optional trailing slot (badge, count, chevron). Rendered raw inside an
   * `aria-hidden` span when it should not contribute to the accessible
   * name; consumers can opt in to an announced trailing slot by passing a
   * `<span aria-hidden={false}>` themselves.
   */
  trailing?: React.ElementType<LucideIcon> | React.ReactNode;
  /**
   * Marks the link as the currently-active route. Stamps `data-active=""`
   * + `aria-current="page"` on the rendered `<a>`. The template does NOT
   * derive activeness from URL — the consumer wires it from their router.
   */
  active?: boolean;
  /**
   * Optional click handler forwarded to the rendered `<a>`. Use when the
   * consumer needs to intercept navigation — SPA routers (Next/Link via
   * onClick), state-driven demos, or modal-style nav. The handler runs
   * BEFORE the browser follows `href`; call `event.preventDefault()` to
   * suppress default navigation entirely.
   */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

/**
 * Public context value exposed by Sidebar's provider. Consumers nested
 * inside `<Sidebar>` can read the resolved variant values via
 * {@link useSidebar} so they do not need to thread the same props down
 * through their own component tree. The context is read-only; consumers
 * own the `mode` value and drive it through the public `mode` prop.
 *
 * Deeply-nested children typically branch on `mode === 'rail'` to
 * collapse text labels into icon-only treatments while the rail remains
 * keyboard-focusable.
 */
export interface SidebarContextValue {
  /** Resolved `mode` axis (after default substitution). */
  mode: ResolvedMode;
  /** Resolved `side` axis. */
  side: ResolvedSide;
  /** Resolved `density` axis. */
  density: ResolvedDensity;
  /** Resolved `floating` axis. */
  floating: boolean;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

/**
 * Read the resolved Sidebar variant values from inside a nested child.
 * Throws when called outside a `<Sidebar>` tree so a missing provider
 * surfaces at the first render call instead of as a silent `undefined`.
 */
export const useSidebar = (): SidebarContextValue => {
  const value = React.useContext(SidebarContext);

  if (value === null) {
    throw new Error('useSidebar must be used inside <Sidebar>');
  }

  return value;
};

/**
 * Sidebar — page-surface template that frames the application's primary
 * navigation rail. Renders as an `<aside>` landmark anchored to the left
 * or right viewport edge, with a header band, a `<nav>` rail of link
 * items, and a footer band stacked vertically inside it.
 *
 * @remarks
 * Three-mode behavior. The `mode` tri-state axis is the single source of
 * truth for the rail's visibility. The desktop branch (`mode='expanded'`)
 * renders the rail at its full 264px width with all slots visible. The
 * desktop icon-rail branch (`mode='rail'`) narrows the rail to 64px so
 * labels collapse but icons remain interactive AND in the accessibility
 * tree — labels disappear visually via the descriptor slots, not via
 * `aria-hidden`. The mobile-hide branch (`mode='hidden'`) slides the
 * rail off-screen via a side-aware `translate-x` transform and stamps
 * `aria-hidden="true"` + `pointer-events-none` so AT users and keyboard
 * users do not encounter the off-screen content. All three branches
 * share the same `<aside>` DOM — there is no separate mobile-overlay
 * element — which keeps the template self-contained and inside the
 * template-composes-template ban (cardinal rule #11).
 *
 * The template-composes-template ban explicitly forbids importing the
 * Sheet template here. The PLAN's "if Sheet composition is needed, lift
 * the shared anchored-surface treatment to
 * `src/particles/anchored-surface.variants.ts`" is the sanctioned escape
 * for any future iteration that needs Sheet's modal-overlay semantics
 * (focus trap, portal, scrim) on the hidden branch. This iteration's
 * hidden branch uses a pure CSS slide-out — sufficient for a persistent
 * nav rail; insufficient for surfaces that need a modal dismissal flow.
 *
 * All visual customization flows through `mode`, `side`, and `density`.
 * There is no `className` escape hatch. Layout-level granularity (rail
 * width, link padding, header height) is captured by variant axes per
 * the template-authoring skill.
 *
 * Sidebar exposes a `SidebarContext` and a `useSidebar` hook so deeply-
 * nested children (e.g. a custom header avatar, a collapse toggle inside
 * the footer) can read the resolved `mode` / `side` / `density` without
 * prop-drilling. The context is read-only — consumers own the `mode`
 * value and drive it through the public `mode` prop.
 *
 * @example
 * ```tsx
 * <Sidebar
 *   header={<Typography variant="h6">Acme</Typography>}
 *   nav={[
 *     { label: 'Dashboard', href: '/', leading: <Home aria-hidden />, active: true },
 *     { label: 'Reports', href: '/reports', leading: <BarChart aria-hidden /> },
 *     { label: 'Settings', href: '/settings', leading: <Settings aria-hidden />, trailing: <Badge>3</Badge> },
 *   ]}
 *   footer={<Button variant="ghost">Sign out</Button>}
 * />
 *
 * <Sidebar mode="rail" nav={items} />
 *
 * <Sidebar
 *   mode="hidden"
 *   side="right"
 *   density="compact"
 *   nav={items}
 * />
 * ```
 */
export interface SidebarProps
  extends Omit<
    React.HTMLAttributes<HTMLElement>,
    'className'
  >,
  SidebarVariants {
  /**
   * Header content rendered inside `<header>` at the top of the rail.
   * Typically a brand mark + workspace switcher. Pass `null` or omit when
   * the rail does not need a header band.
   */
  header?: React.ReactNode;
  /**
   * Nav link descriptors rendered as `<a>` elements inside the `<nav>`
   * landmark. Single-shape descriptor — see {@link SidebarNavItem}.
   */
  nav: SidebarNavItem[];
  /**
   * Footer content rendered inside `<footer>` at the bottom of the rail.
   * Typically a user menu + sign-out action. Pass `null` or omit when the
   * rail does not need a footer band.
   */
  footer?: React.ReactNode;
  /**
   * Optional `aria-label` applied to the rendered `<nav>` landmark inside
   * the rail. Defaults to `'Sidebar navigation'` so axe's
   * `landmark-unique` rule passes for the first Sidebar on the page; when
   * multiple Sidebars or other `<nav>` landmarks coexist, pass a more
   * specific label per landmark.
   */
  navAriaLabel?: string;
}

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  (
    {
      mode,
      side,
      density,
      floating,
      header,
      nav,
      footer,
      navAriaLabel,
      children,
      'aria-label': ariaLabel,
      ...rest
    },
    ref,
  ) => {
    const resolvedMode: ResolvedMode = mode ?? 'expanded';
    const resolvedSide: ResolvedSide = side ?? 'left';
    const resolvedDensity: ResolvedDensity = density ?? 'comfortable';
    const resolvedFloating: boolean = floating ?? false;
    const resolvedNavLabel = navAriaLabel ?? 'Sidebar navigation';

    const contextValue = React.useMemo<SidebarContextValue>(
      () => ({
        mode: resolvedMode,
        side: resolvedSide,
        density: resolvedDensity,
        floating: resolvedFloating,
      }),
      [resolvedMode, resolvedSide, resolvedDensity, resolvedFloating],
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <aside
          ref={ref}
          data-slot="sidebar-root"
          data-mode={resolvedMode}
          data-side={resolvedSide}
          data-density={resolvedDensity}
          data-floating={resolvedFloating
            ? ''
            : undefined}
          data-state={resolvedMode}
          aria-label={ariaLabel}
          aria-hidden={resolvedMode === 'hidden'
            ? true
            : undefined}
          className={cn(sidebarVariants({
            mode: resolvedMode,
            side: resolvedSide,
            density: resolvedDensity,
            floating: resolvedFloating,
          }))}
          {...rest}
        >
          {header !== undefined && header !== null
            ? (
              <div
                data-slot="sidebar-header"
                className={cn(sidebarHeaderVariants({ mode: resolvedMode }))}
              >
                {header}
              </div>
            )
            : null}
          {children}
          <nav
            data-slot="sidebar-nav"
            aria-label={resolvedNavLabel}
            className={cn(sidebarNavVariants({ density: resolvedDensity }))}
          >
            <div
              data-slot="sidebar-nav-list"
              className={cn(sidebarNavListVariants())}
            >
              {nav.map(({
                id, label, href, leading: LeadingNode, active, onClick, trailing: TrailingNode,
              }, index) => {
                const key = id ?? href ?? `sidebar-nav-${index}`;
                const isActive = active === true;

                return (
                  <ButtonNavItem
                    key={key}
                    // href={href}
                    onClick={onClick}
                    leading={LeadingNode}
                    trailing={TrailingNode}
                    active={isActive}
                    collapsed={resolvedMode === 'rail'}
                    label={label}
                  />
                  // <li
                  //   key={key}
                  //   data-slot="sidebar-nav-item"
                  // >
                  //   <a
                  //     href={href}
                  //     onClick={onClick}
                  //     data-slot="sidebar-nav-link"
                  //     data-active={isActive
                  //       ? ''
                  //       : undefined}
                  //     aria-current={isActive
                  //       ? 'page'
                  //       : undefined}
                  //     className={cn(sidebarNavLinkVariants({ density: resolvedDensity }))}
                  //   >
                  //     {LeadingNode && React.isValidElement(LeadingNode) && (
                  //       <span
                  //         aria-hidden
                  //         data-slot="sidebar-nav-link-leading"
                  //         className={cn(sidebarNavLinkIconVariants())}
                  //       >
                  //         {LeadingNode}
                  //       </span>
                  //     )}
                  //     <span data-slot="sidebar-nav-link-label" className="flex-1 truncate">
                  //       {label}
                  //     </span>
                  //     {TrailingNode && React.isValidElement(TrailingNode) && (
                  //       <span
                  //         aria-hidden
                  //         data-slot="sidebar-nav-link-trailing"
                  //         className={cn(sidebarNavLinkIconVariants())}
                  //       >
                  //         {TrailingNode}
                  //       </span>
                  //     )}
                  //   </a>
                  // </li>
                );
              })}
            </div>
          </nav>
          {footer !== undefined && footer !== null
            ? (
              <footer
                data-slot="sidebar-footer"
                className={cn(sidebarFooterVariants({
                  density: resolvedDensity,
                  mode: resolvedMode,
                }))}
              >
                {footer}
              </footer>
            )
            : null}
        </aside>
      </SidebarContext.Provider>
    );
  },
);
Sidebar.displayName = 'Sidebar';
