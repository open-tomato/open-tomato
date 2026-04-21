/**
 * @packageDocumentation
 * Unit tests for suspend strategy functions: waitForResume, retryBackoff, waitThenRetry.
 */

import type { Mock } from 'vitest';

import { randomUUID } from 'node:crypto';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { retryBackoff, waitForResume, waitThenRetry } from './suspend-strategies.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Stubs `globalThis.Bun.file` so that `.exists()` delegates to real
 * `fs.access` — giving tests a real file-system signal without needing
 * a native Bun runtime.
 */
function stubBunFileWithRealFs(): void {
  vi.stubGlobal('Bun', {
    file: (filePath: string) => ({
      exists: async (): Promise<boolean> => {
        try {
          await access(filePath);
          return true;
        } catch {
          return false;
        }
      },
    }),
  });
}

/**
 * Stubs `globalThis.Bun.file` with a fully mocked `exists` function so that
 * callers can control the sequence of return values without touching the file
 * system.
 */
function stubBunFileMock(existsFn: () => Promise<boolean>): Mock {
  const fileMock = vi.fn().mockReturnValue({ exists: existsFn });
  vi.stubGlobal('Bun', { file: fileMock });
  return fileMock;
}

// ---------------------------------------------------------------------------
// waitForResume
// ---------------------------------------------------------------------------

describe('waitForResume', () => {
  let stateDir: string;
  let signalPath: string;

  beforeEach(async () => {
    stateDir = join(tmpdir(), `wait-for-resume-${randomUUID()}`);
    signalPath = join(stateDir, '.ralph', 'resume-requested');
    await mkdir(join(stateDir, '.ralph'), { recursive: true });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    // Best-effort cleanup — ignore errors if the dir was already removed.
    await rm(stateDir, { recursive: true, force: true });
  });

  it('resolves once the signal file is written to the temp directory', async () => {
    stubBunFileWithRealFs();

    // Write signal file after a short delay (30 ms) so the first poll sees it absent.
    const writeDelay = setTimeout(() => {
      void writeFile(signalPath, '');
    }, 30);

    await expect(waitForResume(stateDir, 10)).resolves.toBeUndefined();

    clearTimeout(writeDelay);
  });

  it('deletes the signal file after detection', async () => {
    stubBunFileWithRealFs();

    // Write the file immediately so the first poll succeeds.
    await writeFile(signalPath, '');

    await waitForResume(stateDir, 10);

    // The signal file should have been deleted.
    await expect(access(signalPath)).rejects.toThrow();
  });

  it('keeps polling while signal file is absent, then resolves when it appears', async () => {
    // Spy on real fs.access to count how many times exists() is invoked.
    let existsCallCount = 0;

    vi.stubGlobal('Bun', {
      file: (filePath: string) => ({
        exists: async (): Promise<boolean> => {
          existsCallCount++;
          try {
            await access(filePath);
            return true;
          } catch {
            return false;
          }
        },
      }),
    });

    // Write the signal file after 40 ms — ensures at least 3 polls at 10 ms interval.
    const writeDelay = setTimeout(() => {
      void writeFile(signalPath, '');
    }, 40);

    await expect(waitForResume(stateDir, 10)).resolves.toBeUndefined();
    clearTimeout(writeDelay);

    // The function must have polled more than once before finding the file.
    expect(existsCallCount).toBeGreaterThanOrEqual(2);
  });

  it('passes the correct signal file path to Bun.file', async () => {
    const existsFn = vi.fn().mockResolvedValue(true);
    const fileMock = stubBunFileMock(existsFn);

    // Suppress the unlink ENOENT so the test focuses on the path assertion.
    await waitForResume(stateDir, 5).catch(() => {});

    expect(fileMock).toHaveBeenCalledWith(signalPath);
  });

  it('rejects with AbortError when the signal is already aborted before polling', async () => {
    stubBunFileWithRealFs();

    const controller = new AbortController();
    controller.abort();

    await expect(waitForResume(stateDir, 10, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('rejects with AbortError when the signal is aborted while waiting for the file', async () => {
    const controller = new AbortController();
    let callCount = 0;

    // The file never appears; abort after the first failed check.
    const existsFn = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // Schedule the abort to fire after the current microtask completes so
        // the delay() inside waitForResume is already waiting.
        setTimeout(() => controller.abort(), 0);
      }
      return false;
    });
    stubBunFileMock(existsFn);

    await expect(waitForResume('/fake-state-dir', 50, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('does not reject when no AbortSignal is provided', async () => {
    stubBunFileWithRealFs();

    // Write the file immediately so the function exits without needing abort.
    await writeFile(signalPath, '');

    await expect(waitForResume(stateDir, 10)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// retryBackoff
// ---------------------------------------------------------------------------

describe('retryBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves on the third call when the function fails twice then succeeds', async () => {
    const fn: Mock<() => Promise<void>> = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce(undefined);

    const promise = retryBackoff(fn, 2, 10);

    // Advance past first backoff (10 ms * 2^0 = 10 ms).
    await vi.advanceTimersByTimeAsync(10);
    // Advance past second backoff (10 ms * 2^1 = 20 ms).
    await vi.advanceTimersByTimeAsync(20);

    await expect(promise).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('resolves immediately on the first call when the function succeeds', async () => {
    const fn: Mock<() => Promise<void>> = vi.fn().mockResolvedValueOnce(undefined);

    await expect(retryBackoff(fn, 2, 10)).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after all retries are exhausted', async () => {
    const error = new Error('always fails');
    const fn: Mock<() => Promise<void>> = vi.fn().mockRejectedValue(error);

    const promise = retryBackoff(fn, 2, 10);
    // Attach the rejection handler before advancing timers so Node.js never
    // sees an unhandled-rejection window.
    const assertion = expect(promise).rejects.toThrow('always fails');

    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(20);

    await assertion;
    // 1 initial attempt + 2 retries = 3 total calls.
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not wait after the last failed attempt', async () => {
    const fn: Mock<() => Promise<void>> = vi.fn().mockRejectedValue(new Error('fail'));

    const promise = retryBackoff(fn, 1, 100);
    const assertion = expect(promise).rejects.toThrow('fail');

    // Advance past the one retry delay (100 ms).
    await vi.advanceTimersByTimeAsync(100);

    // The promise should now be settled — no additional delay outstanding.
    await assertion;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rejects with AbortError when the signal is already aborted before the first attempt', async () => {
    const fn: Mock<() => Promise<void>> = vi.fn();
    const controller = new AbortController();
    controller.abort();

    await expect(retryBackoff(fn, 2, 10, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('rejects with AbortError when the signal is aborted during a backoff delay', async () => {
    const controller = new AbortController();
    const fn: Mock<() => Promise<void>> = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined);

    const promise = retryBackoff(fn, 2, 1000, controller.signal);
    // Attach rejection handler before advancing timers.
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });

    // Abort while the backoff delay is active (before the timer fires).
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);

    await assertion;
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// waitThenRetry
// ---------------------------------------------------------------------------

describe('waitThenRetry', () => {
  let stateDir: string;
  let signalPath: string;

  beforeEach(async () => {
    stateDir = join(tmpdir(), `wait-then-retry-${randomUUID()}`);
    signalPath = join(stateDir, '.ralph', 'resume-requested');
    await mkdir(join(stateDir, '.ralph'), { recursive: true });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(stateDir, { recursive: true, force: true });
  });

  it('resolves and calls retryFn exactly once after the signal file appears', async () => {
    stubBunFileWithRealFs();

    const retryFn: Mock<() => Promise<void>> = vi.fn().mockResolvedValueOnce(undefined);

    // Write the signal file after a short delay so the first poll sees it absent.
    const writeDelay = setTimeout(() => {
      void writeFile(signalPath, '');
    }, 30);

    await expect(waitThenRetry(stateDir, retryFn, 10)).resolves.toBeUndefined();

    clearTimeout(writeDelay);

    expect(retryFn).toHaveBeenCalledTimes(1);
  });

  it('does not call retryFn before the signal file appears', async () => {
    // Write the signal file so that waitForResume's unlink() call succeeds,
    // but control when exists() "sees" the file via the mock sequence.
    await writeFile(signalPath, '');

    let callCount = 0;
    const existsFn = vi.fn().mockImplementation(async (): Promise<boolean> => {
      callCount++;
      // Report the file as absent for the first two polls, then present.
      return callCount >= 3;
    });
    stubBunFileMock(existsFn);

    const retryFn: Mock<() => Promise<void>> = vi.fn().mockImplementation(async () => {
      // When retryFn fires, the mock must have already returned true at least once.
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    await expect(waitThenRetry(stateDir, retryFn, 5)).resolves.toBeUndefined();

    // retryFn is called exactly once.
    expect(retryFn).toHaveBeenCalledTimes(1);
  });

  it('does not call retryFn and rejects with AbortError when aborted before signal appears', async () => {
    const controller = new AbortController();
    const retryFn: Mock<() => Promise<void>> = vi.fn();

    // The file never appears; abort immediately.
    const existsFn = vi.fn().mockImplementation(async () => {
      setTimeout(() => controller.abort(), 0);
      return false;
    });
    stubBunFileMock(existsFn);

    await expect(
      waitThenRetry(stateDir, retryFn, 50, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(retryFn).not.toHaveBeenCalled();
  });

  it('calls retryFn exactly once even when multiple polls were needed', async () => {
    stubBunFileWithRealFs();

    const retryFn: Mock<() => Promise<void>> = vi.fn().mockResolvedValueOnce(undefined);

    // Write the signal file after 40 ms — ensures at least 3 polls at 10 ms interval.
    const writeDelay = setTimeout(() => {
      void writeFile(signalPath, '');
    }, 40);

    await expect(waitThenRetry(stateDir, retryFn, 10)).resolves.toBeUndefined();

    clearTimeout(writeDelay);

    expect(retryFn).toHaveBeenCalledTimes(1);
  });

  it('propagates an error thrown by retryFn', async () => {
    stubBunFileWithRealFs();

    // Write the signal file immediately so the wait phase resolves at once.
    await writeFile(signalPath, '');

    const boom = new Error('retryFn failed');
    const retryFn: Mock<() => Promise<void>> = vi.fn().mockRejectedValueOnce(boom);

    await expect(waitThenRetry(stateDir, retryFn, 10)).rejects.toThrow('retryFn failed');

    expect(retryFn).toHaveBeenCalledTimes(1);
  });
});
