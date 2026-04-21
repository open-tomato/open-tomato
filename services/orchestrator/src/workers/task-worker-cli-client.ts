/**
 * CLI worker client for local-mode task-worker instances.
 *
 * Implements `WorkerClient` by spawning the task-worker CLI (`cli.ts`)
 * as a subprocess. Each invocation runs in an isolated temp directory
 * to avoid branch conflicts and instinct contamination between
 * concurrent workers.
 *
 * Used when `RUN_MODE=local` (new path). The deprecated
 * `FallbackChainWorkerClient` is used when `WORKER_MODE=local`.
 *
 * Security note: All subprocess spawning uses array-based `Bun.spawn`
 * (no shell interpolation). The `buildCliCommand` helper from
 * `@open-tomato/worker-protocol` produces a string array that is
 * passed directly to the process spawner.
 */

import type { ExecOptions, WorkerClient, WorkerProcess } from './client.js';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildCliCommand } from '@open-tomato/worker-protocol';

import { ndjsonToWorkerProcess } from './ndjson-to-worker-process.js';

// ---------------------------------------------------------------------------
// Subprocess abstraction
// ---------------------------------------------------------------------------

export interface CliSpawner {
  spawn(
    command: string[],
    options: { cwd?: string },
  ): {
    stdout: ReadableStream<Uint8Array>;
    stderr: ReadableStream<Uint8Array>;
    exited: Promise<number>;
    kill(): void;
  };
}

const defaultCliSpawner: CliSpawner = {
  spawn(command, options) {
    const proc = Bun.spawn(command, {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: options.cwd,
    });
    return {
      stdout: proc.stdout,
      stderr: proc.stderr,
      exited: proc.exited,
      kill: () => proc.kill(),
    };
  },
};

// ---------------------------------------------------------------------------
// TaskWorkerCliClient
// ---------------------------------------------------------------------------

export class TaskWorkerCliClient implements WorkerClient {
  readonly workerId: string;
  private readonly cliPath: string;
  private readonly defaultModel: string;
  private readonly spawner: CliSpawner;
  private tmpDir: string | null = null;

  /**
   * @param workerId - Unique identifier for this worker instance.
   * @param cliPath - Absolute path to the task-worker `cli.ts` file.
   * @param defaultModel - Model preset name to use when none is specified.
   * @param spawner - Injectable subprocess spawner (for testing).
   */
  constructor(
    workerId: string,
    cliPath: string,
    defaultModel: string,
    spawner: CliSpawner = defaultCliSpawner,
  ) {
    this.workerId = workerId;
    this.cliPath = cliPath;
    this.defaultModel = defaultModel;
    this.spawner = spawner;
  }

  async prepareWorkspace(branch: string): Promise<string> {
    // Create an isolated temp directory for this worker
    this.tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `tw-${this.workerId}-`),
    );

    const cmd = buildCliCommand(this.cliPath, 'workspace-prepare', {
      branch,
      dir: this.tmpDir,
    });

    const proc = this.spawner.spawn(cmd, {});
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(
        `TaskWorkerCliClient.prepareWorkspace failed (exit ${exitCode}): ${stderr}`,
      );
    }

    // Parse the JSON output to get the actual workDir
    const stdout = await new Response(proc.stdout).text();
    try {
      const result = JSON.parse(stdout.trim()) as { workDir: string };
      this.tmpDir = result.workDir;
      return result.workDir;
    } catch {
      // Fall back to the tmpDir we created
      return this.tmpDir;
    }
  }

  /**
   * Runs a single Claude invocation via the task-worker CLI.
   * The CLI writes NDJSON events to stdout which are converted to a
   * WorkerProcess via `ndjsonToWorkerProcess`.
   */
  async run(
    prompt: string,
    workDir: string,
    options?: ExecOptions,
  ): Promise<WorkerProcess> {
    const model = (options?.backendOverride && typeof options.backendOverride === 'string')
      ? options.backendOverride
      : this.defaultModel;

    const cmd = buildCliCommand(this.cliPath, 'exec', {
      prompt,
      'work-dir': workDir,
      model,
    });

    const proc = this.spawner.spawn(cmd, { cwd: workDir });

    return ndjsonToWorkerProcess(proc.stdout, () => proc.kill());
  }

  // WorkerClient interface requires `exec` — delegate to `run`
  exec(
    prompt: string,
    workDir: string,
    options?: ExecOptions,
  ): Promise<WorkerProcess> {
    return this.run(prompt, workDir, options);
  }

  async cleanWorkspace(): Promise<void> {
    if (!this.tmpDir) return;

    const dir = this.tmpDir;
    this.tmpDir = null;

    // Flush instincts before cleaning
    try {
      const flushCmd = buildCliCommand(this.cliPath, 'instinct-flush', {
        dir,
      });
      const flushProc = this.spawner.spawn(flushCmd, {});
      await flushProc.exited;
    } catch {
      // Instinct flush failure is non-fatal
    }

    // Clean workspace
    try {
      const cleanCmd = buildCliCommand(this.cliPath, 'workspace-clean', {
        dir,
      });
      const cleanProc = this.spawner.spawn(cleanCmd, {});
      await cleanProc.exited;
    } catch {
      // Fall back to direct cleanup
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  }

  async isHealthy(): Promise<boolean> {
    // Local CLI is always available
    return true;
  }
}
