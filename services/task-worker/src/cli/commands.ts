/**
 * CLI command implementations.
 *
 * Each function corresponds to a `cli.ts` subcommand. They share the
 * same core modules as the HTTP routes but produce NDJSON output on
 * stdout instead of SSE over HTTP.
 */

import type { ProcessSpawner } from '../core/spawner.js';
import type { ModelPreset, CliExecArgs, CliWorkspacePrepareArgs, CliWorkspaceCleanArgs } from '@open-tomato/worker-protocol';

import { CLI_EXIT_CODES, validatePreset } from '@open-tomato/worker-protocol';

import { spawnClaude } from '../core/spawner.js';
import { WorkspaceManager } from '../core/workspace-manager.js';

import { writeDiag, writeEvent } from './output.js';

// ---------------------------------------------------------------------------
// exec
// ---------------------------------------------------------------------------

export async function execCommand(
  args: CliExecArgs,
  defaultModel: string,
  spawner?: ProcessSpawner,
): Promise<number> {
  const modelName = args.model ?? defaultModel;
  let preset: ModelPreset;

  try {
    preset = validatePreset(modelName);
  } catch (err) {
    writeDiag(err instanceof Error
      ? err.message
      : 'Unknown model');
    return CLI_EXIT_CODES.UNKNOWN_MODEL;
  }

  const proc = spawnClaude(
    { prompt: args.prompt, workDir: args.workDir, preset },
    spawner,
  );

  // Drain stdout and stderr concurrently, emitting NDJSON events
  const decoder = new TextDecoder();

  async function drainStream(
    stream: ReadableStream<Uint8Array>,
    streamName: 'stdout' | 'stderr',
  ): Promise<void> {
    const reader = stream.getReader();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.length > 0) writeEvent({ stream: streamName, line });
        }
      }
      if (buffer.length > 0) writeEvent({ stream: streamName, line: buffer });
    } finally {
      reader.releaseLock();
    }
  }

  await Promise.all([
    drainStream(proc.stdout, 'stdout'),
    drainStream(proc.stderr, 'stderr'),
  ]);

  const exitCode = await proc.exited;
  writeEvent({ exit: exitCode });

  return exitCode;
}

// ---------------------------------------------------------------------------
// workspace-prepare
// ---------------------------------------------------------------------------

export async function workspacePrepareCommand(
  args: CliWorkspacePrepareArgs,
): Promise<number> {
  const manager = new WorkspaceManager({ tmpPrefix: `tw-${args.dir.split('/').pop()}-` });

  try {
    const workDir = await manager.prepare(args.branch, args.repoUrl);
    // Write result as JSON to stdout
    process.stdout.write(JSON.stringify({ workDir }) + '\n');
    return CLI_EXIT_CODES.SUCCESS;
  } catch (err) {
    writeDiag(
      `Workspace preparation failed: ${err instanceof Error
        ? err.message
        : String(err)}`,
    );
    return CLI_EXIT_CODES.WORKSPACE_FAILED;
  }
}

// ---------------------------------------------------------------------------
// workspace-clean
// ---------------------------------------------------------------------------

export async function workspaceCleanCommand(
  args: CliWorkspaceCleanArgs,
): Promise<number> {
  const fs = await import('node:fs');

  try {
    if (fs.existsSync(args.dir)) {
      fs.rmSync(args.dir, { recursive: true, force: true });
    }
    process.stdout.write(JSON.stringify({ cleaned: true }) + '\n');
    return CLI_EXIT_CODES.SUCCESS;
  } catch (err) {
    writeDiag(
      `Workspace cleanup failed: ${err instanceof Error
        ? err.message
        : String(err)}`,
    );
    return CLI_EXIT_CODES.WORKSPACE_FAILED;
  }
}

// ---------------------------------------------------------------------------
// health
// ---------------------------------------------------------------------------

export function healthCommand(
  workerId: string,
  supportedPresets: readonly ModelPreset[],
): number {
  process.stdout.write(
    JSON.stringify({
      status: 'idle',
      workerId,
      supportedModels: supportedPresets.map((p) => p.name),
    }) + '\n',
  );
  return CLI_EXIT_CODES.SUCCESS;
}
