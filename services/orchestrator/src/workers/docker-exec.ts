/**
 * @packageDocumentation
 * Docker exec worker client — runs claude inside a pre-started Docker container.
 *
 * Uses `docker exec -i` to invoke claude inside the container. The workspace
 * is a host-side temporary directory bind-mounted into the container at
 * `/workspace`.
 *
 * See `REFACTORING.md` Scenario A for full details.
 */

import type { WorkerClient, WorkerProcess } from './client.js';

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Worker client that executes claude inside a Docker container via `docker exec`.
 *
 * Containers must be pre-started with a bind mount of a host temp directory
 * to `/workspace` inside the container, and `ANTHROPIC_API_KEY` injected
 * at container start time.
 */
export class DockerExecWorkerClient implements WorkerClient {
  readonly workerId: string;
  private readonly containerId: string;
  private tmpDir: string | null = null;

  constructor(workerId: string, containerId: string) {
    this.workerId = workerId;
    this.containerId = containerId;
  }

  async prepareWorkspace(branch: string): Promise<string> {
    // Create a host-side temp directory for this job
    this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `executor-${this.workerId}-`));

    // Clone the repo into the temp directory
    // The repo URL should be configured; for now we use the branch from git
    execSync(
      `git clone --branch ${branch} --single-branch --depth 1 . ${this.tmpDir}`,
      { stdio: 'pipe' },
    );

    // The bind mount maps this.tmpDir → /workspace inside the container
    return '/workspace';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async exec(prompt: string, _workDir: string): Promise<WorkerProcess> {
    const proc = Bun.spawn(
      ['docker', 'exec', '-i', this.containerId, 'claude', '-p', '--dangerously-skip-permissions'],
      {
        stdin: new TextEncoder().encode(prompt),
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );

    return {
      stdout: proc.stdout,
      stderr: proc.stderr,
      exited: proc.exited,
      kill: () => {
        // Kill the docker exec process; the container itself stays running
        proc.kill();
      },
    };
  }

  async cleanWorkspace(): Promise<void> {
    if (this.tmpDir && fs.existsSync(this.tmpDir)) {
      fs.rmSync(this.tmpDir, { recursive: true, force: true });
      this.tmpDir = null;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = execSync(
        `docker inspect --format='{{.State.Running}}' ${this.containerId}`,
        { stdio: 'pipe', encoding: 'utf8' },
      );
      return result.trim() === 'true';
    } catch {
      return false;
    }
  }
}
