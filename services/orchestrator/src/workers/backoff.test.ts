import type { BackoffOptions } from './backoff.js';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { withExponentialBackoff } from './backoff.js';

/**
 * Helper to build options with sensible defaults for testing.
 * Uses 1ms base delay for fast tests with real timers.
 * jitter = 0 gives deterministic delays unless overridden.
 */
function opts(overrides: Partial<BackoffOptions> = {}): BackoffOptions {
  return {
    maxRetries: 3,
    baseDelayMs: 1,
    factor: 2,
    jitter: 0,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withExponentialBackoff', () => {
  describe('success path', () => {
    it('returns the result on first success without retrying', async () => {
      const fn = vi.fn().mockResolvedValue('ok');

      const result = await withExponentialBackoff(fn, opts());

      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('returns the result when fn succeeds after failures', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail-1'))
        .mockRejectedValueOnce(new Error('fail-2'))
        .mockResolvedValue('recovered');

      const result = await withExponentialBackoff(fn, opts());

      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry count', () => {
    it('retries exactly maxRetries times before throwing', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));

      await expect(
        withExponentialBackoff(fn, opts({ maxRetries: 2 })),
      ).rejects.toThrow('always fails');

      // 1 initial + 2 retries = 3 total
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('does not retry when maxRetries is 0', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('immediate'));

      await expect(
        withExponentialBackoff(fn, opts({ maxRetries: 0 })),
      ).rejects.toThrow('immediate');

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('delay growth', () => {
    it('applies exponential delay: baseDelayMs * factor^attempt', async () => {
      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;

      // Intercept setTimeout to capture delay values while still executing
      vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
        cb: (...args: unknown[]) => void,
        ms?: number,
      ) => {
        if (ms !== undefined && ms >= 1) {
          delays.push(ms);
        }
        return originalSetTimeout(cb, 0); // Execute immediately for speed
      }) as typeof setTimeout);

      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(
        withExponentialBackoff(fn, opts({ maxRetries: 3, baseDelayMs: 100, factor: 2 })),
      ).rejects.toThrow('fail');

      expect(delays).toEqual([100, 200, 400]);
    });
  });

  describe('jitter', () => {
    it('applies minimum jitter when Math.random() returns 0', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);

      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;
      vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
        cb: (...args: unknown[]) => void,
        ms?: number,
      ) => {
        if (ms !== undefined && ms >= 1) {
          delays.push(ms);
        }
        return originalSetTimeout(cb, 0);
      }) as typeof setTimeout);

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');

      await withExponentialBackoff(
        fn,
        opts({ maxRetries: 1, baseDelayMs: 1000, factor: 1, jitter: 0.2 }),
      );

      // delay = 1000 * (1 + 0.2 * (0 * 2 - 1)) = 1000 * 0.8 = 800
      expect(delays[0]).toBe(800);
    });

    it('applies maximum jitter when Math.random() returns 1', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(1);

      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;
      vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
        cb: (...args: unknown[]) => void,
        ms?: number,
      ) => {
        if (ms !== undefined && ms >= 1) {
          delays.push(ms);
        }
        return originalSetTimeout(cb, 0);
      }) as typeof setTimeout);

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');

      await withExponentialBackoff(
        fn,
        opts({ maxRetries: 1, baseDelayMs: 1000, factor: 1, jitter: 0.2 }),
      );

      // delay = 1000 * (1 + 0.2 * (1 * 2 - 1)) = 1000 * 1.2 = 1200
      expect(delays[0]).toBe(1200);
    });

    it('centers jitter around base delay when Math.random() returns 0.5', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;
      vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
        cb: (...args: unknown[]) => void,
        ms?: number,
      ) => {
        if (ms !== undefined && ms >= 1) {
          delays.push(ms);
        }
        return originalSetTimeout(cb, 0);
      }) as typeof setTimeout);

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');

      await withExponentialBackoff(
        fn,
        opts({ maxRetries: 1, baseDelayMs: 1000, factor: 1, jitter: 0.2 }),
      );

      // delay = 1000 * (1 + 0.2 * (0.5 * 2 - 1)) = 1000 * 1.0 = 1000
      expect(delays[0]).toBe(1000);
    });

    it('produces no jitter when jitter is 0', async () => {
      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;
      vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
        cb: (...args: unknown[]) => void,
        ms?: number,
      ) => {
        if (ms !== undefined && ms >= 1) {
          delays.push(ms);
        }
        return originalSetTimeout(cb, 0);
      }) as typeof setTimeout);

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');

      await withExponentialBackoff(
        fn,
        opts({ maxRetries: 1, baseDelayMs: 500, factor: 1, jitter: 0 }),
      );

      expect(delays[0]).toBe(500);
    });

    it('jitter stays within ±jitter bounds across multiple retries', async () => {
      // Use real random for a bounds check
      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;
      vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
        cb: (...args: unknown[]) => void,
        ms?: number,
      ) => {
        if (ms !== undefined && ms >= 1) {
          delays.push(ms);
        }
        return originalSetTimeout(cb, 0);
      }) as typeof setTimeout);

      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(
        withExponentialBackoff(
          fn,
          opts({ maxRetries: 2, baseDelayMs: 1000, factor: 1, jitter: 0.2 }),
        ),
      ).rejects.toThrow('fail');

      for (const d of delays) {
        expect(d).toBeGreaterThanOrEqual(800);  // 1000 * (1 - 0.2)
        expect(d).toBeLessThanOrEqual(1200);     // 1000 * (1 + 0.2)
      }
    });
  });

  describe('shouldRetry', () => {
    it('propagates error immediately when shouldRetry returns false', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('non-retryable'));

      await expect(
        withExponentialBackoff(fn, opts({ shouldRetry: () => false })),
      ).rejects.toThrow('non-retryable');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('passes error and attempt number to shouldRetry', async () => {
      const shouldRetry = vi.fn().mockReturnValue(true);
      const errors = [new Error('err-0'), new Error('err-1'), new Error('err-2')];
      let callIndex = 0;

      const fn = vi.fn().mockImplementation(() => Promise.reject(errors[callIndex++]));

      await expect(
        withExponentialBackoff(fn, opts({ maxRetries: 2, shouldRetry })),
      ).rejects.toThrow('err-2');

      expect(shouldRetry).toHaveBeenNthCalledWith(1, errors[0], 0);
      expect(shouldRetry).toHaveBeenNthCalledWith(2, errors[1], 1);
    });

    it('retries only retryable errors and stops on non-retryable', async () => {
      const retryableError = new Error('retryable');
      const fatalError = new Error('fatal');

      const fn = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(fatalError);

      const shouldRetry = vi.fn().mockImplementation(
        (err: unknown) => err === retryableError,
      );

      await expect(
        withExponentialBackoff(fn, opts({ maxRetries: 3, shouldRetry })),
      ).rejects.toThrow('fatal');

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries all errors when shouldRetry is omitted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(
        withExponentialBackoff(fn, opts({ maxRetries: 2 })),
      ).rejects.toThrow('fail');

      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('throws the last error when all retries are exhausted', async () => {
      let callCount = 0;
      const fn = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error(`fail-${callCount}`));
      });

      await expect(
        withExponentialBackoff(fn, opts({ maxRetries: 2 })),
      ).rejects.toThrow('fail-3');
    });

    it('preserves non-Error thrown values', async () => {
      const fn = vi.fn().mockRejectedValue('string-error');

      await expect(
        withExponentialBackoff(fn, opts({ maxRetries: 0 })),
      ).rejects.toBe('string-error');
    });
  });
});
