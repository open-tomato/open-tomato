/**
 * Claude Code CLI spawner.
 *
 * Builds the correct CLI arguments and environment variables for a given
 * model preset, then spawns the process via `Bun.spawn`. Returns a handle
 * with piped stdout/stderr streams and a kill function.
 */

import type { ModelPreset } from '@open-tomato/worker-protocol';

import process from 'node:process';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpawnOptions {
  /** The prompt to send to the Claude Code CLI. */
  readonly prompt: string;
  /** Absolute path to the working directory for the invocation. */
  readonly workDir: string;
  /** Resolved model preset. */
  readonly preset: ModelPreset;
}

export interface SpawnedProcess {
  readonly stdout: ReadableStream<Uint8Array>;
  readonly stderr: ReadableStream<Uint8Array>;
  readonly exited: Promise<number>;
  kill(): void;
}

// ---------------------------------------------------------------------------
// Subprocess abstraction (injectable for testing)
// ---------------------------------------------------------------------------

/**
 * Minimal interface for spawning a subprocess. Production uses `Bun.spawn`;
 * tests inject a stub.
 */
export interface ProcessSpawner {
  spawn(
    command: string[],
    options: {
      stdin?: Uint8Array;
      cwd: string;
      env?: Record<string, string | undefined>;
    },
  ): {
    stdout: ReadableStream<Uint8Array>;
    stderr: ReadableStream<Uint8Array>;
    exited: Promise<number>;
    kill(): void;
  };
}

const defaultSpawner: ProcessSpawner = {
  spawn(command, options) {
    const proc = Bun.spawn(command, {
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
// Arg & env builders
// ---------------------------------------------------------------------------

/**
 * Builds the CLI argument array for a Claude Code invocation.
 *
 * Always uses `claude -p` with `--dangerously-skip-permissions` and
 * `--output-format stream-json`. The `--model` flag is added when the
 * preset specifies a non-default model.
 */
export function buildClaudeArgs(preset: ModelPreset): string[] {
  const args = [
    'claude',
    '-p',
    '--output-format', 'stream-json',
    '--dangerously-skip-permissions',
  ];

  if (preset.model) {
    args.push('--model', preset.model);
  }

  return args;
}

/**
 * Builds environment variable overrides for a Claude Code invocation.
 *
 * For custom providers, sets `ANTHROPIC_BASE_URL` so the Claude CLI
 * routes requests to the correct endpoint (e.g. Ollama).
 */
export function buildClaudeEnv(
  preset: ModelPreset,
  providerUrlOverride?: string,
): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  const url = providerUrlOverride ?? preset.providerUrl;

  if (url && preset.provider === 'custom') {
    env['ANTHROPIC_BASE_URL'] = url;
  }

  return env;
}

// ---------------------------------------------------------------------------
// Spawn
// ---------------------------------------------------------------------------

/**
 * Spawns a Claude Code CLI process with the given options.
 *
 * The prompt is delivered via stdin. stdout and stderr are piped back
 * as `ReadableStream<Uint8Array>` for the caller to consume.
 */
export function spawnClaude(
  options: SpawnOptions,
  spawner: ProcessSpawner = defaultSpawner,
): SpawnedProcess {
  const args = buildClaudeArgs(options.preset);
  const env = buildClaudeEnv(options.preset);
  const stdin = new TextEncoder().encode(options.prompt);

  return spawner.spawn(args, {
    stdin,
    cwd: options.workDir,
    env,
  });
}
