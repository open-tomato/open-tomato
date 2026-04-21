import { describe, expect, it } from 'vitest';

import { WorkerStateManager } from '../state.js';

describe('WorkerStateManager', () => {
  it('starts idle', () => {
    const state = new WorkerStateManager();
    expect(state.busy).toBe(false);
    expect(state.currentModel).toBeNull();
    expect(state.currentWorkDir).toBeNull();
  });

  it('markBusy sets busy and model', () => {
    const state = new WorkerStateManager();
    state.markBusy('sonnet');

    expect(state.busy).toBe(true);
    expect(state.currentModel).toBe('sonnet');
  });

  it('markIdle clears busy state', () => {
    const state = new WorkerStateManager();
    state.markBusy('haiku');
    state.markIdle();

    expect(state.busy).toBe(false);
    expect(state.currentModel).toBeNull();
  });

  it('setWorkDir tracks workspace', () => {
    const state = new WorkerStateManager();
    state.setWorkDir('/tmp/workspace');

    expect(state.currentWorkDir).toBe('/tmp/workspace');
  });

  it('snapshot returns immutable copy', () => {
    const state = new WorkerStateManager();
    state.markBusy('opus');
    state.setWorkDir('/tmp/work');

    const snap = state.snapshot();
    expect(snap).toEqual({
      busy: true,
      currentModel: 'opus',
      currentWorkDir: '/tmp/work',
    });

    state.markIdle();
    // Snapshot should not change
    expect(snap.busy).toBe(true);
  });
});
