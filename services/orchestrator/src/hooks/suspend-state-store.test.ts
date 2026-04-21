/**
 * @packageDocumentation
 * Unit tests for SuspendStateStore — persist/recover/clear round-trip.
 */

import type { SuspendState } from './types.js';

import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SuspendStateStore } from './suspend-state-store.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid SuspendState fixture. */
function makeSuspendState(overrides: Partial<SuspendState> = {}): SuspendState {
  return {
    phase: 'pre.loop.start',
    hookName: 'test-hook',
    payload: {
      iteration: 1,
      hat: 'developer',
      events: [],
      metadata: {},
    },
    suspendMode: 'WaitForResume',
    suspendedAt: '2024-01-15T10:00:00.000Z',
    retryCount: 0,
    ...overrides,
  };
}

/**
 * Stubs `globalThis.Bun` so that `Bun.file`, `Bun.write` delegate to real
 * `node:fs/promises` operations — giving tests a real file-system without
 * needing a native Bun runtime.
 */
function stubBunWithRealFs(): void {
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
      json: async (): Promise<unknown> => {
        const content = await readFile(filePath, 'utf8');
        return JSON.parse(content) as unknown;
      },
    }),
    write: async (filePath: string, content: string): Promise<void> => {
      await writeFile(filePath, content, 'utf8');
    },
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SuspendStateStore', () => {
  let stateDir: string;
  let store: SuspendStateStore;

  beforeEach(async () => {
    stateDir = join(tmpdir(), `suspend-state-store-${randomUUID()}`);
    store = new SuspendStateStore(stateDir);
    stubBunWithRealFs();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(stateDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // persist
  // -------------------------------------------------------------------------

  describe('persist', () => {
    it('writes suspend-state.json to the state directory', async () => {
      await mkdir(stateDir, { recursive: true });
      const state = makeSuspendState();

      await store.persist(state);

      const filePath = join(stateDir, 'suspend-state.json');
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;

      expect(parsed).toEqual(state);
    });

    it('creates stateDir if it does not exist before writing', async () => {
      // stateDir has not been created yet.
      const state = makeSuspendState();

      await store.persist(state);

      const filePath = join(stateDir, 'suspend-state.json');
      await expect(access(filePath)).resolves.toBeUndefined();
    });

    it('creates nested stateDir (multiple missing levels)', async () => {
      const deepDir = join(stateDir, 'a', 'b', 'c');
      const deepStore = new SuspendStateStore(deepDir);
      const state = makeSuspendState();

      await deepStore.persist(state);

      const filePath = join(deepDir, 'suspend-state.json');
      await expect(access(filePath)).resolves.toBeUndefined();
    });

    it('serialises the state as pretty-printed JSON', async () => {
      await mkdir(stateDir, { recursive: true });
      const state = makeSuspendState({ retryCount: 3 });

      await store.persist(state);

      const raw = await readFile(join(stateDir, 'suspend-state.json'), 'utf8');
      // Pretty-printed JSON contains newlines and indentation.
      expect(raw).toContain('\n');
      expect(raw).toContain('  ');
    });

    it('overwrites an existing file on a second persist', async () => {
      await mkdir(stateDir, { recursive: true });
      const first = makeSuspendState({ hookName: 'first-hook' });
      const second = makeSuspendState({ hookName: 'second-hook' });

      await store.persist(first);
      await store.persist(second);

      const raw = await readFile(join(stateDir, 'suspend-state.json'), 'utf8');
      const parsed = JSON.parse(raw) as SuspendState;

      expect(parsed.hookName).toBe('second-hook');
    });
  });

  // -------------------------------------------------------------------------
  // recover
  // -------------------------------------------------------------------------

  describe('recover', () => {
    it('returns null when no suspend-state.json exists', async () => {
      await mkdir(stateDir, { recursive: true });

      await expect(store.recover()).resolves.toBeNull();
    });

    it('returns null when the state directory itself does not exist', async () => {
      // stateDir was never created.
      await expect(store.recover()).resolves.toBeNull();
    });

    it('returns the parsed SuspendState when the file exists', async () => {
      const state = makeSuspendState({ retryCount: 2, hookName: 'my-hook' });
      await store.persist(state);

      const recovered = await store.recover();

      expect(recovered).toEqual(state);
    });

    it('validates the recovered state with the Zod schema', async () => {
      await mkdir(stateDir, { recursive: true });
      // Write a valid state manually.
      const state = makeSuspendState();
      await writeFile(
        join(stateDir, 'suspend-state.json'),
        JSON.stringify(state),
        'utf8',
      );

      const recovered = await store.recover();

      expect(recovered).toMatchObject({
        phase: state.phase,
        hookName: state.hookName,
        suspendMode: state.suspendMode,
        retryCount: state.retryCount,
      });
    });

    it('throws a ZodError when the file exists but contains invalid data', async () => {
      await mkdir(stateDir, { recursive: true });
      // Missing required fields.
      await writeFile(
        join(stateDir, 'suspend-state.json'),
        JSON.stringify({ phase: 'not-a-valid-phase', hookName: '' }),
        'utf8',
      );

      await expect(store.recover()).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // clear
  // -------------------------------------------------------------------------

  describe('clear', () => {
    it('deletes suspend-state.json when it exists', async () => {
      const state = makeSuspendState();
      await store.persist(state);

      await store.clear();

      const filePath = join(stateDir, 'suspend-state.json');
      await expect(access(filePath)).rejects.toThrow();
    });

    it('is a no-op when suspend-state.json does not exist', async () => {
      await mkdir(stateDir, { recursive: true });

      // Should not throw.
      await expect(store.clear()).resolves.toBeUndefined();
    });

    it('is a no-op when the state directory does not exist', async () => {
      // stateDir was never created — should not throw.
      await expect(store.clear()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Round-trip
  // -------------------------------------------------------------------------

  describe('persist → recover → clear round-trip', () => {
    it('recover returns persisted state, clear removes it, second recover returns null', async () => {
      const state = makeSuspendState({
        phase: 'pre.iteration.start',
        hookName: 'round-trip-hook',
        suspendMode: 'RetryBackoff',
        retryCount: 5,
        suspendedAt: '2024-06-01T12:00:00.000Z',
      });

      // 1. Persist state.
      await store.persist(state);

      // 2. Recover — should return the exact same data.
      const recovered = await store.recover();
      expect(recovered).toEqual(state);

      // 3. Clear the state.
      await store.clear();

      // 4. Second recover — file is gone, should return null.
      const afterClear = await store.recover();
      expect(afterClear).toBeNull();
    });

    it('preserves all SuspendState fields across persist/recover', async () => {
      const state = makeSuspendState({
        phase: 'post.loop.error',
        hookName: 'full-fields-hook',
        payload: {
          iteration: 42,
          hat: 'analyst',
          events: [{ type: 'tick' }, { type: 'tock' }],
          metadata: { key: 'value', nested: { x: 1 } },
        },
        suspendMode: 'WaitThenRetry',
        suspendedAt: '2025-12-31T23:59:59.999Z',
        retryCount: 7,
      });

      await store.persist(state);
      const recovered = await store.recover();

      expect(recovered).toEqual(state);
    });
  });
});
