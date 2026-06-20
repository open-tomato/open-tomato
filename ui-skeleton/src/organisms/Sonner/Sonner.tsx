import * as React from 'react';
import { Toaster } from 'sonner';

import { type SonnerVariants } from './sonner.variants';

type ToasterProps = React.ComponentPropsWithoutRef<typeof Toaster>;

/**
 * Sonner — global toast host that wraps `sonner`'s `<Toaster />` once at the
 * app root and exposes a re-exported `toast` helper so consumers fire toasts
 * through the package barrel rather than importing `sonner` directly.
 *
 * @remarks
 * Unlike every other portal-based organism in this layer (Dialog,
 * AlertDialog, Drawer, DropdownMenu, Menubar, Command), Sonner has NO
 * `trigger` slot — there is nothing to open. The organism mounts once at the
 * app root (typically inside the providers tree) and listens to the
 * imperative `toast(...)` calls that fire from anywhere in the React tree.
 *
 * All visual customization flows through `position`, `richColors`, `expand`,
 * and `closeButton`. There is no `className` escape hatch. Each axis is a
 * direct passthrough to the matching Toaster prop — no lookup table needed
 * because the organism's vocabulary already matches the library's.
 *
 * **Position values.** sonner ships six positions
 * (`top-{left,center,right}` + `bottom-{left,center,right}`); the organism
 * exposes the same six values. The library does not support a middle-row
 * anchor and the organism intentionally does not invent one — adding
 * `middle-*` here would type-check at the boundary but break at runtime
 * inside the Toaster.
 *
 * **Toast-firing pattern.** Mount `<Sonner />` once at the app root, then
 * call `toast(...)` from anywhere:
 *
 * @example
 * ```tsx
 * // At the app root, alongside other providers:
 * <Sonner position="top-right" richColors closeButton />
 *
 * // Anywhere in the tree:
 * import { toast } from '@open-tomato/ui-skeleton';
 *
 * toast('Saved.');
 * toast.success('Profile updated.');
 * toast.error('Could not connect.');
 * toast.promise(saveDraft(), {
 *   loading: 'Saving…',
 *   success: 'Saved.',
 *   error: 'Save failed.',
 * });
 * ```
 *
 * Tests MUST scan `document.body` with axe rather than `container` —
 * sonner's `<section data-sonner-toaster>` and any fired toasts can leak
 * outside the bound render container, and a container-scoped scan misses
 * the toast DOM.
 */
export interface SonnerProps
  extends Omit<
    ToasterProps,
    'className' | 'position' | 'richColors' | 'expand' | 'closeButton'
  >,
  SonnerVariants {}

type ResolvedPosition = NonNullable<SonnerVariants['position']>;

export const Sonner = React.forwardRef<HTMLElement, SonnerProps>(
  ({ position, richColors, expand, closeButton, ...rest }, ref) => {
    const resolvedPosition: ResolvedPosition = position ?? 'bottom-right';
    const resolvedRichColors = richColors ?? false;
    const resolvedExpand = expand ?? false;
    const resolvedCloseButton = closeButton ?? false;

    return (
      <Toaster
        ref={ref}
        position={resolvedPosition}
        richColors={resolvedRichColors}
        expand={resolvedExpand}
        closeButton={resolvedCloseButton}
        {...rest}
      />
    );
  },
);
Sonner.displayName = 'Sonner';
