/**
 * @packageDocumentation
 * Integration tests for HookEngine.fire — end-to-end warn/block/suspend behavior
 * using real shell scripts and real instances of all collaborating classes.
 *
 * These tests exercise the full stack: HookExecutor spawning actual processes,
 * SuspendStateStore writing to disk, and HookTelemetry appending JSONL records.
 * No mocks are used for the core execution path.
 *
 * Because vitest runs under Node.js (not a native Bun runtime), the `Bun`
 * global is polyfilled via `vi.stubGlobal` using `node:child_process` and
 * `node:fs/promises` to provide real I/O behaviour.
 */

import type { HookPayload, HookSpec } from './types.js';
import type { Readable } from 'node:stream';

import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { env as nodeEnv } from 'node:process';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HookEngine } from './engine.js';
import { HookExecutor } from './executor.js';
import { SuspendStateStore } from './suspend-state-store.js';
import { HookTelemetry } from './telemetry.js';

// ---------------------------------------------------------------------------
// Bun polyfill for Node.js vitest environment
// ---------------------------------------------------------------------------

/**
 * Stubs `globalThis.Bun` with real implementations backed by Node.js APIs so
 * that `HookExecutor` (Bun.spawn), `SuspendStateStore` (Bun.file / Bun.write),
 * and test assertions work without a native Bun runtime.
 */
function stubBunForIntegration(): void {
  vi.stubGlobal('Bun', {
    spawn: (
      cmd: string[],
      opts: { cwd?: string; env?: Record<string, string> },
    ) => {
      const [command, ...args] = cmd;

      const proc = spawn(command!, args, {
        cwd: opts.cwd,
        env: opts.env as Record<string, string | undefined>,
      });

      const stdinSink = {
        write: (data: string) => {
          proc.stdin?.write(data);
        },
        end: () => {
          proc.stdin?.end();
        },
      };

      const nodeStreamToWeb = (stream: Readable): ReadableStream<Uint8Array> => new ReadableStream<Uint8Array>({
        start(controller) {
          stream.on('data', (chunk: Uint8Array) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err: Error) => controller.error(err));
        },
      });

      const exited = new Promise<number>((resolve) => {
        proc.on('close', (code: number | null) => resolve(code ?? 0));
      });

      return {
        stdin: stdinSink,
        stdout: nodeStreamToWeb(proc.stdout!),
        stderr: nodeStreamToWeb(proc.stderr!),
        exited,
        kill: (signal?: string) => {
          proc.kill(signal);
        },
      };
    },

    env: nodeEnv,

    file: (filePath: string) => ({
      exists: async (): Promise<boolean> => {
        try {
          await access(filePath);
          return true;
        } catch {
          return false;
        }
      },
      json: async (): Promise<unknown> => {
        const content = await readFile(filePath, 'utf8');
        return JSON.parse(content) as unknown;
      },
    }),

    write: async (filePath: string, content: string): Promise<void> => {
      await writeFile(filePath, content, 'utf8');
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePayload(overrides: Partial<HookPayload> = {}): HookPayload {
  return {
    iteration: 1,
    hat: 'default',
    events: [],
    metadata: {},
    ...overrides,
  };
}

/** Build a HookSpec that runs a shell one-liner via `sh -c`. */
function shellSpec(name: string, shellCmd: string, overrides: Partial<HookSpec> = {}): HookSpec {
  return {
    name,
    command: 'sh',
    args: ['-c', shellCmd],
    timeoutMs: 5000,
    on_error: 'warn',
    ...overrides,
  };
}

/** Returns true when a file exists at `filePath`, false otherwise. */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Silent logger — suppresses noise in integration test output.
const silentLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
};

// ---------------------------------------------------------------------------
// Integration suite
// ---------------------------------------------------------------------------

describe('HookEngine.fire() — integration with real shell scripts', () => {
  let tmpDir: string;
  let engine: HookEngine;
  let suspendStore: SuspendStateStore;
  let telemetry: HookTelemetry;

  beforeEach(async () => {
    stubBunForIntegration();
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'hook-engine-int-'));
    suspendStore = new SuspendStateStore(tmpDir);
    telemetry = new HookTelemetry(tmpDir);
    const executor = new HookExecutor([], silentLogger);
    engine = new HookEngine(executor, suspendStore, telemetry, silentLogger);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(tmpDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // exit 0 → continue
  // -------------------------------------------------------------------------

  it('returns continue when the hook exits 0', async () => {
    engine.registerHooks('pre.loop.start', [shellSpec('ok-hook', 'exit 0')]);

    const result = await engine.fire('pre.loop.start', makePayload());

    expect(result.disposition).toBe('continue');
  });

  it('preserves initial payload metadata when hook exits 0', async () => {
    engine.registerHooks('pre.loop.start', [shellSpec('ok-hook', 'exit 0')]);

    const result = await engine.fire(
      'pre.loop.start',
      makePayload({ metadata: { key: 'value' } }),
    );

    expect(result.metadata).toMatchObject({ key: 'value' });
  });

  // -------------------------------------------------------------------------
  // warn — non-fatal failure
  // -------------------------------------------------------------------------

  it('returns continue when on_error:warn hook exits 1', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('warn-hook', 'exit 1', { on_error: 'warn' }),
    ]);

    const result = await engine.fire('pre.loop.start', makePayload());

    expect(result.disposition).toBe('continue');
  });

  it('continues to subsequent hooks after a warn failure', async () => {
    const markerPath = path.join(tmpDir, 'after-warn.txt');

    engine.registerHooks('pre.loop.start', [
      shellSpec('warn-hook', 'exit 1', { on_error: 'warn' }),
      shellSpec('after-hook', `touch "${markerPath}"`),
    ]);

    const result = await engine.fire('pre.loop.start', makePayload());

    expect(result.disposition).toBe('continue');
    expect(await fileExists(markerPath)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // block
  // -------------------------------------------------------------------------

  it('returns block when on_error:block hook exits 1', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('block-hook', 'exit 1', { on_error: 'block' }),
    ]);

    const result = await engine.fire('pre.loop.start', makePayload());

    expect(result.disposition).toBe('block');
  });

  it('halts the chain immediately on block — subsequent hooks do not run', async () => {
    const markerPath = path.join(tmpDir, 'should-not-exist.txt');

    engine.registerHooks('pre.loop.start', [
      shellSpec('block-hook', 'exit 1', { on_error: 'block' }),
      shellSpec('after-hook', `touch "${markerPath}"`),
    ]);

    await engine.fire('pre.loop.start', makePayload());

    expect(await fileExists(markerPath)).toBe(false);
  });

  it('returns block even when a later hook would have succeeded', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('block-hook', 'exit 1', { on_error: 'block' }),
      shellSpec('ok-hook', 'exit 0'),
    ]);

    const result = await engine.fire('pre.loop.start', makePayload());

    expect(result.disposition).toBe('block');
  });

  // -------------------------------------------------------------------------
  // suspend
  // -------------------------------------------------------------------------

  it('returns suspend when on_error:suspend hook exits 1', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('suspend-hook', 'exit 1', { on_error: 'suspend', suspend_mode: 'WaitForResume' }),
    ]);

    const result = await engine.fire('pre.loop.start', makePayload());

    expect(result.disposition).toBe('suspend');
  });

  it('persists suspend state to disk when a hook suspends', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('suspend-hook', 'exit 1', { on_error: 'suspend', suspend_mode: 'RetryBackoff' }),
    ]);

    await engine.fire('pre.loop.start', makePayload({ metadata: { run: 42 } }));

    const recovered = await suspendStore.recover();
    expect(recovered).not.toBeNull();
    expect(recovered!.hookName).toBe('suspend-hook');
    expect(recovered!.phase).toBe('pre.loop.start');
    expect(recovered!.suspendMode).toBe('RetryBackoff');
    expect(recovered!.retryCount).toBe(0);
  });

  it('defaults suspend_mode to WaitForResume when not specified', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('suspend-hook', 'exit 1', { on_error: 'suspend' }),
    ]);

    await engine.fire('pre.loop.start', makePayload());

    const recovered = await suspendStore.recover();
    expect(recovered!.suspendMode).toBe('WaitForResume');
  });

  it('halts the chain on suspend — subsequent hooks do not run', async () => {
    const markerPath = path.join(tmpDir, 'after-suspend.txt');

    engine.registerHooks('pre.loop.start', [
      shellSpec('suspend-hook', 'exit 1', { on_error: 'suspend' }),
      shellSpec('after-hook', `touch "${markerPath}"`),
    ]);

    await engine.fire('pre.loop.start', makePayload());

    expect(await fileExists(markerPath)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // metadata mutation via stdout JSON
  // -------------------------------------------------------------------------

  it('merges JSON stdout into metadata when mutate.enabled is true', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('mutate-hook', 'printf \'{"injected":true,"score":99}\'', {
        mutate: { enabled: true },
      }),
    ]);

    const result = await engine.fire('pre.loop.start', makePayload());

    expect(result.disposition).toBe('continue');
    expect(result.metadata).toMatchObject({ injected: true, score: 99 });
  });

  it('carries accumulated metadata from one hook to the next', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('first-hook', 'printf \'{"from":"first"}\'', { mutate: { enabled: true } }),
      shellSpec('second-hook', 'printf \'{"from":"second"}\'', { mutate: { enabled: true } }),
    ]);

    const result = await engine.fire('pre.loop.start', makePayload());

    // second hook overwrites the "from" key; both hooks must have run
    expect(result.metadata).toMatchObject({ from: 'second' });
  });

  it('does not mutate metadata when mutate is not enabled', async () => {
    engine.registerHooks('pre.loop.start', [
      // stdout has valid JSON but mutate is not enabled — should be ignored
      shellSpec('no-mutate-hook', 'printf \'{"injected":true}\''),
    ]);

    const result = await engine.fire('pre.loop.start', makePayload({ metadata: { orig: 1 } }));

    expect(result.metadata).toEqual({ orig: 1 });
    expect(result.metadata).not.toHaveProperty('injected');
  });

  // -------------------------------------------------------------------------
  // stdin payload delivery
  // -------------------------------------------------------------------------

  it('delivers the JSON payload to the hook via stdin', async () => {
    const outPath = path.join(tmpDir, 'stdin-capture.json');

    engine.registerHooks('pre.loop.start', [
      shellSpec('stdin-hook', `cat > "${outPath}"`),
    ]);

    await engine.fire(
      'pre.loop.start',
      makePayload({ metadata: { sentinel: 'integration-test' } }),
    );

    const raw = await readFile(outPath, 'utf8');
    const parsed = JSON.parse(raw) as { metadata: { sentinel: string } };
    expect(parsed.metadata.sentinel).toBe('integration-test');
  });

  // -------------------------------------------------------------------------
  // telemetry written to disk
  // -------------------------------------------------------------------------

  it('appends a telemetry record for each hook that runs', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('tel-hook-a', 'exit 0'),
      shellSpec('tel-hook-b', 'exit 0'),
    ]);

    await engine.fire('pre.loop.start', makePayload());

    const runs = await telemetry.readRuns();
    expect(runs).toHaveLength(2);
    expect(runs[0]!.hookName).toBe('tel-hook-a');
    expect(runs[1]!.hookName).toBe('tel-hook-b');
  });

  it('records the correct disposition in telemetry for a blocked hook', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('block-tel-hook', 'exit 1', { on_error: 'block' }),
    ]);

    await engine.fire('pre.loop.start', makePayload());

    const runs = await telemetry.readRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]!.disposition).toBe('block');
    expect(runs[0]!.hookName).toBe('block-tel-hook');
  });

  it('records the correct disposition in telemetry for a suspended hook', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('suspend-tel-hook', 'exit 1', { on_error: 'suspend' }),
    ]);

    await engine.fire('pre.loop.start', makePayload());

    const runs = await telemetry.readRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]!.disposition).toBe('suspend');
  });

  it('records the correct disposition in telemetry for a warn hook', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('warn-tel-hook', 'exit 1', { on_error: 'warn' }),
    ]);

    await engine.fire('pre.loop.start', makePayload());

    const runs = await telemetry.readRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]!.disposition).toBe('warn');
  });

  // -------------------------------------------------------------------------
  // timeout
  // -------------------------------------------------------------------------

  it('returns continue when a hook times out', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('slow-hook', 'sleep 10', { timeoutMs: 200, on_error: 'warn' }),
    ]);

    const result = await engine.fire('pre.loop.start', makePayload());

    expect(result.disposition).toBe('continue');
  }, 3000);

  it('records timeout disposition in telemetry for a timed-out hook', async () => {
    engine.registerHooks('pre.loop.start', [
      shellSpec('slow-hook', 'sleep 10', { timeoutMs: 200, on_error: 'warn' }),
    ]);

    await engine.fire('pre.loop.start', makePayload());

    const runs = await telemetry.readRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]!.disposition).toBe('timeout');
    expect(runs[0]!.hookName).toBe('slow-hook');
  }, 3000);

  it('continues to subsequent hooks after a timed-out hook', async () => {
    const markerPath = path.join(tmpDir, 'after-timeout.txt');

    engine.registerHooks('pre.loop.start', [
      shellSpec('slow-hook', 'sleep 10', { timeoutMs: 200, on_error: 'warn' }),
      shellSpec('after-hook', `touch "${markerPath}"`),
    ]);

    const result = await engine.fire('pre.loop.start', makePayload());

    expect(result.disposition).toBe('continue');
    expect(await fileExists(markerPath)).toBe(true);
  }, 3000);

  // -------------------------------------------------------------------------
  // phase isolation
  // -------------------------------------------------------------------------

  it('does not fire hooks registered for a different phase', async () => {
    const markerPath = path.join(tmpDir, 'wrong-phase.txt');

    engine.registerHooks('pre.loop.start', [
      shellSpec('wrong-phase-hook', `touch "${markerPath}"`),
    ]);

    await engine.fire('post.loop.start', makePayload());

    expect(await fileExists(markerPath)).toBe(false);
  });

  it('returns continue with unchanged metadata when no hooks are registered', async () => {
    const result = await engine.fire(
      'pre.iteration.start',
      makePayload({ metadata: { x: 1 } }),
    );

    expect(result.disposition).toBe('continue');
    expect(result.metadata).toEqual({ x: 1 });
  });
});
