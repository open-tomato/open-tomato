import { cva } from 'class-variance-authority';

import { cn } from '@/particles/cn';
import {
  wrapperFrameVariants,
  type WrapperFrameVariants,
} from '@/particles/wrapper-frame.variants';

/**
 * Trigger frame variants. Consumes the shared `wrapperFrameVariants` particle
 * so the Select trigger stays visually aligned with Input / Textarea /
 * NativeSelect, then layers on Select-specific disabled styling and the
 * value-truncation rule that lets the rendered `RadixSelect.Value` line-clamp
 * inside the frame.
 *
 * Axes are inherited from `wrapperFrameVariants`:
 * - `variant`  — validation intent (default | error | success).
 * - `size`     — overall scale (sm | md | lg).
 * - `density`  — vertical compression (comfortable | compact).
 * - `tone`     — surface treatment (neutral | subtle | inverted).
 */
export type SelectTriggerVariants = WrapperFrameVariants;

const selectTriggerExtras
  = 'justify-between data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 '
  + '[&>span[data-slot=select-value]]:line-clamp-1 '
  + '[&>span[data-slot=select-value]]:text-left '
  + '[&>span[data-slot=select-value]]:flex-1';

export const selectTriggerVariants = (props?: SelectTriggerVariants): string => cn(
  wrapperFrameVariants(props),
  selectTriggerExtras,
);

/**
 * Portaled Content surface. Anchors the listbox to the trigger via the Radix
 * CSS variable `--radix-select-trigger-width`, caps height at the available
 * viewport space, and inlines the open/close animations. Surface styling
 * (border + background + shadow) is intentionally baked into the base because
 * Select — unlike Popover — never composes the Card atom: items are
 * rendered directly inside the Radix viewport.
 */
export const selectContentVariants = cva(
  'relative z-50 min-w-[var(--radix-select-trigger-width)] '
  + 'max-h-[var(--radix-select-content-available-height)] overflow-hidden '
  + 'rounded-md border border-border bg-background text-foreground shadow-elev-2 '
  + 'outline-none focus-visible:outline-none '
  + 'animate-in fade-in-0 zoom-in-95 '
  + 'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 '
  + 'data-[state=closed]:zoom-out-95',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export const selectViewportVariants = cva('p-1');

/**
 * Per-item row. Drives interactive padding, highlight state, disabled
 * treatment, and reserves trailing space for the check indicator.
 */
export const selectItemVariants = cva(
  'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm outline-none '
  + 'transition-colors '
  + 'focus:bg-accent focus:text-accent-foreground '
  + 'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground '
  + 'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      size: {
        sm: 'py-1 pl-2 pr-7 text-xs',
        md: 'py-1.5 pl-2.5 pr-8 text-sm',
        lg: 'py-2 pl-3 pr-9 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export const selectItemIndicatorVariants = cva(
  'absolute right-2 inline-flex items-center justify-center [&>svg]:size-4',
);

export const selectSeparatorVariants = cva('-mx-1 my-1 h-px bg-border');

export const selectChevronVariants = cva(
  'pointer-events-none shrink-0 opacity-50 [&>svg]:size-4',
);
