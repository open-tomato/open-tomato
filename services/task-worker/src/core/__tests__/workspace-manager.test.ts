import type { GitRunner } from '../workspace-manager.js';

import { describe, expect, it, vi } from 'vitest';

import { WorkspaceManager } from '../workspace-manager.js';

function createMockGitRunner(exitCode = 0, stderr = ''): GitRunner {
  return {
    run: vi.fn().mockResolvedValue({ exitCode, stderr }),
  };
}

describe('WorkspaceManager', () => {
  it('prepare creates a temp dir and runs git clone', async () => {
    const gitRunner = createMockGitRunner();
    const manager = new WorkspaceManager({ tmpPrefix: 'test-ws-' }, gitRunner);

    const workDir = await manager.prepare('feature/test');

    expect(workDir).toBeTruthy();
    expect(manager.workDir).toBe(workDir);
    expect(gitRunner.run).toHaveBeenCalledOnce();

    const args = (gitRunner.run as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string[];
    expect(args).toContain('git');
    expect(args).toContain('clone');
    expect(args).toContain('--branch');
    expect(args).toContain('feature/test');
    expect(args).toContain('--depth');
    expect(args).toContain('1');

    // Clean up
    await manager.clean();
  });

  it('prepare with repoUrl passes it to git clone', async () => {
    const gitRunner = createMockGitRunner();
    const manager = new WorkspaceManager({}, gitRunner);

    await manager.prepare('main', 'https://github.com/org/repo.git');

    const args = (gitRunner.run as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string[];
    expect(args).toContain('https://github.com/org/repo.git');

    await manager.clean();
  });

  it('prepare throws on git clone failure', async () => {
    const gitRunner = createMockGitRunner(128, 'fatal: repo not found');
    const manager = new WorkspaceManager({}, gitRunner);

    await expect(manager.prepare('main')).rejects.toThrow('git clone failed');
  });

  it('clean removes workspace and returns true', async () => {
    const gitRunner = createMockGitRunner();
    const manager = new WorkspaceManager({ tmpPrefix: 'test-clean-' }, gitRunner);

    await manager.prepare('main');
    expect(manager.workDir).toBeTruthy();

    const cleaned = await manager.clean();
    expect(cleaned).toBe(true);
    expect(manager.workDir).toBeNull();
  });

  it('clean returns false when no workspace active', async () => {
    const manager = new WorkspaceManager({}, createMockGitRunner());
    const cleaned = await manager.clean();
    expect(cleaned).toBe(false);
  });

  it('prepare cleans existing workspace before creating new one', async () => {
    const gitRunner = createMockGitRunner();
    const manager = new WorkspaceManager({ tmpPrefix: 'test-reuse-' }, gitRunner);

    const dir1 = await manager.prepare('branch-1');
    const dir2 = await manager.prepare('branch-2');

    expect(dir1).not.toBe(dir2);
    expect(manager.workDir).toBe(dir2);

    await manager.clean();
  });
});
