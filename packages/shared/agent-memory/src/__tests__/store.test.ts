import type { Memory } from '../types.js';

import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MemoryLockError, MemoryReadError, MemoryStoreError, MemoryWriteError } from '../errors.js';
import { MarkdownMemoryStore } from '../store.js';

describe('MarkdownMemoryStore', () => {
  let tmpPath: string;
  let store: MarkdownMemoryStore;

  beforeEach(() => {
    // Each test gets an isolated directory so lock files cannot collide
    tmpPath = join(tmpdir(), `agent-memory-test-${crypto.randomUUID()}`);
    store = new MarkdownMemoryStore(join(tmpPath, 'memories.md'));
  });

  afterEach(async () => {
    await rm(tmpPath, { recursive: true, force: true });
  });

  describe('ensureFile', () => {
    it('creates the file and parent directories when they do not exist', async () => {
      await store.ensureFile();
      const all = await store.readAll();
      expect(all).toEqual([]);
    });

    it('seeds the file with empty section headers on first creation', async () => {
      await store.ensureFile();
      const content = await readFile(store.filePath, 'utf8');
      expect(content).toContain('## Patterns');
      expect(content).toContain('## Decisions');
      expect(content).toContain('## Fixes');
      expect(content).toContain('## Context');
    });

    it('is idempotent — calling twice preserves existing data', async () => {
      await store.ensureFile();
      await store.append({ type: 'pattern', content: 'Keep me.', tags: ['ts'] });
      await store.ensureFile(); // second call must not truncate
      const all = await store.readAll();
      expect(all).toHaveLength(1);
      expect(all[0]?.content).toBe('Keep me.');
    });
  });

  describe('readAll', () => {
    it('returns an empty array for a newly created file', async () => {
      await store.ensureFile();
      expect(await store.readAll()).toEqual([]);
    });

    it('returns an empty array when the file does not yet exist', async () => {
      // readAll must call ensureFile implicitly
      expect(await store.readAll()).toEqual([]);
    });

    it('reads back all memories that were appended', async () => {
      await store.append({ type: 'context', content: 'Some context.', tags: ['env'] });
      await store.append({ type: 'fix', content: 'A fix.', tags: ['bug'] });

      const all = await store.readAll();

      expect(all).toHaveLength(2);
      // Serializer groups by type (canonical order), so check by content rather than index
      const byContent = Object.fromEntries(all.map((m) => [m.content, m]));
      expect(byContent['Some context.']).toMatchObject({ type: 'context', tags: ['env'] });
      expect(byContent['A fix.']).toMatchObject({ type: 'fix', tags: ['bug'] });
    });
  });

  describe('append', () => {
    it('creates the file on first write to a non-existent path', async () => {
      const memory = await store.append({
        type: 'pattern',
        content: 'First write.',
        tags: ['a'],
      });

      expect(memory.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(memory.created).toBeInstanceOf(Date);
      expect(memory.type).toBe('pattern');
      expect(memory.content).toBe('First write.');
      expect(memory.tags).toEqual(['a']);
    });

    it('assigns a created timestamp close to now', async () => {
      const before = Date.now();
      const memory = await store.append({ type: 'decision', content: 'Chose X.', tags: [] });
      const after = Date.now();

      expect(memory.created.getTime()).toBeGreaterThanOrEqual(before);
      expect(memory.created.getTime()).toBeLessThanOrEqual(after);
    });

    it('appends to existing content without overwriting prior entries', async () => {
      await store.append({ type: 'pattern', content: 'First.', tags: [] });
      await store.append({ type: 'decision', content: 'Second.', tags: [] });

      const all = await store.readAll();

      expect(all).toHaveLength(2);
      expect(all[0]).toMatchObject({ type: 'pattern', content: 'First.' });
      expect(all[1]).toMatchObject({ type: 'decision', content: 'Second.' });
    });

    it('generates unique ids for every call', async () => {
      const m1 = await store.append({ type: 'fix', content: 'Fix 1.', tags: [] });
      const m2 = await store.append({ type: 'fix', content: 'Fix 2.', tags: [] });

      expect(m1.id).not.toBe(m2.id);
    });

    it('handles concurrent append calls without losing data', async () => {
      await Promise.all([
        store.append({ type: 'pattern', content: 'Concurrent A.', tags: [] }),
        store.append({ type: 'pattern', content: 'Concurrent B.', tags: [] }),
      ]);

      const all = await store.readAll();

      expect(all).toHaveLength(2);
      const contents = all.map((m) => m.content).sort();
      expect(contents).toEqual(['Concurrent A.', 'Concurrent B.']);
    });
  });

  describe('error paths', () => {
    it('readAll throws MemoryReadError when the file cannot be read', async () => {
      await store.ensureFile();
      await chmod(store.filePath, 0o000);
      try {
        await expect(store.readAll()).rejects.toBeInstanceOf(MemoryReadError);
      } finally {
        await chmod(store.filePath, 0o644);
      }
    });

    it('MemoryReadError is a subtype of MemoryStoreError', () => {
      const err = new MemoryReadError('/tmp/memories.md', new Error('EACCES'));
      expect(err).toBeInstanceOf(MemoryStoreError);
      expect(err.filePath).toBe('/tmp/memories.md');
      expect(err.name).toBe('MemoryReadError');
      expect(err.message).toContain('/tmp/memories.md');
    });

    it('ensureFile throws MemoryWriteError when parent path is occupied by a file', async () => {
      // Ensure tmpPath exists before writing the blocker file inside it
      await mkdir(tmpPath, { recursive: true });
      // Create a regular file where the parent directory should be
      const blockerPath = join(tmpPath, 'not-a-directory');
      await writeFile(blockerPath, 'I block directory creation');
      const badStore = new MarkdownMemoryStore(join(blockerPath, 'memories.md'));
      await expect(badStore.ensureFile()).rejects.toBeInstanceOf(MemoryWriteError);
    });

    it('MemoryWriteError is a subtype of MemoryStoreError', () => {
      const err = new MemoryWriteError('/tmp/memories.md', new Error('ENOSPC'));
      expect(err).toBeInstanceOf(MemoryStoreError);
      expect(err.filePath).toBe('/tmp/memories.md');
      expect(err.name).toBe('MemoryWriteError');
      expect(err.message).toContain('/tmp/memories.md');
    });

    it('MemoryLockError carries filePath and timeoutMs', () => {
      const cause = new Error('lock timed out');
      const err = new MemoryLockError('/tmp/memories.md', 5000, cause);
      expect(err).toBeInstanceOf(MemoryStoreError);
      expect(err.filePath).toBe('/tmp/memories.md');
      expect(err.timeoutMs).toBe(5000);
      expect(err.name).toBe('MemoryLockError');
      expect(err.cause).toBe(cause);
      expect(err.message).toContain('5000ms');
    });

    it('typed errors preserve the original cause', () => {
      const cause = new Error('underlying fs error');
      const err = new MemoryReadError('/tmp/memories.md', cause);
      expect(err.cause).toBe(cause);
    });
  });

  describe('writeAll', () => {
    it('overwrites all memories with the provided array', async () => {
      await store.append({ type: 'pattern', content: 'Old entry.', tags: [] });

      const replacement: Memory[] = [
        {
          id: 'w1',
          type: 'fix',
          content: 'New fix.',
          tags: ['bug'],
          created: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      await store.writeAll(replacement);

      const all = await store.readAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toMatchObject({ id: 'w1', type: 'fix', content: 'New fix.' });
    });

    it('clears all memories when given an empty array', async () => {
      await store.append({ type: 'context', content: 'To be cleared.', tags: [] });
      await store.writeAll([]);
      expect(await store.readAll()).toEqual([]);
    });

    it('creates the file when it does not yet exist', async () => {
      const memories: Memory[] = [
        {
          id: 'seed',
          type: 'decision',
          content: 'Seeded decision.',
          tags: ['arch'],
          created: new Date('2024-06-01T00:00:00Z'),
        },
      ];

      await store.writeAll(memories);

      const all = await store.readAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toMatchObject({ id: 'seed' });
    });
  });
});
