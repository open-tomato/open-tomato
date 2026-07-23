import type { HarvestedFields } from './harvest';
import type { OAuthProvider } from './types';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';

import { useRef } from 'react';

import { harvestFields } from './harvest';

/**
 * FlowScreen — the integration seam between the app's flow state machines and
 * the published (presentational-only) auth page templates.
 *
 * LIBRARY-GAP WORKAROUND: the `@open-tomato/ui-components` auth templates
 * expose no submit / OAuth callbacks and their `Button` renders `type="button"`
 * (so a wrapping <form> won't submit). FlowScreen therefore delegates clicks in
 * the capture phase:
 *   • a click on the primary CTA (the single `bg-primary` button) →
 *     `onPrimary`, with the current field values harvested from the DOM.
 *   • a click on an OAuth provider row → `onOAuth(provider)`.
 * Every other control (password toggle, copy, etc.) is left untouched.
 *
 * When the library adds controlled inputs / an `onSubmit` prop, delete this and
 * wire the props directly.
 */

export interface FlowScreenProps {
  children: ReactNode;
  /** Fires on the primary CTA. `container` is the screen root, for screens
   *  (e.g. sign-up) that need a field the generic harvest doesn't expose. */
  onPrimary?: (fields: HarvestedFields, container: HTMLElement) => void;
  onOAuth?: (provider: OAuthProvider) => void;
  className?: string;
}

const providerFromText = (text: string): OAuthProvider | null => {
  if (/github/i.test(text)) return 'github';
  if (/google/i.test(text)) return 'google';
  return null;
};

export const FlowScreen = ({
  children, onPrimary, onOAuth, className,
}: FlowScreenProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest('button');
    const container = ref.current;
    if (button == null || container == null || !container.contains(button)) return;

    // Primary CTA — the one filled `bg-primary` action per screen.
    if (button.classList.contains('bg-primary')) {
      onPrimary?.(harvestFields(container), container);
      return;
    }

    // OAuth provider row.
    const provider = providerFromText(button.textContent ?? '');
    if (provider != null && onOAuth != null) {
      onOAuth(provider);
    }
    // Anything else (toggles, copy, icon buttons) falls through untouched.
  };

  return (
    <div ref={ref} className={className} onClickCapture={handleClickCapture}>
      {children}
    </div>
  );
};
