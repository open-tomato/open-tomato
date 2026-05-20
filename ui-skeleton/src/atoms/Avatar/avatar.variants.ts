import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Mapping from semantic avatar size names to the rendered pixel dimensions of
 * the underlying `<span>` root. Mirrors the `size` cva entry below so consumers
 * (and tests) can look up the resolved dimension without parsing a class string.
 */
export const avatarSizeMap = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
} as const;

export type AvatarSize = keyof typeof avatarSizeMap;

export const avatarVariants = cva(
  'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-muted text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'size-8 text-xs',
        md: 'size-10 text-sm',
        lg: 'size-12 text-base',
        xl: 'size-16 text-lg',
      },
      shape: {
        circle: 'rounded-full',
        square: 'rounded-md',
      },
    },
    defaultVariants: { size: 'md', shape: 'circle' },
  },
);

export type AvatarVariants = VariantProps<typeof avatarVariants>;

export const avatarImageVariants = cva('aspect-square size-full object-cover');

export const avatarFallbackVariants = cva(
  'flex size-full items-center justify-center font-medium uppercase leading-none',
);
