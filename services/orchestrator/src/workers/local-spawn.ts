/**
 * @packageDocumentation
 * Local spawn worker client — wraps `Bun.spawn` directly.
 *
 * This is the default worker client when `WORKER_MODE=local` (or unset).
 * It spawns `claude -p --dangerously-skip-permissions` as a local subprocess,
 * replicating the pre-refactoring behavior without requiring Docker.
 */

import type { WorkerClient, WorkerProcess } from './client.js';

import { execSync } from 'child_process';

/**
 * Worker client that spawns claude as a local subprocess via `Bun.spawn`.
 * Used for development without Docker containers.
 */
export class LocalSpawnWorkerClient implements WorkerClient {
  readonly workerId: string;
  private readonly repoPath: string;

  constructor(workerId: string, repoPath: string) {
    this.workerId = workerId;
    this.repoPath = repoPath;
  }

  async prepareWorkspace(branch: string): Promise<string> {
    execSync(`git -C ${this.repoPath} fetch origin`, { stdio: 'pipe' });
    execSync(`git -C ${this.repoPath} checkout ${branch}`, { stdio: 'pipe' });
    execSync(`git -C ${this.repoPath} pull origin ${branch}`, { stdio: 'pipe' });
    return this.repoPath;
  }

  async exec(prompt: string, workDir: string): Promise<WorkerProcess> {
    const proc = Bun.spawn(['claude', '-p', '--dangerously-skip-permissions'], {
      stdin: new TextEncoder().encode(prompt),
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: workDir,
    });

    return {
      stdout: proc.stdout,
      stderr: proc.stderr,
      exited: proc.exited,
      kill: () => proc.kill(),
    };
  }

  async cleanWorkspace(): Promise<void> {
    // No-op for local spawn — workspace is the developer's own checkout
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
