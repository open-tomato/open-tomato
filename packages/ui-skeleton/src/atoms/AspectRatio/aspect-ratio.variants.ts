import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Mapping from semantic aspect-ratio names to the numeric ratio accepted by
 * the underlying Radix AspectRatio primitive (`ratio = width / height`).
 *
 * - `square`   → 1:1
 * - `video`    → 16:9
 * - `portrait` → 3:4
 */
export const aspectRatioMap = {
  square: 1,
  video: 16 / 9,
  portrait: 3 / 4,
} as const;

export type AspectRatioName = keyof typeof aspectRatioMap;

export const aspectRatioVariants = cva('block w-full overflow-hidden', {
  variants: {
    ratio: {
      square: 'aspect-[1/1]',
      video: 'aspect-[16/9]',
      portrait: 'aspect-[3/4]',
    },
  },
  defaultVariants: { ratio: 'video' },
});

export type AspectRatioVariants = VariantProps<typeof aspectRatioVariants>;
