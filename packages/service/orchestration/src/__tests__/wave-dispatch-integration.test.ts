import type { SpawnFn, SpawnWorkerOptions, WaveDispatchOptions, WaveGroup } from '@open-tomato/types';

import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm , writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { WaveAggregator } from '../wave/wave-aggregator.js';
import { WaveDispatcher } from '../wave/wave-dispatcher.js';
import { WaveTracker } from '../wave/wave-tracker.js';

const WAVE_ID = 'integ-wave-001';

const WAVE_GROUP: WaveGroup = {
  wave_id: WAVE_ID,
  topic: 'analyse',
  total: 3,
  payloads: ['payload-alpha', 'payload-beta', 'payload-gamma'],
};

function makeOptions(
  eventsDir: string,
  overrides: Partial<WaveDispatchOptions> = {},
): WaveDispatchOptions {
  return {
    wave_group: WAVE_GROUP,
    hat_instructions: 'Analyse the payload.',
    concurrency: 3,
    timeout_ms: 10_000,
    events_dir: eventsDir,
    ...overrides,
  };
}

/**
 * Creates a SpawnFn that simulates a real worker by writing JSONL output
 * to the worker's output file, just as a real subprocess would.
 */
function simulatingSpawn(): SpawnFn {
  return async (opts: SpawnWorkerOptions) => {
    const outputLine = JSON.stringify({
      topic: 'analyse:result',
      payload: `result-for-${opts.worker_index}`,
      wave_id: opts.wave_id,
      wave_index: opts.worker_index,
    });
    await writeFile(opts.output_file, outputLine + '\n', 'utf8');
    return true;
  };
}

describe('Wave dispatch integration: 3-payload wave creates all output files', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wave-integ-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('dispatches 3 payloads and creates all 3 worker output files', async () => {
    const spawn = simulatingSpawn();
    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register(WAVE_ID, 3, 10_000);

    const results = await dispatcher.dispatch(makeOptions(tempDir), tracker);

    // All 3 results are returned
    expect(results).toHaveLength(3);

    // Every result reports success
    for (const result of results) {
      expect(result.success).toBe(true);
    }

    // All 3 output files exist on disk
    for (let i = 0; i < 3; i++) {
      const expectedPath = join(tempDir, `wave-${WAVE_ID}-${i}.jsonl`);
      expect(existsSync(expectedPath)).toBe(true);
    }
  });

  it('each worker output file contains JSONL written by its worker', async () => {
    const spawn = simulatingSpawn();
    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register(WAVE_ID, 3, 10_000);

    await dispatcher.dispatch(makeOptions(tempDir), tracker);

    for (let i = 0; i < 3; i++) {
      const filePath = join(tempDir, `wave-${WAVE_ID}-${i}.jsonl`);
      const content = readFileSync(filePath, 'utf8').trim();
      expect(content.length).toBeGreaterThan(0);

      const parsed = JSON.parse(content) as Record<string, unknown>;
      expect(parsed['wave_index']).toBe(i);
      expect(parsed['payload']).toBe(`result-for-${i}`);
    }
  });

  it('tracker reaches complete state after all 3 workers finish', async () => {
    const spawn = simulatingSpawn();
    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register(WAVE_ID, 3, 10_000);

    await dispatcher.dispatch(makeOptions(tempDir), tracker);

    const entry = tracker.getState(WAVE_ID);
    expect(entry).toBeDefined();
    expect(entry!.state).toBe('complete');
    expect(entry!.received).toBe(3);
    expect(entry!.failures).toEqual([]);
  });

  it('result output_file paths match the files on disk', async () => {
    const spawn = simulatingSpawn();
    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register(WAVE_ID, 3, 10_000);

    const results = await dispatcher.dispatch(makeOptions(tempDir), tracker);

    for (const result of results) {
      expect(existsSync(result.output_file)).toBe(true);
      expect(result.output_file).toBe(
        join(tempDir, `wave-${WAVE_ID}-${result.worker_index}.jsonl`),
      );
    }
  });
});

describe('Wave dispatch integration: concurrency semaphore limits simultaneous workers', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wave-concurrency-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('never exceeds the configured concurrency limit', async () => {
    const MAX_CONCURRENCY = 2;
    const PAYLOAD_COUNT = 5;

    let running = 0;
    let peak = 0;

    const waveGroup: WaveGroup = {
      wave_id: 'concurrency-test',
      topic: 'analyse',
      total: PAYLOAD_COUNT,
      payloads: Array.from({ length: PAYLOAD_COUNT }, (_, i) => `payload-${i}`),
    };

    /**
     * A spawn function that tracks the number of concurrently active workers.
     * Each worker holds the semaphore permit for a short delay to create
     * temporal overlap, making the concurrency constraint observable.
     */
    const trackingSpawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      running++;
      if (running > peak) {
        peak = running;
      }

      // Hold the permit long enough for other workers to queue
      await new Promise((resolve) => setTimeout(resolve, 50));

      const outputLine = JSON.stringify({
        topic: 'analyse:result',
        payload: `result-for-${opts.worker_index}`,
        wave_id: opts.wave_id,
        wave_index: opts.worker_index,
      });
      await writeFile(opts.output_file, outputLine + '\n', 'utf8');

      running--;
      return true;
    };

    const dispatcher = new WaveDispatcher(trackingSpawn);
    const tracker = new WaveTracker();
    tracker.register(waveGroup.wave_id, PAYLOAD_COUNT, 30_000);

    const results = await dispatcher.dispatch(
      makeOptions(tempDir, {
        wave_group: waveGroup,
        concurrency: MAX_CONCURRENCY,
      }),
      tracker,
    );

    // All workers completed successfully
    expect(results).toHaveLength(PAYLOAD_COUNT);
    for (const result of results) {
      expect(result.success).toBe(true);
    }

    // The peak concurrent workers never exceeded the configured limit
    expect(peak).toBeLessThanOrEqual(MAX_CONCURRENCY);
    // At least 2 workers ran in parallel (otherwise the semaphore wasn't tested)
    expect(peak).toBe(MAX_CONCURRENCY);
  });

  it('runs all workers in parallel when concurrency equals payload count', async () => {
    const PAYLOAD_COUNT = 4;

    let running = 0;
    let peak = 0;

    const waveGroup: WaveGroup = {
      wave_id: 'full-parallel-test',
      topic: 'analyse',
      total: PAYLOAD_COUNT,
      payloads: Array.from({ length: PAYLOAD_COUNT }, (_, i) => `payload-${i}`),
    };

    const trackingSpawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      running++;
      if (running > peak) {
        peak = running;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      const outputLine = JSON.stringify({
        topic: 'analyse:result',
        payload: `result-for-${opts.worker_index}`,
        wave_id: opts.wave_id,
        wave_index: opts.worker_index,
      });
      await writeFile(opts.output_file, outputLine + '\n', 'utf8');

      running--;
      return true;
    };

    const dispatcher = new WaveDispatcher(trackingSpawn);
    const tracker = new WaveTracker();
    tracker.register(waveGroup.wave_id, PAYLOAD_COUNT, 30_000);

    const results = await dispatcher.dispatch(
      makeOptions(tempDir, {
        wave_group: waveGroup,
        concurrency: PAYLOAD_COUNT,
      }),
      tracker,
    );

    expect(results).toHaveLength(PAYLOAD_COUNT);
    // All 4 workers ran simultaneously
    expect(peak).toBe(PAYLOAD_COUNT);
  });

  it('serializes workers when concurrency is 1', async () => {
    const PAYLOAD_COUNT = 3;

    let running = 0;
    let peak = 0;

    const waveGroup: WaveGroup = {
      wave_id: 'serial-test',
      topic: 'analyse',
      total: PAYLOAD_COUNT,
      payloads: Array.from({ length: PAYLOAD_COUNT }, (_, i) => `payload-${i}`),
    };

    const trackingSpawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      running++;
      if (running > peak) {
        peak = running;
      }

      await new Promise((resolve) => setTimeout(resolve, 30));

      const outputLine = JSON.stringify({
        topic: 'analyse:result',
        payload: `result-for-${opts.worker_index}`,
        wave_id: opts.wave_id,
        wave_index: opts.worker_index,
      });
      await writeFile(opts.output_file, outputLine + '\n', 'utf8');

      running--;
      return true;
    };

    const dispatcher = new WaveDispatcher(trackingSpawn);
    const tracker = new WaveTracker();
    tracker.register(waveGroup.wave_id, PAYLOAD_COUNT, 30_000);

    const results = await dispatcher.dispatch(
      makeOptions(tempDir, {
        wave_group: waveGroup,
        concurrency: 1,
      }),
      tracker,
    );

    expect(results).toHaveLength(PAYLOAD_COUNT);
    // Only 1 worker ran at a time
    expect(peak).toBe(1);
  });
});

describe('Wave dispatch integration: main events file contains merged output in index order', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wave-merge-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('merges all 3 worker outputs into the main events file in index order', async () => {
    const spawn = simulatingSpawn();
    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register(WAVE_ID, 3, 10_000);

    const results = await dispatcher.dispatch(makeOptions(tempDir), tracker);

    const mainEventsFile = join(tempDir, 'main-events.jsonl');
    await writeFile(mainEventsFile, '', 'utf8');

    const aggregator = new WaveAggregator();
    await aggregator.mergeResults(WAVE_ID, results, mainEventsFile);

    const merged = readFileSync(mainEventsFile, 'utf8').trim();
    const lines = merged.split('\n').filter((l) => l.length > 0);

    // Exactly 3 lines — one per worker
    expect(lines).toHaveLength(3);

    // Lines appear in index order (0, 1, 2)
    for (let i = 0; i < 3; i++) {
      const parsed = JSON.parse(lines[i]!) as Record<string, unknown>;
      expect(parsed['wave_index']).toBe(i);
      expect(parsed['payload']).toBe(`result-for-${i}`);
      expect(parsed['topic']).toBe('analyse:result');
      expect(parsed['wave_id']).toBe(WAVE_ID);
    }
  });

  it('preserves existing content in the main events file when merging', async () => {
    const spawn = simulatingSpawn();
    const dispatcher = new WaveDispatcher(spawn);
    const tracker = new WaveTracker();
    tracker.register(WAVE_ID, 3, 10_000);

    const results = await dispatcher.dispatch(makeOptions(tempDir), tracker);

    const mainEventsFile = join(tempDir, 'main-events.jsonl');
    const preExisting = JSON.stringify({ topic: 'pre-existing', payload: 'old' });
    await writeFile(mainEventsFile, preExisting + '\n', 'utf8');

    const aggregator = new WaveAggregator();
    await aggregator.mergeResults(WAVE_ID, results, mainEventsFile);

    const lines = readFileSync(mainEventsFile, 'utf8')
      .trim()
      .split('\n')
      .filter((l) => l.length > 0);

    // Pre-existing line + 3 worker lines
    expect(lines).toHaveLength(4);

    // First line is the pre-existing event
    const first = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(first['topic']).toBe('pre-existing');

    // Remaining 3 lines are worker output in index order
    for (let i = 0; i < 3; i++) {
      const parsed = JSON.parse(lines[i + 1]!) as Record<string, unknown>;
      expect(parsed['wave_index']).toBe(i);
    }
  });

  it('skips failed workers and merges only successful ones in order', async () => {
    // Spawn where worker index 1 fails (returns false, writes nothing)
    const failingSpawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      if (opts.worker_index === 1) {
        return false;
      }
      const outputLine = JSON.stringify({
        topic: 'analyse:result',
        payload: `result-for-${opts.worker_index}`,
        wave_id: opts.wave_id,
        wave_index: opts.worker_index,
      });
      await writeFile(opts.output_file, outputLine + '\n', 'utf8');
      return true;
    };

    const dispatcher = new WaveDispatcher(failingSpawn);
    const tracker = new WaveTracker();
    tracker.register(WAVE_ID, 3, 10_000);

    const results = await dispatcher.dispatch(makeOptions(tempDir), tracker);

    const mainEventsFile = join(tempDir, 'main-events.jsonl');
    await writeFile(mainEventsFile, '', 'utf8');

    const warnings: string[] = [];
    const aggregator = new WaveAggregator();
    await aggregator.mergeResults(WAVE_ID, results, mainEventsFile, (msg) => warnings.push(msg));

    const lines = readFileSync(mainEventsFile, 'utf8')
      .trim()
      .split('\n')
      .filter((l) => l.length > 0);

    // Only 2 lines — worker 0 and worker 2
    expect(lines).toHaveLength(2);

    const first = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(first['wave_index']).toBe(0);

    const second = JSON.parse(lines[1]!) as Record<string, unknown>;
    expect(second['wave_index']).toBe(2);

    // A warning was logged for the failed worker
    expect(warnings.some((w) => w.includes('failed worker 1'))).toBe(true);
  });
});

describe('Wave dispatch integration: worker timeout forwards partial results', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wave-timeout-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns partial results when some workers exceed the timeout', async () => {
    const TIMEOUT_MS = 100;
    const PAYLOAD_COUNT = 3;

    const waveGroup: WaveGroup = {
      wave_id: 'timeout-test',
      topic: 'analyse',
      total: PAYLOAD_COUNT,
      payloads: ['fast-0', 'slow-1', 'slow-2'],
    };

    /**
     * Worker 0 completes instantly; workers 1 and 2 take longer than
     * the timeout, so they should be reported as timed-out failures.
     */
    const mixedSpawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      if (opts.worker_index === 0) {
        const outputLine = JSON.stringify({
          topic: 'analyse:result',
          payload: 'result-for-0',
          wave_id: opts.wave_id,
          wave_index: opts.worker_index,
        });
        await writeFile(opts.output_file, outputLine + '\n', 'utf8');
        return true;
      }

      // Slow workers — exceed the timeout
      await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS * 10));

      const outputLine = JSON.stringify({
        topic: 'analyse:result',
        payload: `result-for-${opts.worker_index}`,
        wave_id: opts.wave_id,
        wave_index: opts.worker_index,
      });
      await writeFile(opts.output_file, outputLine + '\n', 'utf8');
      return true;
    };

    const dispatcher = new WaveDispatcher(mixedSpawn);
    const tracker = new WaveTracker();
    tracker.register(waveGroup.wave_id, PAYLOAD_COUNT, TIMEOUT_MS);

    const results = await dispatcher.dispatch(
      makeOptions(tempDir, {
        wave_group: waveGroup,
        concurrency: PAYLOAD_COUNT,
        timeout_ms: TIMEOUT_MS,
      }),
      tracker,
    );

    // All 3 result slots are filled (no gaps)
    expect(results).toHaveLength(PAYLOAD_COUNT);

    // Worker 0 succeeded
    expect(results[0]!.success).toBe(true);
    expect(results[0]!.error).toBeUndefined();

    // Workers 1 and 2 timed out
    expect(results[1]!.success).toBe(false);
    expect(results[1]!.error).toBe('Worker timed out');
    expect(results[2]!.success).toBe(false);
    expect(results[2]!.error).toBe('Worker timed out');
  });

  it('aggregator merges only successful partial results after timeout', async () => {
    const TIMEOUT_MS = 100;
    const PAYLOAD_COUNT = 3;

    const waveGroup: WaveGroup = {
      wave_id: 'timeout-merge-test',
      topic: 'analyse',
      total: PAYLOAD_COUNT,
      payloads: ['fast-0', 'slow-1', 'slow-2'],
    };

    const mixedSpawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      if (opts.worker_index === 0) {
        const outputLine = JSON.stringify({
          topic: 'analyse:result',
          payload: 'result-for-0',
          wave_id: opts.wave_id,
          wave_index: opts.worker_index,
        });
        await writeFile(opts.output_file, outputLine + '\n', 'utf8');
        return true;
      }

      // Exceed timeout
      await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS * 10));
      return true;
    };

    const dispatcher = new WaveDispatcher(mixedSpawn);
    const tracker = new WaveTracker();
    tracker.register(waveGroup.wave_id, PAYLOAD_COUNT, TIMEOUT_MS);

    const results = await dispatcher.dispatch(
      makeOptions(tempDir, {
        wave_group: waveGroup,
        concurrency: PAYLOAD_COUNT,
        timeout_ms: TIMEOUT_MS,
      }),
      tracker,
    );

    // Merge partial results into main events file
    const mainEventsFile = join(tempDir, 'main-events.jsonl');
    await writeFile(mainEventsFile, '', 'utf8');

    const warnings: string[] = [];
    const aggregator = new WaveAggregator();
    await aggregator.mergeResults(
      waveGroup.wave_id,
      results,
      mainEventsFile,
      (msg) => warnings.push(msg),
    );

    const lines = readFileSync(mainEventsFile, 'utf8')
      .trim()
      .split('\n')
      .filter((l) => l.length > 0);

    // Only worker 0's output is merged
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(parsed['wave_index']).toBe(0);
    expect(parsed['payload']).toBe('result-for-0');

    // Warnings logged for the 2 timed-out workers
    expect(warnings).toHaveLength(2);
    expect(warnings.some((w) => w.includes('failed worker 1'))).toBe(true);
    expect(warnings.some((w) => w.includes('failed worker 2'))).toBe(true);
  });

  it('forwards partial results to aggregator hat after timeout', async () => {
    const TIMEOUT_MS = 100;
    const PAYLOAD_COUNT = 2;

    const waveGroup: WaveGroup = {
      wave_id: 'timeout-forward-test',
      topic: 'analyse',
      total: PAYLOAD_COUNT,
      payloads: ['fast-0', 'slow-1'],
    };

    const mixedSpawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      if (opts.worker_index === 0) {
        const outputLine = JSON.stringify({
          topic: 'analyse:result',
          payload: 'result-for-0',
          wave_id: opts.wave_id,
          wave_index: opts.worker_index,
        });
        await writeFile(opts.output_file, outputLine + '\n', 'utf8');
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS * 10));
      return true;
    };

    const dispatcher = new WaveDispatcher(mixedSpawn);
    const tracker = new WaveTracker();
    tracker.register(waveGroup.wave_id, PAYLOAD_COUNT, TIMEOUT_MS);

    const results = await dispatcher.dispatch(
      makeOptions(tempDir, {
        wave_group: waveGroup,
        concurrency: PAYLOAD_COUNT,
        timeout_ms: TIMEOUT_MS,
      }),
      tracker,
    );

    const mainEventsFile = join(tempDir, 'main-events.jsonl');
    await writeFile(mainEventsFile, '', 'utf8');

    const aggregator = new WaveAggregator();
    await aggregator.mergeResults(waveGroup.wave_id, results, mainEventsFile);
    await aggregator.forwardToAggregator('summary-hat', mainEventsFile);

    const lines = readFileSync(mainEventsFile, 'utf8')
      .trim()
      .split('\n')
      .filter((l) => l.length > 0);

    // Worker 0 output + the forwarding event = 2 lines
    expect(lines).toHaveLength(2);

    // First line is the partial worker result
    const workerLine = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(workerLine['wave_index']).toBe(0);

    // Second line is the aggregator forwarding event
    const forwardLine = JSON.parse(lines[1]!) as Record<string, unknown>;
    expect(forwardLine['topic']).toBe('wave:aggregated');
    expect(forwardLine['target_hat']).toBe('summary-hat');
    expect(forwardLine['payload']).toBe(mainEventsFile);
  });
});

describe('Wave dispatch integration: nested wave dispatch is blocked inside a worker process', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wave-nested-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('throws when dispatch is called with RALPH_WAVE_WORKER=1 in the environment', async () => {
    const original = process.env['RALPH_WAVE_WORKER'];
    process.env['RALPH_WAVE_WORKER'] = '1';

    try {
      const spawn = simulatingSpawn();
      const dispatcher = new WaveDispatcher(spawn);
      const tracker = new WaveTracker();
      tracker.register(WAVE_ID, 3, 10_000);

      await expect(
        dispatcher.dispatch(makeOptions(tempDir), tracker),
      ).rejects.toThrow('Nested wave dispatch is not allowed');
    } finally {
      if (original === undefined) {
        delete process.env['RALPH_WAVE_WORKER'];
      } else {
        process.env['RALPH_WAVE_WORKER'] = original;
      }
    }
  });

  it('no workers are spawned when nested dispatch is blocked', async () => {
    const original = process.env['RALPH_WAVE_WORKER'];
    process.env['RALPH_WAVE_WORKER'] = '1';

    try {
      let spawnCount = 0;
      const countingSpawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
        spawnCount++;
        const outputLine = JSON.stringify({
          topic: 'analyse:result',
          payload: `result-for-${opts.worker_index}`,
          wave_id: opts.wave_id,
          wave_index: opts.worker_index,
        });
        await writeFile(opts.output_file, outputLine + '\n', 'utf8');
        return true;
      };

      const dispatcher = new WaveDispatcher(countingSpawn);
      const tracker = new WaveTracker();
      tracker.register(WAVE_ID, 3, 10_000);

      await dispatcher.dispatch(makeOptions(tempDir), tracker).catch(() => {});

      // No workers were spawned — the guard rejects before any work starts
      expect(spawnCount).toBe(0);

      // No output files were created
      for (let i = 0; i < 3; i++) {
        expect(existsSync(join(tempDir, `wave-${WAVE_ID}-${i}.jsonl`))).toBe(false);
      }
    } finally {
      if (original === undefined) {
        delete process.env['RALPH_WAVE_WORKER'];
      } else {
        process.env['RALPH_WAVE_WORKER'] = original;
      }
    }
  });

  it('a worker attempting to dispatch a nested wave is rejected while the parent wave succeeds', async () => {
    let nestedDispatchError: string | undefined;

    /**
     * A spawn function where each worker simulates attempting a nested
     * wave dispatch. The nested dispatch should be blocked because the
     * worker environment has RALPH_WAVE_WORKER=1.
     */
    const nestedAttemptSpawn: SpawnFn = async (opts: SpawnWorkerOptions) => {
      // Simulate the worker's environment where RALPH_WAVE_WORKER=1
      const savedEnv = process.env['RALPH_WAVE_WORKER'];
      process.env['RALPH_WAVE_WORKER'] = opts.env['RALPH_WAVE_WORKER'];

      try {
        // Worker attempts to dispatch a nested wave
        const nestedDispatcher = new WaveDispatcher(simulatingSpawn());
        const nestedTracker = new WaveTracker();
        const nestedGroup: WaveGroup = {
          wave_id: 'nested-wave',
          topic: 'sub-task',
          total: 2,
          payloads: ['sub-0', 'sub-1'],
        };
        nestedTracker.register(nestedGroup.wave_id, 2, 5_000);

        await nestedDispatcher.dispatch(
          {
            wave_group: nestedGroup,
            hat_instructions: 'Sub-task instructions',
            concurrency: 2,
            timeout_ms: 5_000,
            events_dir: tempDir,
          },
          nestedTracker,
        );
      } catch (error: unknown) {
        if (error instanceof Error) {
          nestedDispatchError = error.message;
        }
      } finally {
        // Restore the parent process environment
        if (savedEnv === undefined) {
          delete process.env['RALPH_WAVE_WORKER'];
        } else {
          process.env['RALPH_WAVE_WORKER'] = savedEnv;
        }
      }

      // The worker itself still succeeds — it writes its own output
      const outputLine = JSON.stringify({
        topic: 'analyse:result',
        payload: `result-for-${opts.worker_index}`,
        wave_id: opts.wave_id,
        wave_index: opts.worker_index,
      });
      await writeFile(opts.output_file, outputLine + '\n', 'utf8');
      return true;
    };

    const dispatcher = new WaveDispatcher(nestedAttemptSpawn);
    const tracker = new WaveTracker();
    tracker.register(WAVE_ID, 3, 10_000);

    const results = await dispatcher.dispatch(
      makeOptions(tempDir, { concurrency: 1 }),
      tracker,
    );

    // The parent wave completed successfully
    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.success).toBe(true);
    }

    // The nested dispatch attempt was blocked
    expect(nestedDispatchError).toBe(
      'Nested wave dispatch is not allowed inside a wave worker.',
    );

    // No nested wave output files were created
    expect(existsSync(join(tempDir, 'wave-nested-wave-0.jsonl'))).toBe(false);
    expect(existsSync(join(tempDir, 'wave-nested-wave-1.jsonl'))).toBe(false);

    // Parent tracker reached complete state
    const entry = tracker.getState(WAVE_ID);
    expect(entry?.state).toBe('complete');
    expect(entry?.received).toBe(3);
  });
});
