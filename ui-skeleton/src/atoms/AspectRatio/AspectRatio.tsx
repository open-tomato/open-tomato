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
 * @remarks All visual customization is controlled exclusively through the
 * `ratio` variant. There is no `className` escape hatch — if a knob is missing,
 * add a variant axis instead.
 *
 * @example
 * ```tsx
 * <AspectRatio ratio="video">
 *   <img src="/cover.jpg" alt="Cover" />
 * </AspectRatio>
 * ```
 */
export interface AspectRatioProps
  extends Omit<RadixAspectRatioProps, 'ratio' | 'className'>,
  AspectRatioVariants {}

export const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ ratio, ...rest }, ref) => {
    const resolved = ratio ?? 'video';
    return (
      <RadixAspectRatio
        ref={ref}
        ratio={aspectRatioMap[resolved]}
        data-ratio={resolved}
        className={cn(aspectRatioVariants({ ratio: resolved }))}
        {...rest}
      />
    );
  },
);
AspectRatio.displayName = 'AspectRatio';
