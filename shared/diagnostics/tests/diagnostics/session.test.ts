import { mkdtemp, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';

import { initSessionDir, rotateSessions } from '../../src/diagnostics/session.js';

describe('initSessionDir', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'session-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates a session subdirectory inside baseDir', async () => {
    const sessionDir = await initSessionDir(tmpDir);

    const entries = await readdir(tmpDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory());
    expect(dirs).toHaveLength(1);
    expect(sessionDir).toContain('session-');
  });

  it('returns the path to the created directory', async () => {
    const sessionDir = await initSessionDir(tmpDir);

    const entries = await readdir(tmpDir);
    expect(entries).toContain(sessionDir.split('/').at(-1));
  });

  it('creates baseDir recursively if it does not exist', async () => {
    const nestedBase = join(tmpDir, 'a', 'b', 'c');
    const sessionDir = await initSessionDir(nestedBase);

    expect(sessionDir).toContain('session-');
    const entries = await readdir(nestedBase);
    expect(entries.some(e => e.startsWith('session-'))).toBe(true);
  });
});

describe('rotateSessions', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rotate-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function createSessions(names: string[]): Promise<void> {
    await Promise.all(
      names.map(name => mkdir(join(tmpDir, name), { recursive: true })),
    );
  }

  async function sessionNames(): Promise<string[]> {
    const entries = await readdir(tmpDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && e.name.startsWith('session-'))
      .map(e => e.name)
      .sort();
  }

  it('does not remove directories when count is under the keep limit', async () => {
    await createSessions(['session-a', 'session-b', 'session-c']);
    await rotateSessions(tmpDir, 5);

    expect(await sessionNames()).toHaveLength(3);
  });

  it('does not remove directories when count equals the keep limit', async () => {
    await createSessions(['session-a', 'session-b', 'session-c', 'session-d', 'session-e']);
    await rotateSessions(tmpDir, 5);

    expect(await sessionNames()).toHaveLength(5);
  });

  it('removes oldest directories when count exceeds the keep limit', async () => {
    await createSessions([
      'session-2026-01-01',
      'session-2026-01-02',
      'session-2026-01-03',
      'session-2026-01-04',
      'session-2026-01-05',
      'session-2026-01-06',
    ]);
    await rotateSessions(tmpDir, 5);

    const remaining = await sessionNames();
    expect(remaining).toHaveLength(5);
    expect(remaining).not.toContain('session-2026-01-01');
    expect(remaining).toContain('session-2026-01-06');
  });

  it('removes multiple oldest when more than one exceeds limit', async () => {
    await createSessions([
      'session-2026-01-01',
      'session-2026-01-02',
      'session-2026-01-03',
      'session-2026-01-04',
      'session-2026-01-05',
      'session-2026-01-06',
      'session-2026-01-07',
    ]);
    await rotateSessions(tmpDir, 5);

    const remaining = await sessionNames();
    expect(remaining).toHaveLength(5);
    expect(remaining).not.toContain('session-2026-01-01');
    expect(remaining).not.toContain('session-2026-01-02');
    expect(remaining).toContain('session-2026-01-07');
  });

  it('ignores non-session directories', async () => {
    await createSessions(['session-a', 'session-b']);
    await mkdir(join(tmpDir, 'other-dir'));
    await rotateSessions(tmpDir, 1);

    const remaining = await sessionNames();
    expect(remaining).toHaveLength(1);
    // other-dir should still be present
    const all = await readdir(tmpDir);
    expect(all).toContain('other-dir');
  });
});
