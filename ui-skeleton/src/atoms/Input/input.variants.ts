import { cva } from 'class-variance-authority';

import { cn } from '@/particles/cn';
import {
  wrapperFrameVariants,
  type WrapperFrameVariants,
} from '@/particles/wrapper-frame.variants';

/**
 * Input frame variants. Consumes the shared `wrapperFrameVariants` particle so
 * Input stays visually aligned with Textarea / NativeSelect / Select, and
 * layers on the Input-specific `<input>`-disabled handling.
 *
 * Axes are inherited from `wrapperFrameVariants`:
 * - `variant`  — validation intent (default | error | success).
 * - `size`     — overall scale (sm | md | lg).
 * - `density`  — vertical compression (comfortable | compact).
 * - `tone`     — surface treatment (neutral | subtle | inverted).
 */
export type InputVariants = WrapperFrameVariants;

const inputDisabledClasses
  = 'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50';

export const inputVariants = (props?: InputVariants): string => cn(
  wrapperFrameVariants(props),
  inputDisabledClasses,
);

export const inputControlVariants = cva(
  'min-w-0 flex-1 bg-transparent text-foreground outline-none '
  + 'placeholder:text-muted-foreground disabled:cursor-not-allowed '
  + 'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
);

export const inputIconVariants = cva(
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
