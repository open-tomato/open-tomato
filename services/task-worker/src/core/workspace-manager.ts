/**
 * Workspace lifecycle management.
 *
 * Creates isolated temporary directories for each job, clones the repo
 * into them, and cleans up after the job completes. Uses array-based
 * spawn (not shell strings) to prevent command injection.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceManagerOptions {
  /** Prefix for temp directory names. Defaults to `'task-worker-'`. */
  readonly tmpPrefix?: string;
}

/**
 * Minimal interface for running git commands. Production uses `Bun.spawn`;
 * tests inject a stub.
 */
export interface GitRunner {
  run(command: string[]): Promise<{ exitCode: number; stderr: string }>;
}

const defaultGitRunner: GitRunner = {
  async run(command) {
    const proc = Bun.spawn(command, {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stderrBytes = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    return { exitCode, stderr: stderrBytes };
  },
};

// ---------------------------------------------------------------------------
// WorkspaceManager
// ---------------------------------------------------------------------------

export class WorkspaceManager {
  private readonly tmpPrefix: string;
  private readonly gitRunner: GitRunner;
  private currentDir: string | null = null;

  constructor(
    options: WorkspaceManagerOptions = {},
    gitRunner: GitRunner = defaultGitRunner,
  ) {
    this.tmpPrefix = options.tmpPrefix ?? 'task-worker-';
    this.gitRunner = gitRunner;
  }

  /** Returns the current workspace path, or null if no workspace is active. */
  get workDir(): string | null {
    return this.currentDir;
  }

  /**
   * Prepares a workspace by creating a temp directory and cloning the repo.
   *
   * @param branch - Git branch to check out.
   * @param repoUrl - Remote repo URL. If omitted, clones from cwd.
   * @returns Absolute path to the cloned workspace.
   */
  async prepare(branch: string, repoUrl?: string): Promise<string> {
    // Clean up any existing workspace first
    await this.clean();

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), this.tmpPrefix));
    const source = repoUrl ?? '.';

    const { exitCode, stderr } = await this.gitRunner.run([
      'git', 'clone',
      '--branch', branch,
      '--single-branch',
      '--depth', '1',
      source,
      tmpDir,
    ]);

    if (exitCode !== 0) {
      // Clean up the empty temp dir on failure
      fs.rmSync(tmpDir, { recursive: true, force: true });
      throw new Error(`git clone failed (exit ${exitCode}): ${stderr.trim()}`);
    }

    this.currentDir = tmpDir;
    return tmpDir;
  }

  /**
   * Removes the current workspace directory and resets state.
   * No-op if no workspace is active. Tolerates already-deleted directories.
   */
  async clean(): Promise<boolean> {
    if (!this.currentDir) return false;

    const dir = this.currentDir;
    this.currentDir = null;

    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      return true;
    } catch {
      // Tolerate cleanup failures (directory may already be gone)
      return false;
    }
  }
}
