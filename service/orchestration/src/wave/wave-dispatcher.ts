import type {
  SpawnFn,
  SpawnWorkerOptions,
  WaveDispatchOptions,
  WaveGroup,
  WaveWorkerResult,
} from '@open-tomato/types';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

import { Semaphore } from './semaphore.js';
import { WavePromptBuilder } from './wave-prompt-builder.js';
import { WaveTracker } from './wave-tracker.js';

/**
 * Dispatches wave workers with semaphore-based concurrency control.
 *
 * Given a {@link WaveGroup}, the dispatcher spawns one worker per payload,
 * limits concurrency via a {@link Semaphore}, records results in a
 * {@link WaveTracker}, and collects all {@link WaveWorkerResult} values.
 *
 * Wave dispatch is blocked when the current process is itself a wave worker
 * (`RALPH_WAVE_WORKER=1` in the environment), preventing nested waves.
 */
export class WaveDispatcher {
  private readonly promptBuilder = new WavePromptBuilder();
  private readonly spawn: SpawnFn;

  /**
   * Create a new dispatcher with the given spawn function.
   *
   * @param spawn - Function that spawns a worker subprocess.
   */
  constructor(spawn: SpawnFn) {
    this.spawn = spawn;
  }

  /**
   * Dispatch all workers for a wave group.
   *
   * Spawns one worker per payload in the wave group, limiting concurrency
   * to {@link WaveDispatchOptions.concurrency} simultaneous workers.
   * Each worker receives a focused prompt built by {@link WavePromptBuilder}
   * and environment variables identifying it as a wave worker.
   *
   * @param opts - Dispatch configuration including the wave group, hat
   *   instructions, concurrency limit, timeout, and output directory.
   * @param tracker - The tracker instance to record worker results against.
   * @returns Array of worker results, one per payload.
   * @throws Error if called from within a wave worker process.
   */
  async dispatch(
    opts: Readonly<WaveDispatchOptions>,
    tracker: WaveTracker,
  ): Promise<readonly WaveWorkerResult[]> {
    if (process.env['RALPH_WAVE_WORKER'] === '1') {
      throw new Error(
        'Nested wave dispatch is not allowed inside a wave worker.',
      );
    }

    const { wave_group, hat_instructions, concurrency, timeout_ms, events_dir } = opts;
    const semaphore = new Semaphore(concurrency);

    const results: WaveWorkerResult[] = new Array(wave_group.payloads.length);
    const settled = new Set<number>();

    const tasks = wave_group.payloads.map(async (payload, index) => {
      const result = await this.runWorker({
        semaphore,
        tracker,
        wave_group,
        hat_instructions,
        events_dir,
        payload,
        index,
      });
      results[index] = result;
      settled.add(index);
      return result;
    });

    const allDone = Promise.all(tasks);

    if (timeout_ms > 0) {
      const deadline = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), timeout_ms);
      });

      const outcome = await Promise.race([
        allDone.then(() => 'complete' as const),
        deadline,
      ]);

      if (outcome === 'timeout') {
        // Prevent unhandled promise rejections from workers that are still
        // running after the timeout deadline has been reached.
        allDone.catch(() => {});

        // Fill in timeout-failure results for workers that haven't settled
        for (let i = 0; i < wave_group.payloads.length; i++) {
          if (!settled.has(i)) {
            results[i] = {
              wave_id: wave_group.wave_id,
              worker_index: i,
              output_file: join(
                events_dir,
                `wave-${wave_group.wave_id}-${i}.jsonl`,
              ),
              success: false,
              error: 'Worker timed out',
            };
          }
        }
        return results;
      }
    } else {
      await allDone;
    }

    return results;
  }

  /**
   * Spawn a single wave worker subprocess.
   *
   * Creates an empty per-worker JSONL output file at
   * `wave-{wave_id}-{index}.jsonl` inside the given `events_dir`, then
   * invokes the injected {@link SpawnFn} with a focused prompt and wave
   * worker environment variables. Returns a {@link WaveWorkerResult}
   * indicating success or failure.
   *
   * @param opts - Options describing the worker to spawn.
   * @returns The result of the worker execution.
   */
  async spawnWorker(opts: Readonly<SpawnWorkerOptions>): Promise<WaveWorkerResult> {
    const { wave_id, worker_index, output_file } = opts;

    try {
      await writeFile(output_file, '', 'utf8');

      const success = await this.spawn(opts);

      return {
        wave_id,
        worker_index,
        output_file,
        success,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown worker error';

      return {
        wave_id,
        worker_index,
        output_file,
        success: false,
        error: message,
      };
    }
  }

  /**
   * Run a single worker within the semaphore gate.
   *
   * Acquires a permit before spawning, releases it in a `finally` block
   * to prevent permit leaks on failure, and records the result in the
   * tracker.
   */
  private async runWorker(ctx: {
    readonly semaphore: Semaphore;
    readonly tracker: WaveTracker;
    readonly wave_group: WaveGroup;
    readonly hat_instructions: string;
    readonly events_dir: string;
    readonly payload: string;
    readonly index: number;
  }): Promise<WaveWorkerResult> {
    const {
      semaphore,
      tracker,
      wave_group,
      hat_instructions,
      events_dir,
      payload,
      index,
    } = ctx;

    const output_file = join(
      events_dir,
      `wave-${wave_group.wave_id}-${index}.jsonl`,
    );

    const prompt = this.promptBuilder.buildWorkerPrompt({
      hat_instructions,
      worker_index: index,
      worker_total: wave_group.total,
      payload,
      publish_command: `echo '{}' >> ${output_file}`,
    });

    const env: Record<string, string> = {
      RALPH_WAVE_WORKER: '1',
      RALPH_WAVE_ID: wave_group.wave_id,
      RALPH_WAVE_INDEX: String(index),
    };

    await semaphore.acquire();
    try {
      const result = await this.spawnWorker({
        wave_id: wave_group.wave_id,
        worker_index: index,
        prompt,
        output_file,
        env,
      });

      tracker.recordResult(wave_group.wave_id, index, result.success);
      return result;
    } finally {
      semaphore.release();
    }
  }
}
