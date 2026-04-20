import type { SpawnFn, SpawnWorkerOptions, WaveDispatchOptions, WaveGroup } from '@open-tomato/types';

import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

import { WaveDispatcher } from '../wave/wave-dispatcher.js';
import { WaveTracker } from '../wave/wave-tracker.js';

const WAVE_GROUP: WaveGroup = {
  wave_id: 'wave-abc',
  topic: 'analyse',
  total: 3,
  payloads: ['payload-0', 'payload-1', 'payload-2'],
};

function makeOptions(
  eventsDir: string,
  overrides: Partial<WaveDispatchOptions> = {},
): WaveDispatchOptions {
  return {
    wave_group: WAVE_GROUP,
    hat_instructions: 'Do the thing.',
    concurrency: 10,
    timeout_ms: 30_000,
    events_dir: eventsDir,
    ...overrides,
  };
}

function successSpawn(): SpawnFn {
  return mock<SpawnFn>(async () => true);
}

describe('WaveDispatcher', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wave-dispatch-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('spawns exactly N workers for N payloads', async () => {
    const spawn = successSpawn();
    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register('wave-abc', 3, 30_000);

    const results = await dispatcher.dispatch(makeOptions(tempDir), tracker);

    expect(results).toHaveLength(3);
    expect(spawn).toHaveBeenCalledTimes(3);
  });

  it('respects concurrency limit — no more than N processes run simultaneously', async () => {
    let running = 0;
    let maxRunning = 0;

    const spawn: SpawnFn = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      // Yield to let other tasks attempt to start
      await new Promise((resolve) => setTimeout(resolve, 10));
      running--;
      return true;
    };

    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();

    const group: WaveGroup = {
      wave_id: 'wave-conc',
      topic: 'work',
      total: 5,
      payloads: ['a', 'b', 'c', 'd', 'e'],
    };

    tracker.register('wave-conc', 5, 30_000);

    await dispatcher.dispatch(
      makeOptions(tempDir, { wave_group: group, concurrency: 2 }),
      tracker,
    );

    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it('injects correct env vars into each worker subprocess', async () => {
    const calls: SpawnWorkerOptions[] = [];
    const spawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      calls.push({ ...opts });
      return true;
    };

    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register('wave-abc', 3, 30_000);

    await dispatcher.dispatch(makeOptions(tempDir), tracker);

    for (let i = 0; i < 3; i++) {
      const call = calls.find((c) => c.worker_index === i);
      expect(call).toBeDefined();
      expect(call!.env).toEqual({
        RALPH_WAVE_WORKER: '1',
        RALPH_WAVE_ID: 'wave-abc',
        RALPH_WAVE_INDEX: String(i),
      });
    }
  });

  it('returns failure result when a worker process exits non-zero', async () => {
    const spawn: SpawnFn = async (opts: SpawnWorkerOptions) => opts.worker_index !== 1;

    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register('wave-abc', 3, 30_000);

    const results = await dispatcher.dispatch(makeOptions(tempDir), tracker);

    const failed = results.find((r) => r.worker_index === 1);
    expect(failed?.success).toBe(false);

    const succeeded = results.filter((r) => r.worker_index !== 1);
    for (const r of succeeded) {
      expect(r.success).toBe(true);
    }
  });

  it('does not dispatch when RALPH_WAVE_WORKER env var is set to "1"', async () => {
    const original = process.env['RALPH_WAVE_WORKER'];
    process.env['RALPH_WAVE_WORKER'] = '1';

    try {
      const spawn = successSpawn();
      const dispatcher = new WaveDispatcher(spawn);
      const tracker = new WaveTracker();
      tracker.register('wave-abc', 3, 30_000);

      await expect(
        dispatcher.dispatch(makeOptions(tempDir), tracker),
      ).rejects.toThrow('Nested wave dispatch is not allowed');

      expect(spawn).not.toHaveBeenCalled();
    } finally {
      if (original === undefined) {
        delete process.env['RALPH_WAVE_WORKER'];
      } else {
        process.env['RALPH_WAVE_WORKER'] = original;
      }
    }
  });

  it('releases semaphore permit on worker failure', async () => {
    const spawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      if (opts.worker_index === 0) {
        throw new Error('Worker crashed');
      }
      return true;
    };

    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register('wave-abc', 3, 30_000);

    // With concurrency 1, a leaked permit would deadlock
    const results = await dispatcher.dispatch(
      makeOptions(tempDir, { concurrency: 1 }),
      tracker,
    );

    expect(results).toHaveLength(3);

    const crashed = results.find((r) => r.worker_index === 0);
    expect(crashed?.success).toBe(false);
    expect(crashed?.error).toBe('Worker crashed');
  });

  it('records results in the tracker for each worker', async () => {
    const spawn: SpawnFn = async (opts: SpawnWorkerOptions) => opts.worker_index !== 1;

    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register('wave-abc', 3, 30_000);

    await dispatcher.dispatch(makeOptions(tempDir), tracker);

    const entry = tracker.getState('wave-abc');
    expect(entry?.received).toBe(3);
    expect(entry?.state).toBe('complete');
    expect(entry?.failures).toEqual([1]);
  });

  it('completes without timeout when timeout_ms is 0', async () => {
    const spawn = successSpawn();
    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register('wave-abc', 3, 30_000);

    const results = await dispatcher.dispatch(
      makeOptions(tempDir, { timeout_ms: 0 }),
      tracker,
    );

    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.success).toBe(true);
    }
    expect(spawn).toHaveBeenCalledTimes(3);
  });

  it('creates output file paths using wave_id and index', async () => {
    const calls: SpawnWorkerOptions[] = [];
    const spawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      calls.push({ ...opts });
      return true;
    };

    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register('wave-abc', 3, 30_000);

    await dispatcher.dispatch(makeOptions(tempDir), tracker);

    for (let i = 0; i < 3; i++) {
      const call = calls.find((c) => c.worker_index === i);
      expect(call!.output_file).toBe(join(tempDir, `wave-wave-abc-${i}.jsonl`));
    }
  });
});

describe('WaveDispatcher.spawnWorker', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wave-spawn-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates the JSONL output file before spawning', async () => {
    let fileExistedDuringSpawn = false;
    const outputFile = join(tempDir, 'wave-test-0.jsonl');

    const spawn: SpawnFn = async () => {
      fileExistedDuringSpawn = existsSync(outputFile);
      return true;
    };

    const dispatcher = new WaveDispatcher(spawn);

    await dispatcher.spawnWorker({
      wave_id: 'test',
      worker_index: 0,
      prompt: 'do work',
      output_file: outputFile,
      env: { RALPH_WAVE_WORKER: '1', RALPH_WAVE_ID: 'test', RALPH_WAVE_INDEX: '0' },
    });

    expect(fileExistedDuringSpawn).toBe(true);
  });

  it('returns a success result when spawn resolves true', async () => {
    const outputFile = join(tempDir, 'wave-ok-0.jsonl');
    const spawn: SpawnFn = async () => true;
    const dispatcher = new WaveDispatcher(spawn);

    const result = await dispatcher.spawnWorker({
      wave_id: 'ok',
      worker_index: 0,
      prompt: 'do work',
      output_file: outputFile,
      env: { RALPH_WAVE_WORKER: '1', RALPH_WAVE_ID: 'ok', RALPH_WAVE_INDEX: '0' },
    });

    expect(result).toEqual({
      wave_id: 'ok',
      worker_index: 0,
      output_file: outputFile,
      success: true,
    });
  });

  it('returns a failure result when spawn resolves false', async () => {
    const outputFile = join(tempDir, 'wave-fail-0.jsonl');
    const spawn: SpawnFn = async () => false;
    const dispatcher = new WaveDispatcher(spawn);

    const result = await dispatcher.spawnWorker({
      wave_id: 'fail',
      worker_index: 0,
      prompt: 'do work',
      output_file: outputFile,
      env: { RALPH_WAVE_WORKER: '1', RALPH_WAVE_ID: 'fail', RALPH_WAVE_INDEX: '0' },
    });

    expect(result.success).toBe(false);
  });

  it('catches spawn errors and returns failure with error message', async () => {
    const outputFile = join(tempDir, 'wave-err-0.jsonl');
    const spawn: SpawnFn = async () => {
      throw new Error('PTY allocation failed');
    };
    const dispatcher = new WaveDispatcher(spawn);

    const result = await dispatcher.spawnWorker({
      wave_id: 'err',
      worker_index: 0,
      prompt: 'do work',
      output_file: outputFile,
      env: { RALPH_WAVE_WORKER: '1', RALPH_WAVE_ID: 'err', RALPH_WAVE_INDEX: '0' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('PTY allocation failed');
  });

  it('returns failure with generic message when spawn throws a non-Error value', async () => {
    const outputFile = join(tempDir, 'wave-nonErr-0.jsonl');
    const spawn: SpawnFn = async () => {
      throw 'string-based failure';  
    };
    const dispatcher = new WaveDispatcher(spawn);

    const result = await dispatcher.spawnWorker({
      wave_id: 'nonErr',
      worker_index: 0,
      prompt: 'do work',
      output_file: outputFile,
      env: { RALPH_WAVE_WORKER: '1', RALPH_WAVE_ID: 'nonErr', RALPH_WAVE_INDEX: '0' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown worker error');
  });

  it('creates the output file as empty initially', async () => {
    const outputFile = join(tempDir, 'wave-empty-0.jsonl');
    const spawn: SpawnFn = async () => true;
    const dispatcher = new WaveDispatcher(spawn);

    await dispatcher.spawnWorker({
      wave_id: 'empty',
      worker_index: 0,
      prompt: 'do work',
      output_file: outputFile,
      env: { RALPH_WAVE_WORKER: '1', RALPH_WAVE_ID: 'empty', RALPH_WAVE_INDEX: '0' },
    });

    const content = readFileSync(outputFile, 'utf8');
    expect(content).toBe('');
  });

  it('passes opts through to the spawn function', async () => {
    const outputFile = join(tempDir, 'wave-pass-1.jsonl');
    let receivedOpts: SpawnWorkerOptions | undefined;

    const spawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      receivedOpts = { ...opts };
      return true;
    };

    const dispatcher = new WaveDispatcher(spawn);
    const workerOpts: SpawnWorkerOptions = {
      wave_id: 'pass',
      worker_index: 1,
      prompt: 'focused prompt here',
      output_file: outputFile,
      env: { RALPH_WAVE_WORKER: '1', RALPH_WAVE_ID: 'pass', RALPH_WAVE_INDEX: '1' },
    };

    await dispatcher.spawnWorker(workerOpts);

    expect(receivedOpts).toBeDefined();
    expect(receivedOpts!.wave_id).toBe('pass');
    expect(receivedOpts!.worker_index).toBe(1);
    expect(receivedOpts!.prompt).toBe('focused prompt here');
    expect(receivedOpts!.env).toEqual({
      RALPH_WAVE_WORKER: '1',
      RALPH_WAVE_ID: 'pass',
      RALPH_WAVE_INDEX: '1',
    });
  });
});
