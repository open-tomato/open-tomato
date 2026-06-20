import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import {
  clearPendingResponses,
  waitForResponse,
} from '../wait-for-response.js';

/**
 * These tests use a dedicated map so they are isolated from the module-level
 * default.  The module-level helpers (`setPendingResponse` /
 * `clearPendingResponses`) are tested indirectly via the map they wrap.
 */
describe('waitForResponse', () => {
  let pending: Map<string, string>;

  beforeEach(() => {
    pending = new Map();
  });

  afterEach(() => {
    clearPendingResponses();
  });

  it('resolves with the response when one is already pending', async () => {
    pending.set('sess-1', 'hello');

    const result = await waitForResponse(pending, 'sess-1', 500, 10, new AbortController().signal);

    expect(result).toBe('hello');
  });

  it('resolves with the response when it arrives during polling', async () => {
    const controller = new AbortController();

    setTimeout(() => {
      pending.set('sess-2', 'delayed reply');
    }, 30);

    const result = await waitForResponse(pending, 'sess-2', 500, 10, controller.signal);

    expect(result).toBe('delayed reply');
  });

  it('returns null when the timeout expires without a response', async () => {
    const result = await waitForResponse(pending, 'no-reply', 50, 10, new AbortController().signal);

    expect(result).toBeNull();
  });

  it('returns null when the abort signal fires before timeout', async () => {
    const controller = new AbortController();

    setTimeout(() => {
      controller.abort();
    }, 20);

    const start = performance.now();
    const result = await waitForResponse(pending, 'aborted', 2000, 10, controller.signal);
    const elapsed = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsed).toBeLessThan(500);
  });

  it('removes the response from the pending map after returning it', async () => {
    pending.set('sess-3', 'once');

    const first = await waitForResponse(pending, 'sess-3', 100, 10, new AbortController().signal);
    const second = await waitForResponse(pending, 'sess-3', 50, 10, new AbortController().signal);

    expect(first).toBe('once');
    expect(second).toBeNull();
  });

  it('does not return a response meant for a different session', async () => {
    pending.set('other-session', 'not for you');

    const result = await waitForResponse(pending, 'my-session', 50, 10, new AbortController().signal);

    expect(result).toBeNull();
  });
});
