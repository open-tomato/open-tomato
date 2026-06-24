import { cva } from 'class-variance-authority';

import { cn } from '@/particles/cn';
import {
  wrapperFrameVariants,
  type WrapperFrameVariants,
} from '@/particles/wrapper-frame.variants';

/**
 * NativeSelect frame variants. Consumes the shared `wrapperFrameVariants`
 * particle so NativeSelect stays visually aligned with Input, Textarea, and
 * the portal-based Select molecule, then layers on `<select>`-specific
 * disabled styling. The inner `<select>` runs with `appearance-none` so the
 * OS-default chevron is hidden and the decorative chevron rendered as a
 * sibling provides the dropdown affordance.
 *
 * Axes are inherited from `wrapperFrameVariants`:
 * - `variant`  — validation intent (default | error | success).
 * - `size`     — overall scale (sm | md | lg).
 * - `density`  — vertical compression (comfortable | compact).
 * - `tone`     — surface treatment (neutral | subtle | inverted).
 */
export type NativeSelectVariants = WrapperFrameVariants;

const nativeSelectExtras
  = 'has-[select:disabled]:cursor-not-allowed has-[select:disabled]:opacity-50';

export const nativeSelectVariants = (props?: NativeSelectVariants): string => cn(
  wrapperFrameVariants(props),
  nativeSelectExtras,
);

/**
 * Inner `<select>` control. `appearance-none` strips the OS-default chevron
 * so the wrapper-frame can host its own decorative chevron. The background
 * is transparent so the frame's `tone` shows through, and trailing room is
 * reserved by the chevron sibling rather than padding on the control.
 */
export const nativeSelectControlVariants = cva(
  'min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-foreground outline-none '
  + 'disabled:cursor-not-allowed',
);

/**
 * Leading icon container. Mirrors `inputIconVariants` so a NativeSelect and
 * an Input with the same `leadingIcon` render at identical scale.
 */
export const nativeSelectIconVariants = cva(
  'inline-flex shrink-0 items-center justify-center text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'size-3.5 [&_svg]:size-3.5',
        md: 'size-4 [&_svg]:size-4',
        lg: 'size-5 [&_svg]:size-5',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Decorative chevron at the trailing edge of the frame. `pointer-events-none`
 * keeps stray clicks from being absorbed by the chevron span — the native
 * `<select>` underneath stays the only interactive surface.
 */
export const nativeSelectChevronVariants = cva(
  'pointer-events-none shrink-0 opacity-50 [&>svg]:size-4',
);
