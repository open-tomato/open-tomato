import { describe, expect, it } from 'bun:test';

import { sleep } from '../sleep.js';

describe('sleep', () => {
  it('resolves after the specified delay', async () => {
    const start = performance.now();
    await sleep(50);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it('resolves to undefined', async () => {
    const result = await sleep(1);
    expect(result).toBeUndefined();
  });

  it('returns a promise', () => {
    const result = sleep(1);
    expect(result).toBeInstanceOf(Promise);
  });
});
