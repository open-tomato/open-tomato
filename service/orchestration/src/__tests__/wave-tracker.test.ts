import type { WaveProgressCallback } from '../wave/wave-tracker.js';

import { describe, expect, it, mock } from 'bun:test';

import { WaveTracker } from '../wave/wave-tracker.js';

describe('WaveTracker', () => {
  it('transitions from registered to in_progress on first result', () => {
    const tracker = new WaveTracker();
    tracker.register('w1', 3, 10_000);

    expect(tracker.getState('w1')?.state).toBe('registered');

    tracker.recordResult('w1', 0, true);

    expect(tracker.getState('w1')?.state).toBe('in_progress');
  });

  it('transitions to complete when all results received', () => {
    const tracker = new WaveTracker();
    tracker.register('w1', 2, 10_000);

    tracker.recordResult('w1', 0, true);
    tracker.recordResult('w1', 1, true);

    expect(tracker.getState('w1')?.state).toBe('complete');
    expect(tracker.isComplete('w1')).toBe(true);
  });

  it('tracks failure indices separately from successes', () => {
    const tracker = new WaveTracker();
    tracker.register('w1', 3, 10_000);

    tracker.recordResult('w1', 0, true);
    tracker.recordResult('w1', 1, false);
    tracker.recordResult('w1', 2, true);

    const entry = tracker.getState('w1');
    expect(entry?.failures).toEqual([1]);
    expect(entry?.worker_indices).toEqual([0, 1, 2]);
    expect(entry?.received).toBe(3);
    expect(entry?.state).toBe('complete');
  });

  it('transitions to timed_out when deadline exceeded before completion', () => {
    const tracker = new WaveTracker();
    // Register with a deadline already in the past
    tracker.register('w1', 3, -1);

    const timedOut = tracker.checkTimeout();

    expect(timedOut).toEqual(['w1']);
    expect(tracker.getState('w1')?.state).toBe('timed_out');
  });

  it('does not transition a completed wave to timed_out', () => {
    const tracker = new WaveTracker();
    tracker.register('w1', 1, -1);

    // Complete the wave before checking timeout
    tracker.recordResult('w1', 0, true);
    expect(tracker.getState('w1')?.state).toBe('complete');

    const timedOut = tracker.checkTimeout();

    expect(timedOut).toEqual([]);
    expect(tracker.getState('w1')?.state).toBe('complete');
  });

  it('emits progress callback on each result', () => {
    const onProgress = mock<WaveProgressCallback>(() => {});
    const tracker = new WaveTracker(onProgress);
    tracker.register('w1', 3, 10_000);

    tracker.recordResult('w1', 0, true);
    tracker.recordResult('w1', 1, false);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0]).toEqual([
      { wave_id: 'w1', received: 1, total: 3 },
    ]);
    expect(onProgress.mock.calls[1]).toEqual([
      { wave_id: 'w1', received: 2, total: 3 },
    ]);
  });

  it('no-ops when recording a result for an unregistered wave_id', () => {
    const onProgress = mock<WaveProgressCallback>(() => {});
    const tracker = new WaveTracker(onProgress);

    // Should not throw
    tracker.recordResult('unknown-wave', 0, true);

    expect(onProgress).not.toHaveBeenCalled();
    expect(tracker.getState('unknown-wave')).toBeUndefined();
  });

  it('returns undefined for an unregistered wave_id', () => {
    const tracker = new WaveTracker();

    expect(tracker.getState('unknown')).toBeUndefined();
    expect(tracker.isComplete('unknown')).toBe(false);
  });

  it('does not record results on a terminal wave', () => {
    const onProgress = mock<WaveProgressCallback>(() => {});
    const tracker = new WaveTracker(onProgress);
    tracker.register('w1', 2, 10_000);

    tracker.recordResult('w1', 0, true);
    tracker.recordResult('w1', 1, true);
    expect(tracker.isComplete('w1')).toBe(true);

    // Attempt to record after completion
    tracker.recordResult('w1', 2, true);

    expect(tracker.getState('w1')?.received).toBe(2);
    expect(onProgress).toHaveBeenCalledTimes(2);
  });

  it('does not transition a timed_out wave on subsequent results', () => {
    const tracker = new WaveTracker();
    tracker.register('w1', 3, -1);
    tracker.checkTimeout();

    expect(tracker.getState('w1')?.state).toBe('timed_out');

    tracker.recordResult('w1', 0, true);

    expect(tracker.getState('w1')?.state).toBe('timed_out');
    expect(tracker.getState('w1')?.received).toBe(0);
  });

  it('checks timeout across multiple waves independently', () => {
    const tracker = new WaveTracker();
    tracker.register('expired', 2, -1);
    tracker.register('active', 2, 60_000);

    const timedOut = tracker.checkTimeout();

    expect(timedOut).toEqual(['expired']);
    expect(tracker.getState('expired')?.state).toBe('timed_out');
    expect(tracker.getState('active')?.state).toBe('registered');
  });
});
