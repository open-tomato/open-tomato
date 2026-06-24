import { ChevronRight } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  breadcrumbLinkVariants,
  breadcrumbListVariants,
  breadcrumbPageVariants,
  breadcrumbSeparatorVariants,
  breadcrumbVariants,
  type BreadcrumbVariants,
} from './breadcrumb.variants';

/**
 * Crumb descriptor — discriminated `type: 'crumb'`. Renders as an `<a>`
 * when `href` is supplied AND the crumb is not current; otherwise renders
 * as a `<span>` (with `aria-current="page"` on the current crumb).
 */
export interface BreadcrumbCrumbEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'crumb';
  /** Visible label rendered inside the anchor or current-page span. */
  label: React.ReactNode;
  /** Optional href. Ignored when the crumb resolves as current. */
  href?: string;
  /**
   * Force this crumb to render as the current page (`aria-current="page"`,
   * no anchor) regardless of position. When omitted, the last crumb in
   * `items` is treated as current.
   */
  current?: boolean;
}

/**
 * Separator descriptor — discriminated `type: 'separator'`. Renders inside
 * a presentation-only `<li>` between adjacent crumbs. Default icon is
 * lucide-react's `ChevronRight`; override per-separator via `icon`.
 */
export interface BreadcrumbSeparatorEntry {
  /** Discriminated-union tag — required, not optional. */
  type: 'separator';
  /** Override the default `ChevronRight` icon for this separator only. */
  icon?: React.ReactNode;
}

/**
 * Items[] descriptor union. The required `type` discriminator narrows each
 * entry in `items.map(...)` between crumb-shape and separator-shape branches.
 */
export type BreadcrumbItem = BreadcrumbCrumbEntry | BreadcrumbSeparatorEntry;

/**
 * Breadcrumb — stateless items[]-driven organism that renders a navigation
 * trail. The root is a `<nav aria-label="Breadcrumb">` wrapping an ordered
 * list (`<ol>`); each descriptor in `items` resolves to either an anchored
 * crumb, a current-page span, or a presentation-only separator. Default
 * separator is lucide-react's `ChevronRight`.
 *
 * @remarks All visual customization flows through `size`. There is no
 * `className` escape hatch and no internal state. The current crumb (any
 * descriptor with `current: true`, otherwise the last `type: 'crumb'` entry
 * in `items`) renders without an anchor wrapper even when `href` is
 * supplied — `aria-current="page"` is mutually exclusive with link
 * semantics. Consumers explicitly interleave `{ type: 'separator' }`
 * descriptors between crumbs; the organism does NOT auto-inject separators.
 *
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { type: 'crumb', label: 'Home', href: '/' },
 *     { type: 'separator' },
 *     { type: 'crumb', label: 'Library', href: '/library' },
 *     { type: 'separator', icon: <Slash aria-hidden /> },
 *     { type: 'crumb', label: 'Settings' },
 *   ]}
 * />
 * ```
 */
export interface BreadcrumbProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'className'>,
  BreadcrumbVariants {
  /** Items rendered as crumbs and separators, in order. */
  items: BreadcrumbItem[];
}

export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  (props, ref) => {
    const {
      items,
      size,
      'aria-label': ariaLabel = 'Breadcrumb',
      ...rest
    } = props;

    const resolvedSize = size ?? 'md';

    let lastCrumbIndex = -1;
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i]?.type === 'crumb') {
        lastCrumbIndex = i;
        break;
      }
    }

    return (
      <nav
        ref={ref}
        aria-label={ariaLabel}
        data-slot="breadcrumb-root"
        data-size={resolvedSize}
        className={cn(breadcrumbVariants({ size: resolvedSize }))}
        {...rest}
      >
        <ol
          data-slot="breadcrumb-list"
          className={cn(breadcrumbListVariants({ size: resolvedSize }))}
        >
          {items.map((item, index) => {
            if (item.type === 'separator') {
              return (
                <li
                  key={`breadcrumb-separator-${index}`}
                  role="presentation"
                  aria-hidden
                  data-slot="breadcrumb-separator"
                  className={cn(breadcrumbSeparatorVariants({ size: resolvedSize }))}
                >
                  {item.icon ?? <ChevronRight aria-hidden />}
                </li>
              );
            }

            const isCurrent = item.current === true || index === lastCrumbIndex;
            const showAnchor = !isCurrent && item.href !== undefined;

            return (
              <li
                key={`breadcrumb-crumb-${index}`}
                data-slot="breadcrumb-item"
              >
                {showAnchor
                  ? (
                    <a
                      href={item.href}
                      data-slot="breadcrumb-link"
                      className={cn(breadcrumbLinkVariants({ size: resolvedSize }))}
                    >
                      {item.label}
                    </a>
                  )
                  : (
                    <span
                      data-slot="breadcrumb-page"
                      aria-current={isCurrent
                        ? 'page'
                        : undefined}
                      className={cn(breadcrumbPageVariants({ size: resolvedSize }))}
                    >
                      {item.label}
                    </span>
                  )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  },
);
Breadcrumb.displayName = 'Breadcrumb';
