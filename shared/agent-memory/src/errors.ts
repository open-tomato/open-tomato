/**
 * @module errors
 *
 * Typed error classes for the agent-memory package.
 *
 * All public operations in {@link MarkdownMemoryStore} wrap raw I/O and locking
 * failures into one of these classes so callers can narrow by type rather than
 * inspecting opaque `Error` messages.
 *
 * @example
 * ```typescript
 * import { MarkdownMemoryStore, MemoryReadError, MemoryLockError } from '@open-tomato/agent-memory';
 *
 * try {
 *   const memories = await store.readAll();
 * } catch (error) {
 *   if (error instanceof MemoryReadError) {
 *     console.error('Could not read', error.filePath, error.cause);
 *   } else if (error instanceof MemoryLockError) {
 *     console.error('Lock timed out after', error.timeoutMs, 'ms');
 *   }
 * }
 * ```
 */

/**
 * Base class for all agent-memory errors.
 *
 * Provides a common supertype so callers can catch any store error with a
 * single `instanceof MemoryStoreError` check if they do not need to
 * distinguish between sub-types.
 */
export class MemoryStoreError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'MemoryStoreError';
  }
}

/**
 * Thrown when reading the backing memory file fails.
 *
 * Wraps the underlying `NodeJS.ErrnoException` (or any other error) so the
 * original cause is preserved and accessible via the standard `cause` property.
 */
export class MemoryReadError extends MemoryStoreError {
  /** The path of the file that could not be read. */
  readonly filePath: string;

  /**
   * @param filePath - Path of the file that could not be read.
   * @param cause - The underlying error from the file-system operation.
   */
  constructor(filePath: string, cause?: unknown) {
    super(
      `Failed to read memory file "${filePath}": ${
        cause instanceof Error
          ? cause.message
          : String(cause)
      }`,
      cause,
    );
    this.name = 'MemoryReadError';
    this.filePath = filePath;
  }
}

/**
 * Thrown when writing to the backing memory file fails.
 *
 * Covers all write-path failures: creating parent directories, opening the
 * file for writing, and flushing serialised content to disk.
 */
export class MemoryWriteError extends MemoryStoreError {
  /** The path of the file that could not be written. */
  readonly filePath: string;

  /**
   * @param filePath - Path of the file that could not be written.
   * @param cause - The underlying error from the file-system operation.
   */
  constructor(filePath: string, cause?: unknown) {
    super(
      `Failed to write memory file "${filePath}": ${
        cause instanceof Error
          ? cause.message
          : String(cause)
      }`,
      cause,
    );
    this.name = 'MemoryWriteError';
    this.filePath = filePath;
  }
}

/**
 * Thrown when an exclusive advisory lock on the backing file cannot be
 * acquired within the configured timeout.
 *
 * This typically means another process is holding the lock and did not release
 * it within `timeoutMs` milliseconds.
 */
export class MemoryLockError extends MemoryStoreError {
  /** The path of the file that could not be locked. */
  readonly filePath: string;
  /** The maximum number of milliseconds that were waited before giving up. */
  readonly timeoutMs: number;

  /**
   * @param filePath - Path of the file whose lock could not be acquired.
   * @param timeoutMs - The timeout in milliseconds that elapsed.
   * @param cause - The underlying error from `proper-lockfile`.
   */
  constructor(filePath: string, timeoutMs: number, cause?: unknown) {
    super(
      `Failed to acquire lock on "${filePath}" within ${timeoutMs}ms: ${
        cause instanceof Error
          ? cause.message
          : String(cause)
      }`,
      cause,
    );
    this.name = 'MemoryLockError';
    this.filePath = filePath;
    this.timeoutMs = timeoutMs;
  }
}
