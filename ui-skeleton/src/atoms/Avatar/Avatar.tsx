import {
  Avatar as RadixAvatar,
  AvatarFallback as RadixAvatarFallback,
  AvatarImage as RadixAvatarImage,
} from '@radix-ui/react-avatar';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  avatarFallbackVariants,
  avatarImageVariants,
  avatarVariants,
  type AvatarVariants,
} from './avatar.variants';

type RadixAvatarProps = React.ComponentPropsWithoutRef<typeof RadixAvatar>;
type RadixAvatarImageProps = React.ComponentPropsWithoutRef<typeof RadixAvatarImage>;
type RadixAvatarFallbackProps = React.ComponentPropsWithoutRef<typeof RadixAvatarFallback>;

/**
 * Avatar — single encapsulated wrapper over Radix Avatar (root + image + fallback).
 *
 * @remarks All visual customization MUST go through `size` and `shape` variants.
 * The image is provided via `src`/`alt`; the fallback rendered while the image
 * loads (or on error) is provided via `fallback`. `className` is an escape hatch
 * only and is discouraged in this design system.
 *
 * @example
 * ```tsx
 * <Avatar src="/me.jpg" alt="Marcos" fallback="MT" size="md" shape="circle" />
 * ```
 */
export interface AvatarProps
  extends Omit<RadixAvatarProps, 'children'>,
  AvatarVariants {
  /** Image URL to display. When omitted, only the fallback is rendered. */
  src?: string;
  /** Accessible label for the image. Required when `src` is provided. */
  alt?: string;
  /** Node rendered while the image loads, or if it fails to load. Typically initials. */
  fallback?: React.ReactNode;
  /** Milliseconds to wait before showing `fallback`, to avoid flashing on fast loads. */
  fallbackDelayMs?: RadixAvatarFallbackProps['delayMs'];
  /** Notified when the underlying image transitions between loading states. */
  onLoadingStatusChange?: RadixAvatarImageProps['onLoadingStatusChange'];
  /** Escape-hatch props forwarded to the inner `<img>` (e.g. `referrerPolicy`, `crossOrigin`). */
  imageProps?: Omit<RadixAvatarImageProps, 'src' | 'alt' | 'onLoadingStatusChange'>;
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      className,
      size,
      shape,
      src,
      alt,
      fallback,
      fallbackDelayMs,
      onLoadingStatusChange,
      imageProps,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const resolvedShape = shape ?? 'circle';

    return (
      <RadixAvatar
        ref={ref}
        data-size={resolvedSize}
        data-shape={resolvedShape}
        className={cn(avatarVariants({ size: resolvedSize, shape: resolvedShape }), className)}
        {...rest}
      >
        {src
          ? (
            <RadixAvatarImage
              src={src}
              alt={alt ?? ''}
              onLoadingStatusChange={onLoadingStatusChange}
              className={cn(avatarImageVariants())}
              {...imageProps}
            />
          )
          : null}
        <RadixAvatarFallback delayMs={fallbackDelayMs} className={cn(avatarFallbackVariants())}>
          {fallback}
        </RadixAvatarFallback>
      </RadixAvatar>
    );
  },
);
Avatar.displayName = 'Avatar';
