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
