/* global globalThis */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { toHaveNoViolations } from 'jest-axe';
import { expect, vi } from 'vitest';

/**
 * Register jest-dom matchers (toBeInTheDocument, toHaveAttribute, …) on the
 * locally-imported `expect` — the same instance these tests run against.
 *
 * We deliberately avoid the `@testing-library/jest-dom/vitest` side-effect
 * entry: it calls `expect.extend` on the `vitest` it resolves through its own
 * `require('vitest')`, which in this monorepo hoists to a different vitest
 * instance (3.x) than the one running ui-skeleton's tests (4.x). The matchers
 * then land on the wrong `expect` and never register, surfacing as
 * "Invalid Chai property: toBeInTheDocument". Extending the local `expect`
 * with the standalone matchers sidesteps that resolution entirely.
 */
expect.extend(jestDomMatchers);
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

/**
 * jsdom does not implement `window.matchMedia`. vaul calls it on mount to
 * detect reduced-motion / pointer-coarse preferences and throws
 * `matchMedia is not a function` inside the commit-phase effect when the
 * Drawer's Content first opens. Stub it as a media-query-shaped object so
 * the vaul mount path completes in the test environment.
 */
if (typeof globalThis.window !== 'undefined'
  && typeof globalThis.window.matchMedia !== 'function') {
  globalThis.window.matchMedia = vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof globalThis.window.matchMedia;
}
