import { Root as RadixToggle } from '@radix-ui/react-toggle';
import * as React from 'react';

import { cn } from '@/particles/cn';

import { toggleVariants, type ToggleVariants } from './toggle.variants';

type RadixToggleProps = React.ComponentPropsWithoutRef<typeof RadixToggle>;

/**
 * Toggle — single encapsulated wrapper over Radix Toggle, a two-state button
 * with on / off semantics. Variants are split across two axes: `variant`
 * controls the visual frame (`default | outline`) and `size` controls the
 * geometry (`sm | md | lg`).
 *
 * @remarks All visual customization MUST go through `variant` and `size`.
 * `className` is an escape hatch only and is discouraged in this design system.
 *
 * Pressed state is reflected on the rendered button as `data-state="on"` or
 * `data-state="off"` (set by Radix) plus `data-slot="toggle"`,
 * `data-variant="<name>"`, and `data-size="<name>"` (set by this wrapper) for
 * test and style hooks. The accessibility tree gets `aria-pressed` via Radix.
 *
 * @example
 * ```tsx
 * <Toggle aria-label="Toggle bold">B</Toggle>
 * <Toggle variant="outline" size="lg" defaultPressed aria-label="Toggle italic">I</Toggle>
 * ```
 */
export interface ToggleProps extends RadixToggleProps, ToggleVariants {}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      className,
      variant,
      size,
      ...rest
    },
    ref,
  ) => {
    const resolvedVariant = variant ?? 'default';
    const resolvedSize = size ?? 'md';
    return (
      <RadixToggle
        ref={ref}
        data-slot="toggle"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={cn(
          toggleVariants({ variant: resolvedVariant, size: resolvedSize }),
          className,
        )}
        {...rest}
      />
    );
  },
);
Toggle.displayName = 'Toggle';
