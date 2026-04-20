/**
 * A single wave event dispatched for parallel worker execution.
 *
 * Wave events carry a payload destined for a specific worker within a
 * scatter-gather wave. The three wave metadata fields ({@link wave_id},
 * {@link wave_index}, {@link wave_total}) identify the wave and the
 * worker's position within it.
 */
export interface WaveEvent {
  /** Bus topic this wave event is published on. */
  topic: string;

  /** Serialised task payload for the individual worker. */
  payload: string;

  /** Shared identifier linking all events in the same wave. */
  wave_id: string;

  /** Zero-based index of this event within the wave. */
  wave_index: number;

  /** Total number of events in the wave. */
  wave_total: number;
}

/**
 * The lifecycle state of a wave within the {@link WaveTracker}.
 *
 * - `'registered'`  — wave has been created but no worker results received yet.
 * - `'in_progress'` — at least one worker result has been recorded.
 * - `'complete'`    — all expected worker results have been received.
 * - `'timed_out'`   — the wave deadline elapsed before all results arrived.
 */
export type WaveState = 'registered' | 'in_progress' | 'complete' | 'timed_out';

/**
 * A grouped collection of wave events sharing the same {@link wave_id}.
 *
 * Produced by the {@link WaveDetector} after validating that all events in a
 * wave share the same topic and total count. The {@link payloads} array
 * preserves the order of the original events sorted by `wave_index`.
 */
export interface WaveGroup {
  /** Shared identifier linking all events in this wave. */
  wave_id: string;

  /** Bus topic shared by every event in the wave. */
  topic: string;

  /** Expected number of workers (equal to `wave_total` on each event). */
  total: number;

  /** Ordered list of serialised task payloads, one per worker. */
  payloads: string[];
}

/**
 * A tracker entry representing the runtime state of a single wave.
 *
 * Maintained by the {@link WaveTracker} as workers report results.
 * The {@link state} field follows the {@link WaveState} lifecycle:
 * `registered → in_progress → complete | timed_out`.
 */
export interface WaveTrackerEntry {
  /** Shared identifier linking all events in this wave. */
  wave_id: string;

  /** Number of worker results expected before the wave is complete. */
  expected_total: number;

  /** Number of worker results received so far (successes + failures). */
  received: number;

  /** Zero-based indices of workers that reported a failure. */
  failures: number[];

  /** Zero-based indices of workers whose results have been recorded. */
  worker_indices: number[];

  /** Current lifecycle state of the wave. */
  state: WaveState;

  /** Unix epoch timestamp (ms) after which the wave is considered timed out. */
  deadline: number;
}

/**
 * The result reported by a single wave worker after execution.
 *
 * Collected by the {@link WaveDispatcher} and passed to the
 * {@link WaveAggregator} for merging into the main events file.
 */
export interface WaveWorkerResult {
  /** Shared identifier linking this result to its parent wave. */
  wave_id: string;

  /** Zero-based index of the worker within the wave. */
  worker_index: number;

  /** Path to the JSONL output file produced by this worker. */
  output_file: string;

  /** Whether the worker completed successfully. */
  success: boolean;

  /** Error message if the worker failed. Only present when {@link success} is `false`. */
  error?: string;
}

/**
 * Options passed to the {@link WaveDispatcher} when dispatching a wave.
 *
 * Controls which wave group to execute, the hat instructions each worker
 * receives, the maximum number of concurrent workers, the timeout budget,
 * and the directory where per-worker JSONL output files are written.
 */
export interface WaveDispatchOptions {
  /** The validated wave group to dispatch. */
  wave_group: WaveGroup;

  /** Raw hat instruction text injected into every worker prompt. */
  hat_instructions: string;

  /** Maximum number of workers that may execute simultaneously. */
  concurrency: number;

  /** Time budget in milliseconds before the wave is considered timed out. */
  timeout_ms: number;

  /** Directory path where per-worker JSONL output files are written. */
  events_dir: string;
}

/**
 * Options for spawning an individual wave worker subprocess.
 *
 * Passed to a {@link SpawnFn} implementation which is responsible for
 * creating the worker process (e.g. via `Bun.spawn`, Docker exec, etc.).
 */
export interface SpawnWorkerOptions {
  /** Shared identifier linking this worker to its parent wave. */
  readonly wave_id: string;

  /** Zero-based index of the worker within the wave. */
  readonly worker_index: number;

  /** The focused prompt string for this worker. */
  readonly prompt: string;

  /** Path to the JSONL output file this worker should write to. */
  readonly output_file: string;

  /** Environment variables to inject into the worker subprocess. */
  readonly env: Readonly<Record<string, string>>;
}

/**
 * A function that spawns a worker subprocess and resolves when it exits.
 *
 * Returns `true` when the worker exits successfully, `false` otherwise.
 * Implementations may use `Bun.spawn`, Docker exec, or any other
 * process-spawning mechanism.
 */
export type SpawnFn = (opts: Readonly<SpawnWorkerOptions>) => Promise<boolean>;
