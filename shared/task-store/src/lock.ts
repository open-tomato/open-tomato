/**
 * @module lock
 *
 * Exclusive file-locking utilities for the task store.
 *
 * Exports {@link withExclusiveLock}, which wraps any async operation in an
 * inter-process exclusive lock using `proper-lockfile`. This is the
 * primitive that all mutating {@link TaskStore} methods rely on to provide
 * atomic read-modify-write semantics across concurrent callers and processes.
 */

import { open } from 'node:fs/promises';

import lockfile from 'proper-lockfile';

/**
 * Executes `fn` while holding an exclusive file lock on `filePath`.
 *
 * Uses `proper-lockfile` (mkdir strategy) for inter-process locking that works
 * on local and network file systems. The lock is always released in a `finally`
 * block so it is freed even when `fn` throws.
 *
 * This function provides an atomic read-modify-write guarantee: any other
 * caller that invokes `withExclusiveLock` on the same path will block until
 * the current lock holder releases, ensuring no two callers can observe or
 * mutate the file simultaneously.
 *
 * @param filePath - Path to the file to lock. The file is created if it does
 *   not yet exist, since `proper-lockfile` requires it to be present.
 * @param fn - Async callback to run while the lock is held.
 * @param timeoutMs - Maximum milliseconds to wait for the lock before
 *   throwing. Defaults to `5000`. Pass `0` to fail immediately if the lock
 *   cannot be acquired on the first attempt.
 * @returns The value resolved by `fn`.
 * @throws An `Error` with a descriptive message if the lock cannot be
 *   acquired within `timeoutMs`.
 */
export async function withExclusiveLock<T>(
  filePath: string,
  fn: () => Promise<T>,
  timeoutMs = 5000,
): Promise<T> {
  // proper-lockfile requires the target file to exist for realpath resolution.
  await ensureFileExists(filePath);

  const retries =
    timeoutMs > 0
      ? {
        retries: Math.ceil(timeoutMs / 50),
        minTimeout: 50,
        maxTimeout: 200,
        maxRetryTime: timeoutMs,
      }
      : 0;

  let release: () => Promise<void>;
  try {
    release = await lockfile.lock(filePath, { retries });
  } catch (error) {
    throw new Error(
      `Failed to acquire lock on "${filePath}" within ${timeoutMs}ms: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }

  try {
    return await fn();
  } finally {
    await release();
  }
}

async function ensureFileExists(filePath: string): Promise<void> {
  // Open with 'a' flag: creates the file if absent, leaves existing content
  // intact (does not truncate). This is safe under concurrent callers.
  const fh = await open(filePath, 'a');
  await fh.close();
}
