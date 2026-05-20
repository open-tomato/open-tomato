import { AspectRatio as RadixAspectRatio } from '@radix-ui/react-aspect-ratio';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  aspectRatioMap,
  aspectRatioVariants,
  type AspectRatioVariants,
} from './aspect-ratio.variants';

type RadixAspectRatioProps = React.ComponentPropsWithoutRef<typeof RadixAspectRatio>;

/**
 * AspectRatio — single encapsulated wrapper over Radix AspectRatio.
 *
 * @remarks All visual customization MUST go through the `ratio` variant.
 * `className` is an escape hatch only and is discouraged in this design system.
 *
 * @example
 * ```tsx
 * <AspectRatio ratio="video">
 *   <img src="/cover.jpg" alt="Cover" />
 * </AspectRatio>
 * ```
 */
export interface AspectRatioProps
  extends Omit<RadixAspectRatioProps, 'ratio'>,
  AspectRatioVariants {}

export const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ className, ratio, ...rest }, ref) => {
    const resolved = ratio ?? 'video';
    return (
      <RadixAspectRatio
        ref={ref}
        ratio={aspectRatioMap[resolved]}
        data-ratio={resolved}
        className={cn(aspectRatioVariants({ ratio: resolved }), className)}
        {...rest}
      />
    );
  },
);
AspectRatio.displayName = 'AspectRatio';
