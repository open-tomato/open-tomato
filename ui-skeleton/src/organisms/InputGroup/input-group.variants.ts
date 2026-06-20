import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/particles/cn';
import { wrapperFrameVariants } from '@/particles/wrapper-frame.variants';

/**
 * Public InputGroup axes. The class composition for the outer wrapper lives
 * in `inputGroupVariants` below — this cva is intentionally empty-classed and
 * exists only to derive `InputGroupVariants` so the props interface stays
 * symmetric with the other organism variants files (Field, Empty, Accordion).
 *
 * `size` and `invalid` are the only knobs surfaced; all other wrapper-frame
 * axes (`density`, `tone`) are organism-internal and intentionally not part
 * of the public API.
 */
export const inputGroupShape = cva('', {
  variants: {
    size: { sm: '', md: '', lg: '' },
    invalid: { true: '', false: '' },
  },
  defaultVariants: { size: 'md', invalid: false },
});

export type InputGroupVariants = VariantProps<typeof inputGroupShape>;

const variantForInvalid = {
  true: 'error',
  false: 'default',
} as const;

const inputGroupDisabledClasses
  = 'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50';

/**
 * Composes the shared `wrapperFrameVariants` particle with InputGroup's
 * disabled-input handling so the bordered surface stays visually aligned with
 * the Input atom (which consumes the same particle). The `invalid` boolean
 * maps to the wrapper-frame `variant` axis (`true` → `'error'`, `false` →
 * `'default'`).
 */
export const inputGroupVariants = (props?: InputGroupVariants): string => {
  const resolvedSize = props?.size ?? 'md';
  const resolvedInvalid = props?.invalid ?? false;
  return cn(
    wrapperFrameVariants({
      variant: variantForInvalid[resolvedInvalid
        ? 'true'
        : 'false'],
      size: resolvedSize,
    }),
    inputGroupDisabledClasses,
  );
};

/**
 * Slot-wrapper styling for the `leading` and `trailing` addon slots. The
 * wrapper aligns slot content to the frame's vertical center, applies a
 * muted text color (Button / Avatar / Badge slot atoms keep their own
 * colors via their variant axes), and tunes inter-glyph gap + text scale
 * to match the parent `size`. Slot atoms render raw inside this wrapper —
 * the organism does not inject styling into consumer-supplied nodes.
 */
export const inputGroupAddonVariants = cva(
  'inline-flex shrink-0 items-center justify-center self-stretch text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'gap-1 text-xs',
        md: 'gap-1.5 text-sm',
        lg: 'gap-2 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
