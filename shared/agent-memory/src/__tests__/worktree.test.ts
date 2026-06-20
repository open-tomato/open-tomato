import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveMemoryFilePath } from '../worktree.js';

describe('resolveMemoryFilePath', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `agent-memory-worktree-${crypto.randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns the same path when given a real file (no symlink)', () => {
    const realFile = join(tmpDir, 'memories.md');
    writeFileSync(realFile, '');

    const resolved = resolveMemoryFilePath(realFile);

    // realpathSync resolves the OS-level symlinks too (e.g. /var → /private/var on macOS)
    expect(resolved).toBe(realpathSync(realFile));
  });

  it('returns the real path when given a symlink path', () => {
    const realDir = join(tmpDir, 'real');
    mkdirSync(realDir);
    const realFile = join(realDir, 'memories.md');
    writeFileSync(realFile, '');

    const symlinkDir = join(tmpDir, 'worktree');
    mkdirSync(symlinkDir);
    const symlinkFile = join(symlinkDir, 'memories.md');
    symlinkSync(realFile, symlinkFile);

    const resolved = resolveMemoryFilePath(symlinkFile);

    expect(resolved).toBe(realpathSync(realFile));
    expect(resolved).not.toBe(symlinkFile);
  });

  it('throws when the path does not exist', () => {
    const nonExistent = join(tmpDir, 'does-not-exist.md');

    expect(() => resolveMemoryFilePath(nonExistent)).toThrow();
  });
});
