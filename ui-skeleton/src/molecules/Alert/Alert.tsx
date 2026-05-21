import * as React from 'react';

import { Card } from '@/atoms/Card';
import { Typography } from '@/atoms/Typography';
import { cn } from '@/particles/cn';

import { alertHeaderVariants, type AlertVariants } from './alert.variants';

/**
 * Alert — canonical molecule that composes Card + Typography (+ optional
 * leading icon slot) into a status surface with `severity` and `size` axes.
 *
 * @remarks All visual customization is controlled exclusively through
 * `severity` and `size`. There is no `className` escape hatch and no
 * `className` is forwarded to the composed Card or Typography atoms — variant
 * propagation lives in the `cardPaddingForSize` and `titleVariantForSize`
 * lookup tables below.
 *
 * The `header` slot prop overrides the default `leading` + `title` +
 * `description` layout when fully custom header markup is needed (e.g. with
 * action buttons inline). The `actions` slot renders inside the underlying
 * Card's footer section.
 *
 * @example
 * ```tsx
 * <Alert severity="success" title="Saved" description="Your changes are live." />
 *
 * <Alert
 *   severity="warning"
 *   leading={<TriangleAlert aria-hidden />}
 *   title="Heads up"
 *   actions={<Button size="sm">Acknowledge</Button>}
 * >
 *   Optional body content beneath the header.
 * </Alert>
 * ```
 */
export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'className'>,
  AlertVariants {
  /** Leading icon or visual rendered in the default header layout. */
  leading?: React.ReactNode;
  /** Title rendered inside the default header layout via Typography. */
  title?: React.ReactNode;
  /** Supporting description rendered beneath the title via Typography. */
  description?: React.ReactNode;
  /**
   * Custom header content. When set, replaces the default
   * `leading` / `title` / `description` layout entirely.
   */
  header?: React.ReactNode;
  /** Action row rendered inside the underlying Card's footer section. */
  actions?: React.ReactNode;
}

const cardPaddingForSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
const titleVariantForSize = { sm: 'h5', md: 'h4', lg: 'h3' } as const;

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      severity,
      size,
      leading,
      title,
      description,
      header,
      actions,
      children,
      ...rest
    },
    ref,
  ) => {
    const resolvedSeverity = severity ?? 'info';
    const resolvedSize = size ?? 'md';
    const hasDefaultHeader = title !== undefined
      || description !== undefined
      || leading !== undefined;

    const resolvedHeader = header ?? (hasDefaultHeader
      ? (
        <div className={cn(alertHeaderVariants({ severity: resolvedSeverity }))}>
          {leading !== undefined
            ? <span data-slot="alert-leading" aria-hidden>{leading}</span>
            : null}
          <div data-slot="alert-titles">
            {title !== undefined
              ? (
                <Typography as="div" variant={titleVariantForSize[resolvedSize]}>
                  {title}
                </Typography>
              )
              : null}
            {description !== undefined
              ? <Typography variant="caption">{description}</Typography>
              : null}
          </div>
        </div>
      )
      : undefined);

    return (
      <Card
        ref={ref}
        variant="default"
        padding={cardPaddingForSize[resolvedSize]}
        role="alert"
        data-slot="alert-root"
        data-severity={resolvedSeverity}
        data-size={resolvedSize}
        header={resolvedHeader}
        footer={actions}
        {...rest}
      >
        {children}
      </Card>
    );
  },
);
Alert.displayName = 'Alert';
