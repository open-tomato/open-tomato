import { Slot, Slottable } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '@/particles/cn';

import { buttonVariants, type ButtonVariants } from './button.variants';

/**
 * Button — single encapsulated wrapper over a native `<button>` (or any
 * element via `asChild`) driven by design-system `variant` and `size`.
 *
 * @remarks All visual customization MUST go through `variant` and `size`.
 * `className` is an escape hatch only and is discouraged in this design system.
 *
 * When `asChild` is `true`, props (className, variants, `data-*`) are merged
 * onto the single child element via Radix `Slot`. `Slottable` is used
 * internally so `leadingIcon` / `trailingIcon` continue to render around the
 * merged child without violating `Slot`'s single-child requirement.
 *
 * `loading` reflects on the rendered element as `data-loading=""` and also
 * disables interaction by forwarding `disabled` to the underlying element.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Save</Button>
 * <Button asChild><a href="/">Home</a></Button>
 * <Button loading leadingIcon={<Spinner />}>Saving…</Button>
 * ```
 */
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
  ButtonVariants {
  /** Render as child element (Radix Slot) for composition with `<a>`, Next `<Link>`, etc. Requires a single child. */
  asChild?: boolean;
  /** Optional leading icon node, rendered before children. */
  leadingIcon?: React.ReactNode;
  /** Optional trailing icon node, rendered after children. */
  trailingIcon?: React.ReactNode;
  /** Shows loading state and disables interaction. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild,
      leadingIcon,
      trailingIcon,
      loading,
      disabled,
      children,
      type,
      ...rest
    },
    ref,
  ) => {
    const Comp = asChild
      ? Slot
      : 'button';
    const resolvedVariant = variant ?? 'primary';
    const resolvedSize = size ?? 'md';
    const isDisabled = disabled || loading;

    return (
      <Comp
        ref={ref}
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        data-loading={loading
          ? ''
          : undefined}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        type={asChild
          ? undefined
          : (type ?? 'button')}
        className={cn(buttonVariants({ variant: resolvedVariant, size: resolvedSize }), className)}
        {...rest}
      >
        {leadingIcon}
        <Slottable>{children}</Slottable>
        {trailingIcon}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
