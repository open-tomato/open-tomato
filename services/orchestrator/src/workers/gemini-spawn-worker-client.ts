/**
 * Gemini CLI spawn worker client.
 *
 * Implements `WorkerClient` for the Gemini CLI, spawning `gemini` as a local
 * subprocess. Unlike the `FallbackChainWorkerClient` which wraps multiple
 * backends behind a fallback loop, this client targets a single Gemini
 * backend and exposes the same `WorkerClient` interface for direct use.
 *
 * OQ-4 (resolved): Empirically validated via `npx @google/gemini-cli --help`
 * (v0.35.3). The Gemini CLI `-y`/`--yolo` flag is documented as "Automatically
 * accept all actions (aka YOLO mode)" and is functionally equivalent to
 * Claude's `--dangerously-skip-permissions` — both auto-approve all
 * tool/action executions without user confirmation. An alternative form is
 * `--approval-mode yolo`. The default descriptor now includes `--yolo`.
 *
 * Additional finding: Gemini CLI also supports `--output-format stream-json`,
 * so the descriptor's `outputFormat` can be upgraded from `'text'` to
 * `'stream-json'` once a Gemini stream-json parser is implemented.
 */

import type { BackendDescriptor } from './backend-descriptor.js';
import type { WorkerClient, WorkerProcess } from './client.js';
import type { ProcessSpawner } from './fallback-chain-worker-client.js';

import process from 'node:process';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildGeminiArgs(
  descriptor: BackendDescriptor,
  prompt: string,
): { args: readonly string[]; stdin?: Uint8Array } {
  switch (descriptor.promptMode) {
    case 'flag':
      return { args: [...descriptor.args, '-p', prompt] };
    case 'stdin':
      return {
        args: [...descriptor.args],
        stdin: new TextEncoder().encode(prompt),
      };
    case 'positional':
      return { args: [...descriptor.args, prompt] };
  }
}

// ---------------------------------------------------------------------------
// Default spawner
// ---------------------------------------------------------------------------

const defaultSpawner: ProcessSpawner = {
  spawn(command, args, options) {
    const proc = Bun.spawn([command, ...args], {
      stdin: options.stdin,
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
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
// GeminiSpawnWorkerClient
// ---------------------------------------------------------------------------

/**
 * Single-backend worker client targeting the Gemini CLI.
 *
 * Spawns `gemini` as a local subprocess per invocation, forwarding the
 * prompt via the configured {@link BackendDescriptor.promptMode}. Unlike
 * {@link FallbackChainWorkerClient}, this client does not implement
 * fallback logic — it targets one backend directly.
 */
export class GeminiSpawnWorkerClient implements WorkerClient {
  readonly workerId: string;
  private readonly descriptor: BackendDescriptor;
  private readonly envOverrides: Readonly<Record<string, string>>;
  private readonly spawner: ProcessSpawner;
  private readonly repoPath: string;

  constructor(
    workerId: string,
    repoPath: string,
    descriptor: BackendDescriptor,
    envOverrides: Readonly<Record<string, string>> = {},
    spawner: ProcessSpawner = defaultSpawner,
  ) {
    this.workerId = workerId;
    this.repoPath = repoPath;
    this.descriptor = descriptor;
    this.envOverrides = envOverrides;
    this.spawner = spawner;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async prepareWorkspace(_branch: string): Promise<string> {
    return this.repoPath;
  }

  async exec(prompt: string, workDir: string): Promise<WorkerProcess> {
    const { args, stdin } = buildGeminiArgs(this.descriptor, prompt);

    const mergedEnv: Record<string, string> = {
      ...this.descriptor.envVars,
      ...this.envOverrides,
    };

    const proc = this.spawner.spawn(this.descriptor.command, args, {
      stdin,
      cwd: workDir,
      env: Object.keys(mergedEnv).length > 0
        ? mergedEnv
        : undefined,
    });

    return {
      stdout: proc.stdout,
      stderr: proc.stderr,
      exited: proc.exited,
      kill: () => proc.kill(),
    };
  }

  /** No-op — workspace cleanup is managed by the caller. */
  async cleanWorkspace(): Promise<void> {
    // No-op — workspace cleanup is handled by the caller
  }

  /** Always returns `true` — availability is assumed for single-backend clients. */
  async isHealthy(): Promise<boolean> {
    return true;
  }
}
