import { describe, expect, it, mock } from 'bun:test';

import { withExponentialBackoff } from '../with-exponential-backoff.js';

describe('withExponentialBackoff', () => {
  it('succeeds on first attempt without retrying', async () => {
    const fn = mock(() => Promise.resolve('ok'));

    const result = await withExponentialBackoff(fn, 3, 10);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient error and succeeds', async () => {
    let calls = 0;
    const fn = mock(() => {
      calls++;
      if (calls < 3) {
        return Promise.reject(new Error('transient'));
      }
      return Promise.resolve('recovered');
    });

    const result = await withExponentialBackoff(fn, 5, 1);

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after maxAttempts exhausted', async () => {
    const fn = mock(() => Promise.reject(new Error('permanent')));

    await expect(withExponentialBackoff(fn, 3, 1)).rejects.toThrow('permanent');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws immediately when maxAttempts is 1', async () => {
    const fn = mock(() => Promise.reject(new Error('fail')));

    await expect(withExponentialBackoff(fn, 1, 1)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('preserves the original error from the last attempt', async () => {
    let calls = 0;
    const fn = mock(() => {
      calls++;
      return Promise.reject(new Error(`error-${calls}`));
    });

    await expect(withExponentialBackoff(fn, 3, 1)).rejects.toThrow('error-3');
  });
});
