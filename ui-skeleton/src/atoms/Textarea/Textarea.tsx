import * as React from 'react';

import { cn } from '@/particles/cn';

import { textareaVariants, type TextareaVariants } from './textarea.variants';

/**
 * Textarea — single encapsulated wrapper over a native `<textarea>` with
 * constrained `variant` and `size` axes and an optional `autoResize` mode.
 *
 * @remarks All visual customization MUST go through `variant` and `size`.
 * `className` is an escape hatch only and is discouraged in this design system.
 *
 * When `variant="error"`, the textarea automatically receives
 * `aria-invalid="true"` unless the caller passes `aria-invalid` explicitly.
 *
 * When `autoResize` is `true`, the textarea grows vertically to fit its content
 * (manual user-drag resize and the inner scrollbar are disabled). When the
 * component is controlled, the height re-adjusts whenever `value` changes.
 *
 * @example
 * ```tsx
 * <Textarea placeholder="Write a comment…" />
 * <Textarea variant="error" defaultValue="too short" />
 * <Textarea size="lg" autoResize defaultValue="Grows as you type…" />
 * ```
 */
export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
  TextareaVariants {
  /** When true, the textarea grows vertically to fit its content; user resize and inner scrolling are disabled. */
  autoResize?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      size,
      autoResize,
      onChange,
      value,
      defaultValue,
      'aria-invalid': ariaInvalid,
      ...rest
    },
    forwardedRef,
  ) => {
    const resolvedVariant = variant ?? 'default';
    const resolvedSize = size ?? 'md';
    const resolvedAriaInvalid = ariaInvalid ?? (resolvedVariant === 'error'
      ? true
      : undefined);

    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = React.useCallback((node: HTMLTextAreaElement | null) => {
      internalRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    }, [forwardedRef]);

    const adjustHeight = React.useCallback(() => {
      const el = internalRef.current;
      if (!el) {
        return;
      }
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    React.useLayoutEffect(() => {
      if (autoResize) {
        adjustHeight();
      }
    }, [autoResize, adjustHeight, value, defaultValue]);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
      if (autoResize) {
        adjustHeight();
      }
      if (onChange) {
        onChange(event);
      }
    };

    return (
      <textarea
        ref={setRefs}
        data-slot="textarea"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        data-auto-resize={autoResize
          ? ''
          : undefined}
        aria-invalid={resolvedAriaInvalid}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        className={cn(
          textareaVariants({ variant: resolvedVariant, size: resolvedSize }),
          className,
        )}
        {...rest}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
