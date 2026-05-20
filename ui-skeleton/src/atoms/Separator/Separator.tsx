import { Root as RadixSeparator } from '@radix-ui/react-separator';
import * as React from 'react';

import { cn } from '@/particles/cn';

import { separatorVariants, type SeparatorVariants } from './separator.variants';

type RadixSeparatorProps = React.ComponentPropsWithoutRef<typeof RadixSeparator>;

/**
 * Separator — single encapsulated wrapper over Radix Separator with
 * an `orientation` axis (horizontal | vertical) and a `variant` axis
 * controlling visual weight (`default | subtle | strong`).
 *
 * @remarks All visual customization MUST go through `orientation` and
 * `variant`. `className` is an escape hatch only and is discouraged in
 * this design system. The wrapper defaults `decorative={true}` to match
 * shadcn; pass `decorative={false}` for a semantically meaningful divider
 * (renders `role="separator"` with `aria-orientation`).
 *
 * @example
 * ```tsx
 * <Separator />
 * <Separator orientation="vertical" />
 * <Separator variant="strong" />
 * <Separator decorative={false} />
 * ```
 */
export interface SeparatorProps
  extends Omit<RadixSeparatorProps, 'orientation'>,
  SeparatorVariants {}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {
      className,
      orientation,
      variant,
      decorative = true,
      ...rest
    },
    ref,
  ) => {
    const resolvedOrientation = orientation ?? 'horizontal';
    const resolvedVariant = variant ?? 'default';
    return (
      <RadixSeparator
        ref={ref}
        orientation={resolvedOrientation}
        decorative={decorative}
        data-slot="separator"
        data-variant={resolvedVariant}
        className={cn(
          separatorVariants({ orientation: resolvedOrientation, variant: resolvedVariant }),
          className,
        )}
        {...rest}
      />
    );
  },
);
Separator.displayName = 'Separator';
