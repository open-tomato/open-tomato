import * as React from 'react';

import { cn } from '@/particles/cn';

import { kbdVariants, type KbdVariants } from './kbd.variants';

/**
 * Kbd — pure CVA wrapper rendered as a `<kbd>` element for displaying
 * keyboard shortcuts and key bindings inline with text.
 *
 * @remarks All visual customization MUST go through `variant` and `size`.
 * `className` is an escape hatch only and is discouraged in this design system.
 * Kbd has no underlying Radix primitive — the rendered element is a native
 * `<kbd>` so screen readers announce it with the correct semantics. Compose
 * multiple Kbd instances (separated by literal `+` text) to render chord
 * shortcuts like `Cmd + K`.
 *
 * @example
 * ```tsx
 * <Kbd>Esc</Kbd>
 * <Kbd variant="solid" size="sm">⌘</Kbd>
 * <span><Kbd>Ctrl</Kbd> + <Kbd>K</Kbd></span>
 * ```
 */
export interface KbdProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
  KbdVariants {}

export const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, variant, size, ...rest }, ref) => {
    const resolvedVariant = variant ?? 'outline';
    const resolvedSize = size ?? 'md';

    return (
      <kbd
        ref={ref}
        data-slot="kbd"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={cn(kbdVariants({ variant: resolvedVariant, size: resolvedSize }), className)}
        {...rest}
      />
    );
  },
);
Kbd.displayName = 'Kbd';
