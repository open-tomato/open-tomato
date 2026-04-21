/**
 * Tests for the hyperloop command (scripts/ralph/hyperloop.ts).
 *
 * Mocks:
 *  - './utils/claude.js'   — runRalphStart, checkUsage
 *  - './utils/git.js'      — getRepoRoot, getMainCommitHash, checkoutBranch
 *  - './utils/prompt.js'   — checkForCheckoutConflict, waitForMerge
 *  - './utils/roadmap.js'  — loadState, saveState (spied so we can track writes)
 *  - 'fs'                  — existsSync
 *  - 'fetch'               — webhook (callPlanToBranch)
 *  - '@linear/sdk'         — LinearClient (fetchIssueIds)
 *  - '@open-tomato/linear/auth-node' — loadAccessToken
 */

import type { RoadmapState } from '../utils/roadmap.js';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs');
vi.mock('../utils/claude.js');
vi.mock('../utils/git.js');
vi.mock('../utils/prompt.js');
vi.mock('../utils/roadmap.js');
vi.mock('@linear/sdk');
vi.mock('@open-tomato/linear/auth-node');

// eslint-disable-next-line import/order -- imports are grouped by mock vs real, not by path
import * as fs from 'fs';

// eslint-disable-next-line import/order -- imports are grouped by mock vs real, not by path
import { loadAccessToken } from '@open-tomato/linear/auth-node';

import * as claudeUtils from '../utils/claude.js';
import * as gitUtils from '../utils/git.js';
import * as promptUtils from '../utils/prompt.js';
import * as roadmapUtils from '../utils/roadmap.js';

// eslint-disable-next-line import/order -- imports are grouped by mock vs real, not by path
import { LinearClient } from '@linear/sdk';

const mockFs = vi.mocked(fs);
const mockRunRalphStart = vi.mocked(claudeUtils.runRalphStart);
const mockCheckUsage = vi.mocked(claudeUtils.checkUsage);
const mockGetRepoRoot = vi.mocked(gitUtils.getRepoRoot);
const mockGetMainCommitHash = vi.mocked(gitUtils.getMainCommitHash);
const mockCheckoutBranch = vi.mocked(gitUtils.checkoutBranch);
const mockCheckForCheckoutConflict = vi.mocked(promptUtils.checkForCheckoutConflict);
const mockWaitForMerge = vi.mocked(promptUtils.waitForMerge);
const mockLoadState = vi.mocked(roadmapUtils.loadState);
const mockSaveState = vi.mocked(roadmapUtils.saveState);
const mockLoadAccessToken = vi.mocked(loadAccessToken);

const REPO_ROOT = '/repo';
// const ROADMAP_PATH = '/repo/.tmp/current-roadmap.json';
const CLI_PATH = '/repo/scripts/cli.ts';

// Returns a saved state from the most recent saveState call
function lastSavedState(): RoadmapState | undefined {
  const calls = mockSaveState.mock.calls;
  return calls[calls.length - 1]?.[1];
}

function makeState(overrides: Partial<RoadmapState> = {}): RoadmapState {
  return {
    issues: [
      { identifier: 'OPT-1', issueId: 'id-1', status: 'pending', branch: 'feature/OPT-1' },
      { identifier: 'OPT-2', issueId: 'id-2', status: 'pending', branch: 'feature/OPT-2' },
    ],
    currentIndex: 0,
    ...overrides,
  };
}

function setupWebhookSuccess(branch = 'feature/OPT-1') {
  global.fetch = vi.fn().mockResolvedValue({
    text: () => Promise.resolve(JSON.stringify([{ status: 'PLAN_CREATED', branch }])),
  });
}

function setupLinear(map: Record<string, string> = { 'OPT-1': 'id-1', 'OPT-2': 'id-2' }) {
  const mockIssues = Object.entries(map).map(([identifier, id]) => ({ identifier, id }));
  const mockClient = {
    issues: vi.fn().mockResolvedValue({ nodes: mockIssues }),
  };
  vi.mocked(LinearClient).mockImplementation(() => mockClient as unknown as LinearClient);
  mockLoadAccessToken.mockResolvedValue('fake-token');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRepoRoot.mockReturnValue(REPO_ROOT);
  mockGetMainCommitHash.mockReturnValue('abc123');
  mockCheckoutBranch.mockImplementation(() => undefined);
  mockCheckUsage.mockResolvedValue(false);
  mockRunRalphStart.mockResolvedValue(0);
  mockCheckForCheckoutConflict.mockResolvedValue(false);
  mockWaitForMerge.mockResolvedValue(undefined);
  mockFs.existsSync = vi.fn(() => true) as typeof fs.existsSync;
  setupWebhookSuccess();
  setupLinear();
});

async function runHyperloop(args: string[] = []) {
  const mod = await import('../hyperloop.js?t=' + Date.now());
  return mod.default(args);
}

// ─── Resume logic ─────────────────────────────────────────────────────────────

describe('resume logic (no --roadmap flag)', () => {
  it('exits when no roadmap file exists', async () => {
    mockFs.existsSync = vi.fn(() => false) as typeof fs.existsSync;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

    await expect(runHyperloop()).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('resumes from the first blocked issue', async () => {
    const state = makeState({
      issues: [
        { identifier: 'OPT-1', issueId: 'id-1', status: 'done', branch: 'feature/OPT-1' },
        { identifier: 'OPT-2', issueId: 'id-2', status: 'blocked', branch: 'feature/OPT-2' },
      ],
      currentIndex: 0,
    });
    mockLoadState.mockReturnValue(state);

    await runHyperloop();

    // blocked → pending before re-running
    const firstSave = mockSaveState.mock.calls[0]?.[1];
    expect(firstSave?.issues[1]?.status).toBe('pending');
    expect(firstSave?.currentIndex).toBe(1);
  });

  it('resumes from the first pending issue when nothing is blocked', async () => {
    const state = makeState({
      issues: [
        { identifier: 'OPT-1', issueId: 'id-1', status: 'done', branch: 'feature/OPT-1' },
        { identifier: 'OPT-2', issueId: 'id-2', status: 'pending', branch: 'feature/OPT-2' },
      ],
      currentIndex: 0,
    });
    mockLoadState.mockReturnValue(state);

    await runHyperloop();

    const firstSave = mockSaveState.mock.calls[0]?.[1];
    expect(firstSave?.currentIndex).toBe(1);
  });

  it('returns early when all issues are done', async () => {
    mockLoadState.mockReturnValue(
      makeState({
        issues: [
          { identifier: 'OPT-1', issueId: 'id-1', status: 'done', branch: 'feature/OPT-1' },
        ],
        currentIndex: 0,
      }),
    );

    await runHyperloop();

    expect(mockRunRalphStart).not.toHaveBeenCalled();
  });
});

// ─── Fresh run (--roadmap flag) ───────────────────────────────────────────────

describe('fresh run (--roadmap flag)', () => {
  it('exits when --roadmap has no identifiers', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(runHyperloop(['--roadmap='])).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('exits when a Linear ID cannot be resolved', async () => {
    setupLinear({}); // no IDs resolved
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(runHyperloop(['--roadmap=OPT-1'])).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('saves initial state from resolved identifiers', async () => {
    setupLinear({ 'OPT-1': 'id-1' });
    mockRunRalphStart.mockResolvedValue(0);

    await runHyperloop(['--roadmap=OPT-1']);

    const firstSave = mockSaveState.mock.calls[0]?.[1];
    expect(firstSave?.issues).toHaveLength(1);
    expect(firstSave?.issues[0]?.identifier).toBe('OPT-1');
    expect(firstSave?.issues[0]?.status).toBe('pending');
  });

  it('parses comma-separated identifiers from --roadmap', async () => {
    setupLinear({ 'OPT-1': 'id-1', 'OPT-2': 'id-2' });

    await runHyperloop(['--roadmap=OPT-1,OPT-2']);

    const firstSave = mockSaveState.mock.calls[0]?.[1];
    expect(firstSave?.issues).toHaveLength(2);
  });
});

// ─── Issue lifecycle ──────────────────────────────────────────────────────────

describe('issue lifecycle', () => {
  it('marks issue done after successful ralph run', async () => {
    mockLoadState.mockReturnValue(makeState());
    mockRunRalphStart.mockResolvedValue(0);

    await runHyperloop();

    const finalState = lastSavedState();
    expect(finalState?.issues[0]?.status).toBe('done');
  });

  it('marks issue blocked when ralph exits non-zero', async () => {
    mockLoadState.mockReturnValue(makeState());
    mockRunRalphStart.mockResolvedValue(1);

    await expect(runHyperloop()).rejects.toThrow();
    expect(lastSavedState()?.issues[0]?.status).toBe('blocked');
  });

  it('marks issue blocked when checkout conflict is aborted', async () => {
    mockLoadState.mockReturnValue(makeState());
    mockCheckForCheckoutConflict.mockResolvedValue(true);

    await runHyperloop();

    const saved = mockSaveState.mock.calls.find((c) => c[1].issues[0]?.status === 'blocked');
    expect(saved).toBeDefined();
    expect(mockRunRalphStart).not.toHaveBeenCalled();
  });

  it('skips already-done issues and advances index', async () => {
    mockLoadState.mockReturnValue(
      makeState({
        issues: [
          { identifier: 'OPT-1', issueId: 'id-1', status: 'done', branch: 'feature/OPT-1' },
          { identifier: 'OPT-2', issueId: 'id-2', status: 'pending', branch: 'feature/OPT-2' },
        ],
        currentIndex: 0,
      }),
    );

    await runHyperloop();

    expect(mockRunRalphStart).toHaveBeenCalledOnce();
    // The first issue processed should be OPT-2, not OPT-1
    expect(mockRunRalphStart).toHaveBeenCalledWith(CLI_PATH);
  });

  it('calls waitForMerge between non-last issues', async () => {
    mockLoadState.mockReturnValue(makeState());
    setupWebhookSuccess('feature/OPT-1');
    // Make saveState feed back updated state for second iteration
    let savedState = makeState();
    mockSaveState.mockImplementation((_path, state) => {
      savedState = state;
    });
    mockLoadState.mockImplementation(() => savedState);

    await runHyperloop();

    expect(mockWaitForMerge).toHaveBeenCalledWith('OPT-1', expect.any(String));
  });

  it('does not call waitForMerge after the last issue', async () => {
    mockLoadState.mockReturnValue(
      makeState({
        issues: [{ identifier: 'OPT-1', issueId: 'id-1', status: 'pending', branch: 'feature/OPT-1' }],
        currentIndex: 0,
      }),
    );

    await runHyperloop();

    expect(mockWaitForMerge).not.toHaveBeenCalled();
  });
});

// ─── Branch creation ──────────────────────────────────────────────────────────

describe('branch creation', () => {
  it('calls callPlanToBranch and checkouts branch when no branch exists yet', async () => {
    mockLoadState.mockReturnValue(
      makeState({
        issues: [{ identifier: 'OPT-1', issueId: 'id-1', status: 'pending' }],
        currentIndex: 0,
      }),
    );
    setupWebhookSuccess('feature/OPT-new');

    await runHyperloop();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('plan-to-branch'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockCheckoutBranch).toHaveBeenCalledWith('feature/OPT-new');
  });

  it('does not call webhook or checkout when branch already exists', async () => {
    mockLoadState.mockReturnValue(
      makeState({
        issues: [{ identifier: 'OPT-1', issueId: 'id-1', status: 'pending', branch: 'feature/OPT-1' }],
        currentIndex: 0,
      }),
    );

    await runHyperloop();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockCheckoutBranch).not.toHaveBeenCalled();
  });

  it('marks issue blocked when webhook returns unexpected status', async () => {
    mockLoadState.mockReturnValue(
      makeState({
        issues: [{ identifier: 'OPT-1', issueId: 'id-1', status: 'pending' }],
        currentIndex: 0,
      }),
    );
    global.fetch = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify([{ status: 'ERROR' }])),
    });

    await expect(runHyperloop()).rejects.toThrow();
    expect(lastSavedState()?.issues[0]?.status).toBe('blocked');
  });
});
