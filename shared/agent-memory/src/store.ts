/**
 * @module store
 *
 * Provides {@link MarkdownMemoryStore} — a file-backed, lockfile-safe store
 * that persists {@link Memory} entries as structured markdown.
 */

import type { Memory } from './types.js';

import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import lockfile from 'proper-lockfile';

import { MemoryLockError, MemoryReadError, MemoryWriteError } from './errors.js';
import { parseMemoriesFromMarkdown, serializeMemoriesToMarkdown } from './markdown.js';

/**
 * Seed content written to a newly created memories file.
 *
 * Contains one empty section header per {@link MemoryType} in canonical order
 * (Patterns → Decisions → Fixes → Context). Seeding with known headers means
 * the file is always structurally valid markdown even before any memories are
 * appended, which simplifies reader implementations.
 */
const EMPTY_TEMPLATE =
  '## Patterns\n\n## Decisions\n\n## Fixes\n\n## Context\n';

/**
 * Executes `fn` while holding an exclusive advisory lock on `filePath`.
 *
 * Uses `proper-lockfile` (mkdir strategy) for inter-process locking. The lock
 * is always released in a `finally` block so it is freed even when `fn`
 * throws. The target file must already exist before this is called.
 *
 * @param filePath - Path to the file to lock.
 * @param fn - Async callback to run while the lock is held.
 * @param timeoutMs - Maximum milliseconds to wait for the lock. Defaults to
 *   `5000`.
 * @returns The value resolved by `fn`.
 * @throws An `Error` with a descriptive message if the lock cannot be acquired
 *   within `timeoutMs`.
 */
async function withExclusiveLock<T>(
  filePath: string,
  fn: () => Promise<T>,
  timeoutMs = 5000,
): Promise<T> {
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
    throw new MemoryLockError(filePath, timeoutMs, error);
  }

  try {
    return await fn();
  } finally {
    await release();
  }
}

/**
 * File-backed memory store that persists {@link Memory} entries as structured
 * markdown.
 *
 * The backing file is created on demand by {@link ensureFile} or implicitly by
 * any mutating method. All operations use an exclusive advisory lock via
 * `proper-lockfile` so concurrent callers (including separate OS processes)
 * cannot corrupt each other's writes.
 *
 * **Locking approach**: `proper-lockfile` creates a sibling `.lock` directory
 * next to the target file as an atomic advisory lock. All read and write
 * operations acquire this lock, providing a single-writer / no-concurrent-reader
 * guarantee. This avoids reading partially-written state during concurrent
 * appends.
 *
 * @example
 * ```typescript
 * const store = new MarkdownMemoryStore('/project/.ralph/agent/memories.md');
 * await store.ensureFile();
 *
 * const memory = await store.append({
 *   type: 'pattern',
 *   content: 'Always validate inputs with Zod.',
 *   tags: ['typescript', 'zod'],
 * });
 *
 * const all = await store.readAll();
 * ```
 */
export class MarkdownMemoryStore {
  /** Absolute or relative path to the backing markdown file. */
  readonly filePath: string;

  /**
   * @param filePath - Path to the markdown file used for persistent storage.
   *   The file and its parent directories are created lazily by
   *   {@link ensureFile} or any mutating method.
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Creates the backing file and any missing parent directories if they do not
   * already exist.
   *
   * Uses the `'a'` open flag so that an existing file's content is never
   * truncated. After this call, {@link readAll} is safe to invoke even if no
   * memories have been appended yet.
   *
   * This method is idempotent: calling it multiple times on the same path is
   * safe.
   */
  async ensureFile(): Promise<void> {
    try {
      await mkdir(dirname(this.filePath), { recursive: true });
    } catch (error) {
      throw new MemoryWriteError(this.filePath, error);
    }
    try {
      // 'ax' = exclusive create: succeeds only if the file does not exist,
      // preventing truncation of existing content on repeated calls.
      const fh = await open(this.filePath, 'ax');
      try {
        await fh.writeFile(EMPTY_TEMPLATE, 'utf8');
      } finally {
        await fh.close();
      }
    } catch (error) {
      if ((error as { code?: string }).code === 'EEXIST') {
        // File already exists — nothing to do.
        return;
      }
      throw new MemoryWriteError(this.filePath, error);
    }
  }

  /**
   * Reads and returns all memories from the backing file.
   *
   * Acquires an exclusive lock for the duration of the read to prevent
   * observing partially-written state during a concurrent {@link append} or
   * {@link writeAll}.
   *
   * Creates the file (via {@link ensureFile}) if it does not yet exist, in
   * which case an empty array is returned.
   *
   * @returns All memories stored in the file, in document order.
   */
  async readAll(): Promise<Memory[]> {
    await this.ensureFile();
    return withExclusiveLock(this.filePath, async () => {
      let raw: string;
      try {
        raw = await readFile(this.filePath, 'utf8');
      } catch (error) {
        throw new MemoryReadError(this.filePath, error);
      }
      return parseMemoriesFromMarkdown(raw);
    });
  }

  /**
   * Appends a new memory entry to the store.
   *
   * A UUID is generated for `id` and `created` is set to the current UTC
   * timestamp. The operation is atomic: an exclusive lock is held for the full
   * read-modify-write cycle so that concurrent callers do not lose each
   * other's writes.
   *
   * Creates the file (via {@link ensureFile}) if it does not yet exist.
   *
   * @param memory - The memory to store, without `id` and `created` (both are
   *   generated automatically).
   * @returns The fully-populated {@link Memory} that was persisted.
   */
  async append(memory: Omit<Memory, 'id' | 'created'>): Promise<Memory> {
    await this.ensureFile();
    return withExclusiveLock(this.filePath, async () => {
      let raw: string;
      try {
        raw = await readFile(this.filePath, 'utf8');
      } catch (error) {
        throw new MemoryReadError(this.filePath, error);
      }
      const existing = parseMemoriesFromMarkdown(raw);
      const newMemory: Memory = {
        ...memory,
        id: crypto.randomUUID(),
        created: new Date(),
      };
      const updated = [...existing, newMemory];
      try {
        await writeFile(this.filePath, serializeMemoriesToMarkdown(updated), 'utf8');
      } catch (error) {
        throw new MemoryWriteError(this.filePath, error);
      }
      return newMemory;
    });
  }

  /**
   * Overwrites the backing file with the provided memories.
   *
   * Acquires an exclusive lock for the duration of the write. The caller is
   * responsible for ensuring the provided array reflects the desired final
   * state — any memories not included will be lost.
   *
   * Creates the file (via {@link ensureFile}) if it does not yet exist.
   *
   * @param memories - The complete set of memories to persist.
   */
  async writeAll(memories: Memory[]): Promise<void> {
    await this.ensureFile();
    await withExclusiveLock(this.filePath, async () => {
      try {
        await writeFile(this.filePath, serializeMemoriesToMarkdown(memories), 'utf8');
      } catch (error) {
        throw new MemoryWriteError(this.filePath, error);
      }
    });
  }
}
