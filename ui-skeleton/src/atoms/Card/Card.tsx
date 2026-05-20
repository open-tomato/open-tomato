import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  cardContentVariants,
  cardDescriptionVariants,
  cardFooterVariants,
  cardHeaderVariants,
  cardSectionPaddingMap,
  cardTitleVariants,
  cardVariants,
  type CardPadding,
  type CardVariants,
} from './card.variants';

/**
 * Card — single encapsulated wrapper that folds shadcn's multi-part Card
 * (root + header + title + description + content + footer) into one
 * slot-based component.
 *
 * @remarks All visual customization MUST go through `variant` and `padding`.
 * `className` is an escape hatch only and is discouraged in this design system.
 *
 * Sections render conditionally: the header section is emitted when `header`,
 * `title`, or `description` is set; the footer section is emitted when `footer`
 * is set. `header` (when provided) replaces the default `title` / `description`
 * layout — use it for fully custom header markup (e.g. with action buttons).
 *
 * @example
 * ```tsx
 * <Card title="Login" description="Use your email">
 *   <LoginForm />
 * </Card>
 *
 * <Card variant="elevated" padding="lg" footer={<Button>Save</Button>}>
 *   …
 * </Card>
 * ```
 */
export interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
  CardVariants {
  /**
   * Custom header content. When set, replaces the default
   * `title`/`description` layout inside the header section.
   */
  header?: React.ReactNode;
  /** Title rendered inside the default header layout. */
  title?: React.ReactNode;
  /** Supporting description rendered beneath the title. */
  description?: React.ReactNode;
  /** Footer content rendered in its own section beneath the body. */
  footer?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      padding,
      header,
      title,
      description,
      footer,
      children,
      ...rest
    },
    ref,
  ) => {
    const resolvedVariant = variant ?? 'default';
    const resolvedPadding: CardPadding = padding ?? 'md';
    const sectionPadding = cardSectionPaddingMap[resolvedPadding];

    const hasHeader = header !== undefined || title !== undefined || description !== undefined;
    const hasFooter = footer !== undefined;

    return (
      <div
        ref={ref}
        data-variant={resolvedVariant}
        data-padding={resolvedPadding}
        className={cn(
          cardVariants({ variant: resolvedVariant, padding: resolvedPadding }),
          className,
        )}
        {...rest}
      >
        {hasHeader
          ? (
            <div data-slot="card-header" className={cn(cardHeaderVariants(), sectionPadding)}>
              {header ?? (
                <>
                  {title !== undefined
                    ? <div data-slot="card-title" className={cn(cardTitleVariants())}>{title}</div>
                    : null}
                  {description !== undefined
                    ? (
                      <div data-slot="card-description" className={cn(cardDescriptionVariants())}>
                        {description}
                      </div>
                    )
                    : null}
                </>
              )}
            </div>
          )
          : null}
        {children !== undefined && children !== null
          ? (
            <div data-slot="card-content" className={cn(cardContentVariants(), sectionPadding)}>
              {children}
            </div>
          )
          : null}
        {hasFooter
          ? (
            <div data-slot="card-footer" className={cn(cardFooterVariants(), sectionPadding)}>
              {footer}
            </div>
          )
          : null}
      </div>
    );
  },
);
Card.displayName = 'Card';
