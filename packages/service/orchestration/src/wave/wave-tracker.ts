import type { WaveState, WaveTrackerEntry } from '@open-tomato/types';

/**
 * Progress event emitted by the {@link WaveTracker} each time a worker
 * result is recorded.
 */
export interface WaveProgressEvent {
  /** Shared identifier of the wave. */
  wave_id: string;

  /** Number of worker results received so far. */
  received: number;

  /** Total number of expected worker results. */
  total: number;
}

/**
 * Callback invoked by the {@link WaveTracker} on each worker result.
 */
export type WaveProgressCallback = (event: Readonly<WaveProgressEvent>) => void;

/** Set of terminal states that cannot transition further. */
const TERMINAL_STATES: ReadonlySet<WaveState> = new Set([
  'complete',
  'timed_out',
]);

/**
 * Manages per-wave state machines, tracking worker results and enforcing
 * deadlines.
 *
 * Each wave progresses through the lifecycle:
 * `registered → in_progress → complete | timed_out`.
 *
 * The tracker is used by the loop runner to know when all workers have
 * reported back (or when a timeout forces early completion with partial
 * results).
 */
export class WaveTracker {
  private readonly entries = new Map<string, WaveTrackerEntry>();
  private readonly onProgress: WaveProgressCallback | undefined;

  /**
   * Create a new tracker with an optional progress callback.
   *
   * @param onProgress - Called after every {@link recordResult} invocation
   *   with the current received/total counts.
   */
  constructor(onProgress?: WaveProgressCallback) {
    this.onProgress = onProgress;
  }

  /**
   * Register a new wave in the `'registered'` state.
   *
   * @param wave_id - Unique identifier for the wave.
   * @param expected_total - Number of worker results expected.
   * @param timeout_ms - Time budget in milliseconds; used to compute the
   *   absolute deadline.
   */
  register(wave_id: string, expected_total: number, timeout_ms: number): void {
    const entry: WaveTrackerEntry = {
      wave_id,
      expected_total,
      received: 0,
      failures: [],
      worker_indices: [],
      state: 'registered',
      deadline: Date.now() + timeout_ms,
    };
    this.entries.set(wave_id, entry);
  }

  /**
   * Record a worker result, advancing the wave state machine.
   *
   * - Transitions from `'registered'` to `'in_progress'` on the first result.
   * - Transitions to `'complete'` when `received === expected_total`.
   * - No-ops on waves already in a terminal state.
   *
   * @param wave_id - Identifier of the wave.
   * @param worker_index - Zero-based index of the reporting worker.
   * @param success - Whether the worker completed successfully.
   */
  recordResult(
    wave_id: string,
    worker_index: number,
    success: boolean,
  ): void {
    const entry = this.entries.get(wave_id);
    if (!entry) return;
    if (TERMINAL_STATES.has(entry.state)) return;

    const updated: WaveTrackerEntry = {
      ...entry,
      received: entry.received + 1,
      worker_indices: [...entry.worker_indices, worker_index],
      failures: success
        ? entry.failures
        : [...entry.failures, worker_index],
      state: 'in_progress',
    };

    if (updated.received === updated.expected_total) {
      updated.state = 'complete';
    }

    this.entries.set(wave_id, updated);

    this.onProgress?.({
      wave_id,
      received: updated.received,
      total: updated.expected_total,
    });
  }

  /**
   * Check all tracked waves for deadline violations.
   *
   * Waves whose deadline has passed and are not yet in a terminal state
   * are transitioned to `'timed_out'`.
   *
   * @returns List of `wave_id` values that were transitioned to `'timed_out'`.
   */
  checkTimeout(): string[] {
    const now = Date.now();
    const timedOut: string[] = [];

    for (const [id, entry] of this.entries) {
      if (TERMINAL_STATES.has(entry.state)) continue;
      if (now >= entry.deadline) {
        this.entries.set(id, { ...entry, state: 'timed_out' });
        timedOut.push(id);
      }
    }

    return timedOut;
  }

  /**
   * Retrieve the current tracker entry for a wave.
   *
   * @param wave_id - Identifier of the wave.
   * @returns The entry, or `undefined` if the wave is not registered.
   */
  getState(wave_id: string): WaveTrackerEntry | undefined {
    return this.entries.get(wave_id);
  }

  /**
   * Check whether a wave has reached the `'complete'` state.
   *
   * @param wave_id - Identifier of the wave.
   * @returns `true` if the wave exists and its state is `'complete'`.
   */
  isComplete(wave_id: string): boolean {
    return this.entries.get(wave_id)?.state === 'complete';
  }
}
