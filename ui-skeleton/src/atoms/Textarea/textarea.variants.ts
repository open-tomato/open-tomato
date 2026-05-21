import { cn } from '@/particles/cn';
import {
  wrapperFrameVariants,
  type WrapperFrameVariants,
} from '@/particles/wrapper-frame.variants';

/**
 * Textarea frame variants. Consumes the shared `wrapperFrameVariants` particle
 * so Textarea stays visually aligned with Input / NativeSelect / Select, with
 * one substitution: the `density="compact"` branch swaps `h-*` for `min-h-*`
 * so the textarea retains its multi-line affordance while still compressing
 * inside tighter rows. The size axis already uses textarea-friendly heights
 * because the particle's `h-*` only sets a floor that the textarea grows past
 * via its intrinsic rows / `autoResize` behavior.
 *
 * Axes are inherited from `wrapperFrameVariants`:
 * - `variant`  — validation intent (default | error | success).
 * - `size`     — overall scale (sm | md | lg).
 * - `density`  — vertical compression (comfortable | compact).
 * - `tone`     — surface treatment (neutral | subtle | inverted).
 */
export type TextareaVariants = WrapperFrameVariants;

const textareaBaseClasses
  = 'resize-y data-[auto-resize]:resize-none data-[auto-resize]:overflow-hidden';

const textareaCompactClasses = '[&]:min-h-7 py-0';

export const textareaVariants = (props?: TextareaVariants): string => {
  const resolvedDensity = props?.density ?? 'comfortable';
  return cn(
    wrapperFrameVariants({ ...props, density: 'comfortable' }),
    resolvedDensity === 'compact'
      ? textareaCompactClasses
      : '',
    textareaBaseClasses,
  );
};
