import type { OrchestratorContext } from './state-snapshot.js';

import { describe, expect, it } from 'vitest';

import { captureStateSnapshot, stateSnapshotSchema } from './state-snapshot.js';

function createContext(
  overrides: Partial<OrchestratorContext> = {},
): OrchestratorContext {
  return {
    iterationIndex: 3,
    hat: 'planner',
    taskCounts: { pending: 2, inProgress: 1, completed: 5, failed: 0 },
    cost: { inputTokens: 1200, outputTokens: 800, estimatedCostUsd: 0.04 },
    activeTaskId: 'task-42',
    ...overrides,
  };
}

describe('captureStateSnapshot', () => {
  it('copies all fields from the context into the snapshot', () => {
    const ctx = createContext();
    const snap = captureStateSnapshot(ctx);

    expect(snap.iterationIndex).toBe(3);
    expect(snap.hat).toBe('planner');
    expect(snap.taskCounts).toEqual({
      pending: 2,
      inProgress: 1,
      completed: 5,
      failed: 0,
    });
    expect(snap.cost).toEqual({
      inputTokens: 1200,
      outputTokens: 800,
      estimatedCostUsd: 0.04,
    });
    expect(snap.activeTaskId).toBe('task-42');
    expect(snap.capturedAt).toBeDefined();
  });

  it('produces a valid ISO-8601 capturedAt timestamp', () => {
    const snap = captureStateSnapshot(createContext());

    expect(() => new Date(snap.capturedAt).toISOString()).not.toThrow();
  });

  it('validates against the stateSnapshotSchema', () => {
    const snap = captureStateSnapshot(createContext());

    expect(() => stateSnapshotSchema.parse(snap)).not.toThrow();
  });

  it('handles null hat and null activeTaskId', () => {
    const snap = captureStateSnapshot(
      createContext({ hat: null, activeTaskId: null }),
    );

    expect(snap.hat).toBeNull();
    expect(snap.activeTaskId).toBeNull();
    expect(() => stateSnapshotSchema.parse(snap)).not.toThrow();
  });

  // --- Pure read: no side effects on source context ---

  it('does not mutate the source context object', () => {
    const ctx = createContext();
    const originalTaskCounts = { ...ctx.taskCounts };
    const originalCost = { ...ctx.cost };

    captureStateSnapshot(ctx);

    expect(ctx.taskCounts).toEqual(originalTaskCounts);
    expect(ctx.cost).toEqual(originalCost);
    expect(ctx.iterationIndex).toBe(3);
    expect(ctx.hat).toBe('planner');
    expect(ctx.activeTaskId).toBe('task-42');
  });

  it('returns a snapshot whose taskCounts is a distinct object from context', () => {
    const ctx = createContext();
    const snap = captureStateSnapshot(ctx);

    expect(snap.taskCounts).not.toBe(ctx.taskCounts);
  });

  it('returns a snapshot whose cost is a distinct object from context', () => {
    const ctx = createContext();
    const snap = captureStateSnapshot(ctx);

    expect(snap.cost).not.toBe(ctx.cost);
  });

  // --- Immutability of the returned snapshot ---

  it('freezes the top-level snapshot object', () => {
    const snap = captureStateSnapshot(createContext());

    expect(Object.isFrozen(snap)).toBe(true);
  });

  it('freezes the nested taskCounts object', () => {
    const snap = captureStateSnapshot(createContext());

    expect(Object.isFrozen(snap.taskCounts)).toBe(true);
  });

  it('freezes the nested cost object', () => {
    const snap = captureStateSnapshot(createContext());

    expect(Object.isFrozen(snap.cost)).toBe(true);
  });

  it('mutations on the snapshot throw in strict mode', () => {
    const snap = captureStateSnapshot(createContext());

    expect(() => {
      (snap as Record<string, unknown>).iterationIndex = 999;
    }).toThrow();

    expect(() => {
      (snap.taskCounts as Record<string, unknown>).pending = 999;
    }).toThrow();

    expect(() => {
      (snap.cost as Record<string, unknown>).inputTokens = 999;
    }).toThrow();
  });

  // --- Isolation: mutating the context after capture doesn't affect snapshot ---

  it('is isolated from subsequent context mutations', () => {
    const ctx = createContext();
    const snap = captureStateSnapshot(ctx);

    // Mutate the source context after capture
    (ctx as Record<string, unknown>).iterationIndex = 99;
    (ctx.taskCounts as Record<string, unknown>).pending = 99;
    (ctx.cost as Record<string, unknown>).inputTokens = 99999;

    expect(snap.iterationIndex).toBe(3);
    expect(snap.taskCounts.pending).toBe(2);
    expect(snap.cost.inputTokens).toBe(1200);
  });
});
