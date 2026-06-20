import * as React from 'react';

import { Typography } from '@/atoms/Typography';
import { cn } from '@/particles/cn';

import { itemVariants, type ItemVariants } from './item.variants';

/**
 * Set of HTML tags Item can render. Constrained on purpose: rows are usually
 * `<div>` (non-interactive presentation), `<li>` (inside a list), `<button>`
 * (clickable command), or `<a>` (navigation). Anything outside this set
 * either lacks the layout semantics or has dedicated atoms.
 */
export type ItemAs = 'div' | 'li' | 'button' | 'a';

/**
 * Item — stateless molecule that composes the `Typography` atom into a
 * horizontal row with leading / title / description / trailing slots and a
 * polymorphic `as` axis (`'div' | 'li' | 'button' | 'a'`).
 *
 * @remarks All visual customization flows through `size`, `interactive`,
 * `active`, and `as`. There is no `className` escape hatch and no `className`
 * is forwarded to the composed `Typography` atom — variant propagation lives
 * in the `titleVariantForSize` and `titleWeightForSize` lookup tables below.
 *
 * The `interactive` axis applies hover/focus styling but does NOT inject
 * semantic interactivity (role, tabIndex, onClick). When `as='button'` or
 * `as='a'`, the chosen element is naturally interactive; for `as='div'` or
 * `as='li'`, the consumer is responsible for wiring `onClick` / `onKeyDown`
 * and any needed `role` / `tabIndex` attributes.
 *
 * @example
 * ```tsx
 * <Item leading={<Icon />} title="Settings" description="Configure" trailing={<Chevron />} />
 *
 * <Item as="button" interactive size="lg" leading={<Icon />} title="Sign in" />
 *
 * <Item as="button" interactive active leading={<Icon />} title="Dashboard" />
 *
 * <ul>
 *   <Item as="li" title="One" />
 *   <Item as="li" title="Two" />
 * </ul>
 * ```
 */
export interface ItemProps
  extends Omit<
    React.AllHTMLAttributes<HTMLElement>,
  'title' | 'className' | 'size' | 'color' | 'as'
  >,
  ItemVariants {
  /**
   * The HTML element to render. Defaults to `'div'`. Use `'li'` inside a
   * list, `'button'` for clickable commands, `'a'` for navigation.
   */
  as?: ItemAs;
  /** Leading icon, avatar, or badge rendered at the start of the row. */
  leading?: React.ReactNode;
  /** Title rendered inside the content slot via `Typography`. */
  title?: React.ReactNode;
  /** Supporting description rendered beneath the title via `Typography`. */
  description?: React.ReactNode;
  /** Trailing actions, chevron, or badges rendered at the end of the row. */
  trailing?: React.ReactNode;
}

const titleVariantForSize = { sm: 'body', md: 'body', lg: 'h4' } as const;
const titleWeightForSize = {
  sm: 'medium' as const,
  md: 'medium' as const,
  lg: undefined,
} as const;

export const Item = React.forwardRef<HTMLElement, ItemProps>(
  (
    {
      as,
      size,
      interactive,
      active,
      leading,
      title,
      description,
      trailing,
      children,
      ...rest
    },
    ref,
  ) => {
    const resolvedAs: ItemAs = as ?? 'div';
    const resolvedSize = size ?? 'md';
    const resolvedInteractive = interactive ?? false;
    const resolvedActive = active ?? false;
    const Component = resolvedAs as React.ElementType;

    const buttonTypeProps = resolvedAs === 'button'
      ? { type: 'button' as const }
      : {};

    const hasContent = title !== undefined
      || description !== undefined
      || (children !== undefined && children !== null);

    return (
      <Component
        ref={ref}
        {...buttonTypeProps}
        data-slot="item-root"
        data-as={resolvedAs}
        data-size={resolvedSize}
        data-interactive={resolvedInteractive
          ? ''
          : undefined}
        data-active={resolvedActive
          ? ''
          : undefined}
        className={cn(itemVariants({
          size: resolvedSize,
          interactive: resolvedInteractive,
          active: resolvedActive,
        }))}
        {...rest}
      >
        {leading !== undefined
          ? <span data-slot="item-leading" aria-hidden>{leading}</span>
          : null}
        {hasContent
          ? (
            <div data-slot="item-content" className="flex min-w-0 flex-1 flex-col">
              {title !== undefined
                ? (
                  <Typography
                    as="span"
                    variant={titleVariantForSize[resolvedSize]}
                    weight={titleWeightForSize[resolvedSize]}
                    color="inherit"
                  >
                    {title}
                  </Typography>
                )
                : null}
              {description !== undefined
                ? <Typography as="span" variant="caption" color="inherit">{description}</Typography>
                : null}
              {children}
            </div>
          )
          : null}
        {trailing !== undefined
          ? <span data-slot="item-trailing">{trailing}</span>
          : null}
      </Component>
    );
  },
);
Item.displayName = 'Item';
