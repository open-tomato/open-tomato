import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { withExclusiveLock } from '../src/lock';

async function makeTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'task-store-lock-test-'));
}

describe('withExclusiveLock', () => {
  it('creates the file if it does not exist', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    try {
      const result = await withExclusiveLock(filePath, async () => 42);
      expect(result).toBe(42);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('returns the value resolved by fn', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    try {
      const result = await withExclusiveLock(filePath, async () => 'hello');
      expect(result).toBe('hello');
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('releases the lock even when fn throws', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    try {
      await expect(
        withExclusiveLock(filePath, async () => {
          throw new Error('fn error');
        }),
      ).rejects.toThrow('fn error');

      // Lock must be released — a second call must succeed
      const result = await withExclusiveLock(filePath, async () => 'recovered');
      expect(result).toBe('recovered');
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('serialises two concurrent callers — only one proceeds at a time', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    const log: string[] = [];

    try {
      await Promise.all([
        withExclusiveLock(filePath, async () => {
          log.push('A:start');
          // Yield to allow the second caller to attempt lock acquisition
          await new Promise((r) => setTimeout(r, 50));
          log.push('A:end');
        }),
        // Small delay so A starts first
        new Promise<void>((resolve, reject) => setTimeout(() => {
          withExclusiveLock(filePath, async () => {
            log.push('B:start');
            log.push('B:end');
          })
            .then(resolve)
            .catch(reject);
        }, 10)),
      ]);

      // A must fully complete before B starts
      expect(log).toEqual(['A:start', 'A:end', 'B:start', 'B:end']);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('throws a descriptive error when timeoutMs is 0 and lock is already held', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');

    try {
      await expect(
        withExclusiveLock(
          filePath,
          async () => {
            // Attempt a nested lock with timeout 0 — should fail immediately
            await withExclusiveLock(filePath, async () => 'inner', 0);
          },
          5000,
        ),
      ).rejects.toThrow(/Failed to acquire lock/);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
