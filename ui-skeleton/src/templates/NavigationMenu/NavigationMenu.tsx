import * as RadixNavigationMenu from '@radix-ui/react-navigation-menu';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/atoms/Button';
import { cn } from '@/particles/cn';

import {
  navigationMenuContentVariants,
  navigationMenuLinkIconVariants,
  navigationMenuLinkVariants,
  navigationMenuListVariants,
  navigationMenuSeparatorVariants,
  navigationMenuTriggerIconVariants,
  navigationMenuVariants,
  navigationMenuViewportContainerVariants,
  navigationMenuViewportVariants,
  type NavigationMenuVariants,
} from './navigation-menu.variants';

type RadixNavigationMenuRootProps = React.ComponentPropsWithoutRef<
  typeof RadixNavigationMenu.Root
>;

/**
 * Plain navigation link rendered as an `<a href>` via Radix `Link`. Owns
 * its own visible accent treatment (the descriptor explicitly excludes
 * Button composition for links — only menu triggers compose Button).
 */
export interface NavigationMenuLinkEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'link';
  /** Visible label rendered inside the link. */
  label: React.ReactNode;
  /** Target URL passed straight to the underlying `<a href>`. */
  href: string;
  /**
   * Optional leading icon (lucide-react node, badge, avatar). Rendered raw
   * inside an `aria-hidden` span sized by the link icon cva — decorative
   * because the link's accessible name comes from `label`.
   */
  leading?: React.ReactNode;
}

/**
 * Menu trigger paired with a viewport-projected Content panel. Composes
 * the `Button` atom for the trigger surface (via Radix Trigger `asChild`)
 * and auto-injects a rotating chevron indicator driven by the
 * template-owned active-menu state.
 */
export interface NavigationMenuMenuEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'menu';
  /** Visible trigger label rendered inside the composed `Button` atom. */
  label: React.ReactNode;
  /** Body rendered inside the matching `<NavigationMenu.Content>` panel. */
  content: React.ReactNode;
}

/**
 * Decorative thin rule between top-level entries. Rendered as a
 * `<li role="separator" aria-hidden>` outside Radix's keyboard-nav
 * traversal so screen readers do not announce it as a list item.
 */
export interface NavigationMenuSeparatorEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'separator';
}

/**
 * Root-level items[] descriptor union. The required `type` discriminator
 * narrows each entry in `items.map(...)` between link / menu / separator
 * rendering branches.
 */
export type NavigationMenuItem =
  | NavigationMenuLinkEntry
  | NavigationMenuMenuEntry
  | NavigationMenuSeparatorEntry;

/**
 * NavigationMenu — viewport-based, items[]-driven template that wraps
 * `@radix-ui/react-navigation-menu` for a top-level navigation shell.
 * Renders a `<nav>` containing a trigger rail (Radix `List`) plus a shared
 * `Viewport` host into which the currently-open menu's Content projects.
 *
 * @remarks All visual customization flows through `orientation`. There is
 * no `className` escape hatch. The descriptor union mirrors the
 * template-authoring skill's discriminated-items recipe: `type: 'link'`
 * renders a Radix `Link` (`<a href>`), `type: 'menu'` composes the
 * `Button` atom inside a Radix `Trigger asChild` + projects `content`
 * into the Viewport, and `type: 'separator'` renders a decorative `<li>`
 * rule.
 *
 * Menu trigger variant is driven by the active-menu value via a lookup
 * table mirroring the canonical Tabs template: the currently-open menu's
 * Button receives `variant="secondary"` and idle menus receive
 * `variant="ghost"`. Internal `React.useState` implements the
 * controlled-passthrough pattern — when `value` is supplied the template
 * delegates to that controlled flow and never flips its own state.
 *
 * Per the portal-pitfalls section of the molecule-authoring skill, the
 * viewport-projected Content treats its projected DOM as portaled even
 * when Radix renders it inline inside the `<nav>`: tests MUST scan
 * `document.body` (not `container`) with axe; the descriptor surface
 * deliberately does not expose a `className` escape hatch through
 * `content`. The viewport's surface uses `bg-background` /
 * `text-foreground` rather than the (undeclared) `bg-popover` /
 * `text-popover-foreground` Tailwind tokens.
 *
 * @example
 * ```tsx
 * <NavigationMenu
 *   items={[
 *     { type: 'link', label: 'Home', href: '/' },
 *     {
 *       type: 'menu',
 *       label: 'Products',
 *       content: <p>Browse our product lineup.</p>,
 *     },
 *     { type: 'separator' },
 *     { type: 'link', label: 'Pricing', href: '/pricing' },
 *   ]}
 * />
 *
 * <NavigationMenu
 *   orientation="vertical"
 *   items={items}
 * />
 * ```
 */
export interface NavigationMenuProps
  extends Omit<RadixNavigationMenuRootProps, 'children' | 'className' | 'value' | 'defaultValue' | 'onValueChange' | 'orientation'>,
  NavigationMenuVariants {
  /**
   * Discriminated items[] union rendered into the trigger rail. The
   * required `type` tag selects between link / menu / separator rendering
   * branches.
   */
  items: NavigationMenuItem[];
  /**
   * Controlled active-menu value (Radix's internal item identifier).
   * Pair with `onValueChange`. When supplied, the template never flips
   * its internal state.
   */
  value?: string;
  /** Uncontrolled initial active-menu value. Empty string = no menu open. */
  defaultValue?: string;
  /** Fires when the active menu changes (open or close). */
  onValueChange?: (value: string) => void;
  /** Optional `aria-label` applied to the rendered `<nav>` landmark. */
  'aria-label'?: string;
}

type ResolvedOrientation = NonNullable<NavigationMenuVariants['orientation']>;

const buttonVariantForActive = {
  active: 'secondary',
  inactive: 'ghost',
} as const;

const menuValueForIndex = (index: number): string => `navigation-menu-item-${index}`;

interface RenderEntryArgs {
  item: NavigationMenuItem;
  index: number;
  orientation: ResolvedOrientation;
  activeValue: string;
}

const renderEntry = ({
  item,
  index,
  orientation,
  activeValue,
}: RenderEntryArgs): React.ReactNode => {
  if (item.type === 'separator') {
    return (
      <li
        key={`navigation-menu-separator-${index}`}
        role="separator"
        aria-hidden
        aria-orientation={orientation === 'horizontal'
          ? 'vertical'
          : 'horizontal'}
        data-slot="navigation-menu-separator"
        className={cn(navigationMenuSeparatorVariants({ orientation }))}
      />
    );
  }

  if (item.type === 'link') {
    return (
      <RadixNavigationMenu.Item
        key={`navigation-menu-link-${index}`}
        data-slot="navigation-menu-link-item"
      >
        <RadixNavigationMenu.Link
          href={item.href}
          data-slot="navigation-menu-link"
          className={cn(navigationMenuLinkVariants({ orientation }))}
        >
          {item.leading !== undefined
            ? (
              <span
                aria-hidden
                data-slot="navigation-menu-link-leading"
                className={cn(navigationMenuLinkIconVariants())}
              >
                {item.leading}
              </span>
            )
            : null}
          {item.label}
        </RadixNavigationMenu.Link>
      </RadixNavigationMenu.Item>
    );
  }

  const value = menuValueForIndex(index);
  const isActive = value !== '' && value === activeValue;
  const activeKey = isActive
    ? 'active'
    : 'inactive';

  return (
    <RadixNavigationMenu.Item
      key={value}
      value={value}
      data-slot="navigation-menu-menu-item"
      data-value={value}
    >
      <RadixNavigationMenu.Trigger
        asChild
        data-slot="navigation-menu-trigger"
      >
        <Button
          variant={buttonVariantForActive[activeKey]}
          size="md"
          trailingIcon={(
            <ChevronDown
              aria-hidden
              data-slot="navigation-menu-trigger-icon"
              data-open={isActive
                ? ''
                : undefined}
              className={cn(navigationMenuTriggerIconVariants({ orientation }))}
            />
          )}
        >
          {item.label}
        </Button>
      </RadixNavigationMenu.Trigger>
      <RadixNavigationMenu.Content
        data-slot="navigation-menu-content"
        data-value={value}
        className={cn(navigationMenuContentVariants({ orientation }))}
      >
        {item.content}
      </RadixNavigationMenu.Content>
    </RadixNavigationMenu.Item>
  );
};

const NavigationMenuImpl = React.forwardRef<HTMLElement, NavigationMenuProps>(
  (
    {
      items,
      orientation,
      value,
      defaultValue,
      onValueChange,
      'aria-label': ariaLabel,
      ...rest
    },
    ref,
  ) => {
    const resolvedOrientation: ResolvedOrientation = orientation ?? 'horizontal';
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(defaultValue ?? '');
    const resolvedValue = isControlled
      ? value
      : uncontrolledValue;
    const rootState = resolvedValue
      ? 'active'
      : 'inactive';

    const handleValueChange = React.useCallback(
      (next: string) => {
        if (!isControlled) setUncontrolledValue(next);
        onValueChange?.(next);
      },
      [isControlled, onValueChange],
    );

    return (
      <RadixNavigationMenu.Root
        ref={ref}
        orientation={resolvedOrientation}
        value={resolvedValue}
        onValueChange={handleValueChange}
        aria-label={ariaLabel}
        data-slot="navigation-menu-root"
        data-orientation={resolvedOrientation}
        data-state={rootState}
        className={cn(navigationMenuVariants({ orientation: resolvedOrientation }))}
        {...rest}
      >
        <RadixNavigationMenu.List
          data-slot="navigation-menu-list"
          className={cn(navigationMenuListVariants({ orientation: resolvedOrientation }))}
        >
          {items.map((item, index) => renderEntry({
            item,
            index,
            orientation: resolvedOrientation,
            activeValue: resolvedValue,
          }))}
        </RadixNavigationMenu.List>
        <div
          data-slot="navigation-menu-viewport-container"
          className={cn(navigationMenuViewportContainerVariants({ orientation: resolvedOrientation }))}
        >
          <RadixNavigationMenu.Viewport
            data-slot="navigation-menu-viewport"
            className={cn(navigationMenuViewportVariants({ orientation: resolvedOrientation }))}
          />
        </div>
      </RadixNavigationMenu.Root>
    );
  },
);
NavigationMenuImpl.displayName = 'NavigationMenu';

const NavigationMenu = NavigationMenuImpl;

export { NavigationMenu };
