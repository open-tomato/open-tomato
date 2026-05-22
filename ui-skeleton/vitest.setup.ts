/* global globalThis */
import '@testing-library/jest-dom/vitest';
import { toHaveNoViolations } from 'jest-axe';
import { expect, vi } from 'vitest';

expect.extend(toHaveNoViolations);

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserverPolyfill {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}

/**
 * jsdom does not implement Element.prototype.scrollIntoView. Radix Select
 * (and other listbox primitives) call it on the focused item when the
 * listbox opens, throwing `scrollIntoView is not a function` inside the
 * commit-phase effect and unmounting the test render. Stub it as a no-op
 * so the Radix open path completes in the test environment.
 */
if (typeof globalThis.Element !== 'undefined'
  && typeof globalThis.Element.prototype.scrollIntoView !== 'function') {
  globalThis.Element.prototype.scrollIntoView = vi.fn();
}

/**
 * jsdom does not implement PointerEvent capture APIs. Radix Select's trigger
 * calls `hasPointerCapture` / `setPointerCapture` / `releasePointerCapture`
 * during pointer-driven open and these throw "not a function" without
 * polyfills.
 */
if (typeof globalThis.Element !== 'undefined') {
  if (typeof globalThis.Element.prototype.hasPointerCapture !== 'function') {
    globalThis.Element.prototype.hasPointerCapture = vi.fn(() => false);
  }
  if (typeof globalThis.Element.prototype.setPointerCapture !== 'function') {
    globalThis.Element.prototype.setPointerCapture = vi.fn();
  }
  if (typeof globalThis.Element.prototype.releasePointerCapture !== 'function') {
    globalThis.Element.prototype.releasePointerCapture = vi.fn();
  }
}
