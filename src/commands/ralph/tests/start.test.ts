// eslint-disable -- import/order imports are grouped by mock vs real, not by path

/**
 * Tests for the ralph start loop (scripts/ralph/start.ts).
 *
 * Mocks:
 *  - 'fs'                     — no real disk I/O
 *  - './utils/claude.js'      — no real Claude subprocess
 *  - './utils/git.js'         — no real git invocations
 *  - './utils/tracker.js'     — tracker helpers (findNextTask, updateTrackerLine)
 *
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Loop behaviour tests ──────────────────────────────────────────────────────

vi.mock('fs');
vi.mock('../utils/claude.js');
vi.mock('../utils/git.js');
vi.mock('../utils/tracker.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils/tracker.js')>();
  return { ...original, updateTrackerLine: vi.fn() };
});

// eslint-disable-next-line import/order -- imports are grouped by mock vs real, not by path
import fs from 'fs';

import * as claudeUtils from '../utils/claude.js';
import * as gitUtils from '../utils/git.js';
import * as trackerUtils from '../utils/tracker.js';

const mockFs = vi.mocked(fs);
const mockRunClaude = vi.mocked(claudeUtils.runClaude);
const mockCheckUsage = vi.mocked(claudeUtils.checkUsage);
const mockGetRepoRoot = vi.mocked(gitUtils.getRepoRoot);
const mockGetCurrentBranch = vi.mocked(gitUtils.getCurrentBranch);
const mockUpdateTrackerLine = vi.mocked(trackerUtils.updateTrackerLine);
const mockFindNextTask = vi.mocked(trackerUtils.findNextTask);

const PLAN_PATH = '/repo/PLAN.md';
const TRACKER_PATH = '/repo/PLAN_TRACKER.md';
const PLAN_CONTENT = '# Plan\n- [ ] Task one\n';
const PROMPT_CONTENT = 'Do good work.\n';

function setupDefaults() {
  mockGetRepoRoot.mockReturnValue('/repo');
  mockGetCurrentBranch.mockReturnValue('feature/test');
  mockCheckUsage.mockResolvedValue(false);
  mockRunClaude.mockResolvedValue(0);

  mockFs.existsSync = vi.fn((p: unknown) => {
    if (p === PLAN_PATH) return true;
    if (p === TRACKER_PATH) return true;
    return false;
  }) as typeof fs.existsSync;

  mockFs.readFileSync = vi.fn((p: unknown) => {
    if (p === PLAN_PATH || p === TRACKER_PATH) return PLAN_CONTENT;
    if (String(p).endsWith('PROMPT.md')) return PROMPT_CONTENT;
    return '';
  }) as typeof fs.readFileSync;

  mockFs.copyFileSync = vi.fn() as typeof fs.copyFileSync;
  mockFs.writeFileSync = vi.fn() as typeof fs.writeFileSync;

  // Default: one task then done
  mockFindNextTask
    .mockReturnValueOnce({ task: 'Task one', lineNum: 1, status: 'unchecked' })
    .mockReturnValueOnce(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaults();
});

async function runStart(args: string[] = []) {
  // Re-import each time so module-level state (interrupted) resets
  const mod = await import('../start.js?t=' + Date.now());
  return mod.default(args);
}

describe('start() — file checks', () => {
  it('exits when plan file is missing', async () => {
    mockFs.existsSync = vi.fn(() => false) as typeof fs.existsSync;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });

    await expect(runStart()).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('copies plan to tracker when tracker does not exist', async () => {
    mockFs.existsSync = vi.fn((p: unknown) => {
      if (p === PLAN_PATH) return true;
      if (p === TRACKER_PATH) return false;
      if (String(p).endsWith('PROMPT.md')) return false;
      return false;
    }) as typeof fs.existsSync;

    await runStart();
    expect(mockFs.copyFileSync).toHaveBeenCalledWith(PLAN_PATH, TRACKER_PATH);
  });

  it('does not copy plan when tracker already exists', async () => {
    await runStart();
    expect(mockFs.copyFileSync).not.toHaveBeenCalled();
  });
});

describe('start() — task loop', () => {
  it('marks task done on successful claude run', async () => {
    mockRunClaude.mockResolvedValue(0);
    await runStart();
    expect(mockUpdateTrackerLine).toHaveBeenCalledWith(TRACKER_PATH, 1, 'done');
  });

  it('marks task blocked and returns when claude exits non-zero', async () => {
    mockRunClaude.mockResolvedValue(1);
    await runStart();
    expect(mockUpdateTrackerLine).toHaveBeenCalledWith(TRACKER_PATH, 1, 'blocked');
    // Should stop after first failure — updateTrackerLine called exactly once
    expect(mockUpdateTrackerLine).toHaveBeenCalledTimes(1);
  });

  it('processes multiple tasks in sequence', async () => {
    mockFindNextTask
      .mockReset()
      .mockReturnValueOnce({ task: 'Task A', lineNum: 1, status: 'unchecked' })
      .mockReturnValueOnce({ task: 'Task B', lineNum: 2, status: 'unchecked' })
      .mockReturnValueOnce(null);

    await runStart();

    expect(mockUpdateTrackerLine).toHaveBeenCalledTimes(2);
    expect(mockUpdateTrackerLine).toHaveBeenNthCalledWith(1, TRACKER_PATH, 1, 'done');
    expect(mockUpdateTrackerLine).toHaveBeenNthCalledWith(2, TRACKER_PATH, 2, 'done');
  });

  it('pauses the loop when checkUsage returns true', async () => {
    mockFindNextTask
      .mockReset()
      .mockReturnValueOnce({ task: 'Task A', lineNum: 1, status: 'unchecked' })
      .mockReturnValueOnce({ task: 'Task B', lineNum: 2, status: 'unchecked' });
    mockCheckUsage.mockResolvedValue(true);

    await runStart();

    // Only Task A should have been processed before the pause
    expect(mockUpdateTrackerLine).toHaveBeenCalledTimes(1);
    expect(mockUpdateTrackerLine).toHaveBeenCalledWith(TRACKER_PATH, 1, 'done');
  });

  it('resumes a blocked task (passes prompt with blocked task)', async () => {
    mockFindNextTask
      .mockReset()
      .mockReturnValueOnce({ task: 'Blocked task', lineNum: 2, status: 'blocked' })
      .mockReturnValueOnce(null);

    await runStart();

    expect(mockRunClaude).toHaveBeenCalledOnce();
    const prompt = mockRunClaude.mock.calls[0]?.[0] ?? '';
    expect(prompt).toContain('Blocked task');
  });

  it('invokes runClaude with a prompt containing plan and task content', async () => {
    await runStart();

    const prompt = mockRunClaude.mock.calls[0]?.[0] ?? '';
    expect(prompt).toContain('Task one');
    expect(prompt).toContain(PLAN_CONTENT);
    expect(prompt).toContain(PROMPT_CONTENT);
  });
});
