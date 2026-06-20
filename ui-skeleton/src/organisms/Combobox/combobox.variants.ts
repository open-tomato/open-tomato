import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/particles/cn';
import {
  wrapperFrameVariants,
  type WrapperFrameVariants,
} from '@/particles/wrapper-frame.variants';

/**
 * Root cva carrying the public `size` axis as the props-type surface. Emits
 * no classes — the Combobox does not render its own root frame: the trigger
 * button owns the visible surface and the listbox renders inside the
 * composed Popover's portaled content.
 */
export const comboboxVariants = cva('', {
  variants: {
    size: { sm: '', md: '', lg: '' },
  },
  defaultVariants: { size: 'md' },
});

export type ComboboxVariants = VariantProps<typeof comboboxVariants>;

const comboboxTriggerExtras
  = 'justify-between cursor-pointer '
  + 'disabled:cursor-not-allowed disabled:opacity-50 '
  + '[&>[data-slot=combobox-trigger-value]]:flex-1 '
  + '[&>[data-slot=combobox-trigger-value]]:text-left '
  + '[&>[data-slot=combobox-trigger-value]]:truncate '
  + 'data-[placeholder=true]:text-muted-foreground';

/**
 * Trigger button frame. Consumes `wrapperFrameVariants` so the visible
 * surface stays aligned with Input / Select / NativeSelect, then layers on
 * combobox-specific layout (justify-between for the value + trailing chevron,
 * truncated value span, placeholder tinting via `data-placeholder`).
 */
export const comboboxTriggerVariants = (props?: WrapperFrameVariants): string => cn(
  wrapperFrameVariants(props),
  comboboxTriggerExtras,
);

/**
 * Wrapper row hosting the search Input inside the portaled popover content.
 * Owns only the bottom rhythm between the search row and the list — the
 * Input atom supplies its own border + focus ring + height.
 */
export const comboboxSearchWrapperVariants = cva('mb-2');

/**
 * Listbox container. Rendered as a native `<ul role="listbox">` so the
 * options participate in standard ARIA semantics. Scrollable vertically so
 * long item sets stay within the popover content's available height.
 */
export const comboboxListVariants = cva(
  'm-0 list-none overflow-y-auto overflow-x-hidden p-1',
  {
    variants: {
      size: {
        sm: 'max-h-[200px]',
        md: 'max-h-[240px]',
        lg: 'max-h-[280px]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Selectable option row. Rendered as `<li role="option">`. State plumbing
 * uses `data-focused` (drives keyboard / hover highlight), `data-disabled`,
 * and `aria-selected` so styling stays declarative and tests can assert on
 * the same attributes Radix-style organisms use.
 */
export const comboboxOptionVariants = cva(
  'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm '
  + 'text-foreground outline-none transition-colors '
  + 'hover:bg-accent hover:text-accent-foreground '
  + 'data-[focused=true]:bg-accent data-[focused=true]:text-accent-foreground '
  + 'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 '
  + 'aria-selected:font-medium',
  {
    variants: {
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2 py-1.5 text-sm',
        lg: 'px-3 py-2 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Empty-state message rendered when no items match the active search query.
 * Visually subdued; sized to match the option row rhythm so the empty state
 * sits at the same vertical scale as a populated list.
 */
export const comboboxEmptyVariants = cva(
  'select-none text-center text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'py-4 text-xs',
        md: 'py-6 text-sm',
        lg: 'py-8 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Decorative icon slot inside the trigger (chevron) and option rows (check
 * indicator). Mirrors the dropdown / menu organisms' icon sizing so muscle
 * memory carries across select-shaped surfaces.
 */
export const comboboxIconVariants = cva('inline-flex shrink-0 items-center justify-center', {
  variants: {
    size: {
      sm: 'size-3.5 [&_svg]:size-3.5',
      md: 'size-4 [&_svg]:size-4',
      lg: 'size-5 [&_svg]:size-5',
    },
  },
  defaultVariants: { size: 'md' },
});
