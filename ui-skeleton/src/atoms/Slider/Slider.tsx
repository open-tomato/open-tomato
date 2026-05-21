import {
  Range as RadixSliderRange,
  Root as RadixSlider,
  Thumb as RadixSliderThumb,
  Track as RadixSliderTrack,
} from '@radix-ui/react-slider';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  sliderRangeVariants,
  sliderThumbVariants,
  sliderTrackVariants,
  sliderVariants,
  type SliderVariants,
} from './slider.variants';

type RadixSliderProps = React.ComponentPropsWithoutRef<typeof RadixSlider>;

/**
 * Slider — single encapsulated wrapper over Radix Slider
 * (root + track + range + thumb) with a `size` axis that scales the
 * track thickness and thumb diameter together.
 *
 * @remarks All visual customization MUST go through the `size` variant.
 *
 * Supports any number of thumbs by passing an array `value` or `defaultValue`.
 * When neither is provided, the wrapper falls back to `[min, max]` (two thumbs
 * sitting at the extremes) so the range fill is visible by default. Pass
 * `defaultValue={[n]}` for a single-thumb slider.
 *
 * `aria-label` / `aria-labelledby` passed to the wrapper are forwarded to each
 * thumb (Radix puts `role="slider"` on the thumb, not the root). For range
 * sliders with semantically distinct thumbs, pass `thumbAriaLabels={['Min',
 * 'Max']}` to override the per-thumb label.
 *
 * @example
 * ```tsx
 * <Slider defaultValue={[50]} aria-label="Volume" />
 * <Slider defaultValue={[20, 80]} size="lg" thumbAriaLabels={['Min', 'Max']} />
 * <Slider orientation="vertical" defaultValue={[40]} aria-label="Bass" />
 * ```
 */
export interface SliderProps extends Omit<RadixSliderProps, 'className'>, SliderVariants {
  /**
   * Per-thumb accessible labels. When provided, each entry overrides the
   * default thumb label (which mirrors the wrapper's `aria-label`). Useful
   * for range sliders where each thumb has a distinct purpose
   * (e.g. `['Min', 'Max']`).
   */
  thumbAriaLabels?: string[];
}

export const Slider = React.forwardRef<HTMLSpanElement, SliderProps>(
  (
    {
      size,
      value,
      defaultValue,
      min,
      max,
      thumbAriaLabels,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      ...rest
    },
    ref,
  ) => {
    const resolvedSize = size ?? 'md';
    const resolvedMin = min ?? 0;
    const resolvedMax = max ?? 100;

    const thumbValues = React.useMemo(() => {
      if (Array.isArray(value)) {
        return value;
      }
      if (Array.isArray(defaultValue)) {
        return defaultValue;
      }
      return [resolvedMin, resolvedMax];
    }, [value, defaultValue, resolvedMin, resolvedMax]);

    return (
      <RadixSlider
        ref={ref}
        data-slot="slider"
        data-size={resolvedSize}
        value={value}
        defaultValue={defaultValue}
        min={resolvedMin}
        max={resolvedMax}
        className={cn(sliderVariants({ size: resolvedSize }))}
        {...rest}
      >
        <RadixSliderTrack
          data-slot="slider-track"
          className={cn(sliderTrackVariants({ size: resolvedSize }))}
        >
          <RadixSliderRange
            data-slot="slider-range"
            className={cn(sliderRangeVariants())}
          />
        </RadixSliderTrack>
        {thumbValues.map((_, index) => (
          <RadixSliderThumb
            key={index}
            data-slot="slider-thumb"
            aria-label={thumbAriaLabels?.[index] ?? ariaLabel}
            aria-labelledby={thumbAriaLabels?.[index] === undefined
              ? ariaLabelledBy
              : undefined}
            className={cn(sliderThumbVariants({ size: resolvedSize }))}
          />
        ))}
      </RadixSlider>
    );
  },
);
Slider.displayName = 'Slider';
