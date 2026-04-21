/**
 * End-to-end test that spawns the executor process with `--rpc` and validates
 * that a `get_state` command on stdin produces a valid state snapshot on stdout.
 *
 * The test uses `--dry-run` to avoid real LLM invocations and sets a dummy
 * DATABASE_URL. The RPC server starts before `createService` attempts the DB
 * connection, so we send the command the instant the readiness log appears.
 */

import type { Buffer as NodeBuffer } from 'node:buffer';

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXECUTOR_DIR = resolve(import.meta.dirname, '../../');

interface CollectedOutput {
  /** All NDJSON-parseable objects received on stdout. */
  events: Array<Record<string, unknown>>;
  /** Raw stdout lines (for debugging). */
  rawLines: string[];
}

/**
 * Spawn the executor with `--rpc --dry-run`, send a command on stdin as soon
 * as the RPC server signals readiness, and collect parsed NDJSON events from
 * stdout until a matcher returns true or the timeout fires.
 */
function spawnAndCollect(opts: {
  command: Record<string, unknown>;
  matchEvent: (event: Record<string, unknown>) => boolean;
  timeoutMs?: number;
}): Promise<CollectedOutput> {
  const { command, matchEvent, timeoutMs = 10_000 } = opts;

  return new Promise((resolveP, rejectP) => {
    const collected: CollectedOutput = { events: [], rawLines: [] };
    let settled = false;
    let commandSent = false;

    const child = spawn('bun', ['index.ts', '--rpc', '--dry-run'], {
      cwd: EXECUTOR_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Dummy DB — the RPC server starts before the DB probe
        DATABASE_URL: 'postgresql://dummy:dummy@127.0.0.1:1/dummy',
        PORT: '0',
      },
    });

    let stdoutBuffer = '';

    const finish = (result: CollectedOutput) => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      resolveP(result);
    };

    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      rejectP(new Error(reason));
    };

    const timeout = setTimeout(() => {
      fail(
        `Timed out after ${timeoutMs}ms. Collected ${collected.events.length} events, ` +
          `raw lines: ${collected.rawLines.join(' | ')}`,
      );
    }, timeoutMs);

    child.stdout!.on('data', (chunk: NodeBuffer) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        collected.rawLines.push(trimmed);

        // Send the command the instant we see the readiness message
        if (!commandSent && trimmed.includes('rpc server enabled')) {
          commandSent = true;
          child.stdin!.write(JSON.stringify(command) + '\n');
        }

        try {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>;
          collected.events.push(parsed);

          if (matchEvent(parsed)) {
            clearTimeout(timeout);
            finish(collected);
            return;
          }
        } catch {
          // Not JSON — console.log output, skip
        }
      }
    });

    child.stderr!.on('data', () => {
      // Intentionally ignored — DB failure noise
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      fail(`Child process error: ${err.message}`);
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      if (!settled) {
        fail(
          `Process exited with code ${code} before matching event was found. ` +
            `Collected ${collected.events.length} events, ` +
            `raw lines: ${collected.rawLines.join(' | ')}`,
        );
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RPC end-to-end (process spawn)', () => {
  it('returns a valid state snapshot for a get_state command', async () => {
    const result = await spawnAndCollect({
      command: { method: 'get_state' },
      matchEvent: (evt) => evt['event'] === 'orchestration_event' &&
        typeof evt['data'] === 'object' &&
        evt['data'] !== null &&
        (evt['data'] as Record<string, unknown>)['kind'] === 'state_snapshot',
      timeoutMs: 15_000,
    });

    const snapshotEvent = result.events.find(
      (evt) => evt['event'] === 'orchestration_event' &&
        typeof evt['data'] === 'object' &&
        evt['data'] !== null &&
        (evt['data'] as Record<string, unknown>)['kind'] === 'state_snapshot',
    );

    expect(snapshotEvent).toBeDefined();

    const data = snapshotEvent!['data'] as Record<string, unknown>;
    expect(data['kind']).toBe('state_snapshot');
    expect(data['payload']).toBeDefined();
    expect(typeof data['payload']).toBe('object');
    expect(data['timestamp']).toBeDefined();
    expect(typeof data['timestamp']).toBe('string');

    // The default onGetState hook returns { status: 'idle' }
    const payload = data['payload'] as Record<string, unknown>;
    expect(payload['status']).toBe('idle');
  }, 20_000);

  it('returns an error event for an invalid RPC command on stdin', async () => {
    const result = await spawnAndCollect({
      // Valid JSON but not a valid RPC command — should produce VALIDATION_ERROR
      command: { _raw: true } as unknown as Record<string, unknown>,
      matchEvent: (evt) => evt['event'] === 'error',
      timeoutMs: 15_000,
    });

    const errorEvent = result.events.find(
      (evt) => evt['event'] === 'error',
    );

    expect(errorEvent).toBeDefined();

    const data = errorEvent!['data'] as Record<string, unknown>;
    expect(data['code']).toBe('VALIDATION_ERROR');
    expect(data['message']).toBeDefined();
  }, 20_000);
});
