import * as React from 'react';
import { Drawer as Vaul } from 'vaul';

import { cn } from '@/particles/cn';

import {
  drawerBodyVariants,
  drawerContentSurfaceVariants,
  drawerContentVariants,
  drawerDescriptionVariants,
  drawerFooterVariants,
  drawerHandleVariants,
  drawerHeaderVariants,
  drawerOverlayVariants,
  drawerTitleVariants,
  type DrawerVariants,
} from './drawer.variants';

type VaulRootProps = React.ComponentPropsWithoutRef<typeof Vaul.Root>;
type VaulContentProps = React.ComponentPropsWithoutRef<typeof Vaul.Content>;

type DrawerSide = NonNullable<DrawerVariants['side']>;

/**
 * Lookup table from the organism's `side` axis to vaul's `direction` prop.
 * vaul uses `direction` to drive its gesture math (which axis the swipe
 * tracks, which edge is the anchor). The organism exposes `side` to match
 * the team vocabulary used by the Sheet template; the rename is the only
 * intentional deviation from a 1:1 passthrough.
 */
const vaulDirectionForSide: Record<DrawerSide, VaulRootProps['direction']> = {
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
};

/**
 * Drawer — portal-based, gesture-driven organism that wraps `vaul` for a
 * side-anchored sliding surface. Pairs a consumer-supplied `trigger` with a
 * Content surface anchored to one edge of the viewport, composing a
 * `title`, optional `description`, optional `header` override, body
 * `children`, and an optional `footer`.
 *
 * @remarks
 * Drawer vs Dialog. Dialog is centered, scrim-modal, and dismisses on
 * escape or outside-click; the consumer interaction model is "modal
 * interruption with a confirm or cancel". Drawer is side-anchored and
 * gesture-driven; vaul handles the swipe-to-dismiss math, snap-point
 * animation, and the body-scale background effect. Use Drawer when the
 * surface should feel native-mobile-like (bottom sheet on touch devices,
 * side panel on desktop); use Dialog when the surface is a focused modal
 * confirmation.
 *
 * All visual customization flows through `side` and `size`. There is no
 * `className` escape hatch. The `side` axis maps to vaul's `direction`
 * prop via the {@link vaulDirectionForSide} lookup table — the rename
 * exists so the organism vocabulary aligns with the Sheet template's
 * `side` prop. `side` also drives the cross-axis dimension that `size`
 * applies (width for `left`/`right`, height for `top`/`bottom`) via the
 * `compoundVariants` in {@link drawerContentVariants}.
 *
 * `trigger` is wrapped internally via `<Vaul.Trigger asChild>` — pass a
 * `Button` atom (or any single React element with an accessible name) so
 * vaul can project its event handlers and ARIA attributes.
 *
 * vaul renders the Content with `role="dialog"` and auto-wires
 * `aria-labelledby` (Title) and `aria-describedby` (Description). Tests
 * MUST scan `document.body` with axe, not `container` — vaul portals into
 * `document.body` and a container-scoped scan misses the portaled Content.
 *
 * A gesture handle is auto-rendered above the body for vertical sides
 * (`top` / `bottom`) where the swipe-to-dismiss affordance is conventional;
 * horizontal sides (`left` / `right`) omit it to avoid visual noise on a
 * surface that primarily moves with a tap or escape press.
 *
 * @example
 * ```tsx
 * <Drawer
 *   trigger={<Button>Open settings</Button>}
 *   title="Settings"
 *   description="Configure your workspace preferences."
 * >
 *   <SettingsForm />
 * </Drawer>
 *
 * <Drawer
 *   side="bottom"
 *   size="lg"
 *   trigger={<Button>Filters</Button>}
 *   title="Filter results"
 *   footer={<Button>Apply</Button>}
 * >
 *   <FilterList />
 * </Drawer>
 * ```
 */
export interface DrawerProps
  extends Omit<VaulRootProps, 'children' | 'direction'>,
  DrawerVariants {
  /**
   * Trigger element wrapped internally via vaul Trigger `asChild`. Must be
   * a single React element — fragments, strings, arrays, or `null` throw
   * at runtime when vaul calls `React.cloneElement` on the slot.
   */
  trigger: React.ReactElement;
  /**
   * Title rendered inside the Content via vaul Title. Required — vaul
   * (via the underlying Radix Dialog primitive) auto-wires
   * `aria-labelledby` to this element so axe's `aria-dialog-name` rule
   * passes for the portaled Content.
   */
  title: React.ReactNode;
  /**
   * Supporting description rendered beneath the title via vaul
   * Description. Auto-wires `aria-describedby` when present.
   */
  description?: React.ReactNode;
  /**
   * Overrides the default visible header layout. When supplied, the
   * consumer's content replaces the default `title` + `description`
   * rendering — `title` is still REQUIRED and is rendered visually-hidden
   * (`sr-only`) inside the Vaul Title so axe's `aria-dialog-name` rule
   * keeps passing for the portaled Content. Use `header` only when a
   * custom heading layout (e.g. a leading icon + title row) is needed.
   */
  header?: React.ReactNode;
  /**
   * Bottom action row rendered after the body `children`. Typically holds
   * a primary Button + optional secondary actions.
   */
  footer?: React.ReactNode;
  /**
   * Body content rendered between the header and footer inside a
   * scrollable region. Always required for a meaningful drawer.
   */
  children?: React.ReactNode;
  /**
   * Pass-through props for the underlying vaul Content (focus handlers,
   * escape-key handlers, etc.). `className` and `children` are owned by
   * the organism and excluded.
   */
  contentProps?: Omit<VaulContentProps, 'className' | 'children'>;
}

export const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>((
  {
    side,
    size,
    trigger,
    title,
    description,
    header,
    footer,
    children,
    contentProps,
    ...rest
  },
  ref,
) => {
  const resolvedSide: DrawerSide = side ?? 'right';
  const resolvedSize = size ?? 'md';
  const hasGestureHandle = resolvedSide === 'top' || resolvedSide === 'bottom';

  return (
    <Vaul.Root
      direction={vaulDirectionForSide[resolvedSide]}
      {...(rest as VaulRootProps)}
    >
      <Vaul.Trigger asChild>{trigger}</Vaul.Trigger>
      <Vaul.Portal>
        <Vaul.Overlay
          data-slot="drawer-overlay"
          className={cn(drawerOverlayVariants())}
        />
        <Vaul.Content
          ref={ref}
          data-slot="drawer-content"
          data-side={resolvedSide}
          data-size={resolvedSize}
          className={cn(
            drawerContentVariants({ side: resolvedSide, size: resolvedSize }),
            drawerContentSurfaceVariants({ size: resolvedSize }),
          )}
          {...contentProps}
        >
          {hasGestureHandle
            ? (
              <Vaul.Handle
                data-slot="drawer-handle"
                className={cn(drawerHandleVariants())}
              />
            )
            : null}
          {header !== undefined
            ? (
              <div
                data-slot="drawer-header"
                className={cn(drawerHeaderVariants())}
              >
                {header}
                <Vaul.Title
                  data-slot="drawer-title"
                  className="sr-only"
                >
                  {title}
                </Vaul.Title>
                {description !== undefined
                  ? (
                    <Vaul.Description
                      data-slot="drawer-description"
                      className="sr-only"
                    >
                      {description}
                    </Vaul.Description>
                  )
                  : null}
              </div>
            )
            : (
              <div
                data-slot="drawer-header"
                className={cn(drawerHeaderVariants())}
              >
                <Vaul.Title
                  data-slot="drawer-title"
                  className={cn(drawerTitleVariants({ size: resolvedSize }))}
                >
                  {title}
                </Vaul.Title>
                {description !== undefined
                  ? (
                    <Vaul.Description
                      data-slot="drawer-description"
                      className={cn(drawerDescriptionVariants())}
                    >
                      {description}
                    </Vaul.Description>
                  )
                  : null}
              </div>
            )}
          <div data-slot="drawer-body" className={cn(drawerBodyVariants())}>
            {children}
          </div>
          {footer !== undefined
            ? (
              <div
                data-slot="drawer-footer"
                className={cn(drawerFooterVariants())}
              >
                {footer}
              </div>
            )
            : null}
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
});
Drawer.displayName = 'Drawer';
