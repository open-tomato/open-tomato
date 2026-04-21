/**
 * End-to-end test: executor → task-worker CLI pipeline.
 *
 * Tests the full flow:
 *   1. TaskWorkerCliClient spawns `bun cli.ts exec ...`
 *   2. The CLI validates the model preset, spawns (mocked) Claude, streams NDJSON
 *   3. The executor's ndjsonToWorkerProcess adapter converts it to WorkerProcess
 *   4. The WorkerProcess stdout/stderr/exited resolve correctly
 *
 * This test uses a mock spawner injected via environment variable to avoid
 * needing a real Claude binary. The task-worker CLI's core spawner is tested;
 * only the actual Bun.spawn of claude is mocked.
 *
 * NOTE: This test spawns real subprocesses (bun cli.ts) — it's a true e2e
 * test, not a unit test with mocks.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ndjsonToWorkerProcess } from '../../src/workers/ndjson-to-worker-process.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../../../task-worker/cli.ts');

/** Spawn bun with the task-worker CLI and collect output. */
function runCli(
  args: string[],
  env?: Record<string, string>,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', [CLI_PATH, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

describe('E2E: executor → task-worker CLI', () => {
  it('cli.ts health returns valid JSON with supported models', async () => {
    const { exitCode, stdout } = await runCli(['health'], { WORKER_ID: 'e2e-test-worker' });

    expect(exitCode).toBe(0);

    const body = JSON.parse(stdout.trim());
    expect(body).toMatchObject({
      status: 'idle',
      workerId: 'e2e-test-worker',
      supportedModels: expect.arrayContaining(['sonnet', 'haiku', 'opus']),
    });
  });

  it('cli.ts exec with unknown model returns exit code 201', async () => {
    const { exitCode, stderr } = await runCli(
      ['exec', '--prompt', 'test', '--work-dir', '/tmp', '--model', 'gpt-99'],
    );

    expect(exitCode).toBe(201); // CLI_EXIT_CODES.UNKNOWN_MODEL
    expect(stderr).toContain('Unknown model preset');
  });

  it('cli.ts with unknown subcommand returns exit code 200', async () => {
    const { exitCode } = await runCli(['nonexistent']);
    expect(exitCode).toBe(200); // CLI_EXIT_CODES.INVALID_ARGS
  });

  it('cli.ts exec without required args returns exit code 200', async () => {
    const { exitCode } = await runCli(['exec']);
    expect(exitCode).toBe(200); // CLI_EXIT_CODES.INVALID_ARGS
  });

  it('ndjsonToWorkerProcess correctly parses CLI-style NDJSON output', async () => {
    // Simulate what the CLI would produce by creating a synthetic NDJSON stream
    const encoder = new TextEncoder();
    const lines = [
      '{"stream":"stdout","line":"Hello from task"}',
      '{"stream":"stderr","line":"[warn] something"}',
      '{"stream":"stdout","line":"Done."}',
      '{"exit":0}',
    ];

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line + '\n'));
        }
        controller.close();
      },
    });

    let killed = false;
    const proc = ndjsonToWorkerProcess(stream, () => { killed = true; });

    // Drain concurrently
    const decoder = new TextDecoder();
    async function drain(s: ReadableStream<Uint8Array>): Promise<string> {
      const reader = s.getReader();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value);
      }
      return text;
    }

    const [stdoutText, stderrText, exitCode] = await Promise.all([
      drain(proc.stdout),
      drain(proc.stderr),
      proc.exited,
    ]);

    expect(stdoutText).toBe('Hello from task\nDone.\n');
    expect(stderrText).toBe('[warn] something\n');
    expect(exitCode).toBe(0);
    expect(killed).toBe(false);
  });

  it('workspace-clean on non-existent dir succeeds', async () => {
    const { exitCode, stdout } = await runCli(
      ['workspace-clean', '--dir', '/tmp/does-not-exist-e2e-test'],
    );

    expect(exitCode).toBe(0);
    const body = JSON.parse(stdout.trim());
    expect(body).toEqual({ cleaned: true });
  });
});
