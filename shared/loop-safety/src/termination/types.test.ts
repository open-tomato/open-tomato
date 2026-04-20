import { describe, expect, it } from 'bun:test';

import { TERMINATION_EXIT_CODES, TerminationReason } from './types';

describe('TerminationReason', () => {
  it('has string value equal to its key for each reason', () => {
    expect(TerminationReason.Completed as string).toBe('Completed');
    expect(TerminationReason.MaxIterations as string).toBe('MaxIterations');
    expect(TerminationReason.MaxRuntime as string).toBe('MaxRuntime');
    expect(TerminationReason.MaxCost as string).toBe('MaxCost');
    expect(TerminationReason.ConsecutiveFailures as string).toBe('ConsecutiveFailures');
    expect(TerminationReason.LoopThrashing as string).toBe('LoopThrashing');
    expect(TerminationReason.LoopStale as string).toBe('LoopStale');
    expect(TerminationReason.ValidationFailure as string).toBe('ValidationFailure');
    expect(TerminationReason.WorkspaceGone as string).toBe('WorkspaceGone');
    expect(TerminationReason.Interrupted as string).toBe('Interrupted');
  });

  it('has exactly ten reasons defined', () => {
    const reasons = Object.values(TerminationReason);
    expect(reasons).toHaveLength(10);
  });
});

describe('TERMINATION_EXIT_CODES', () => {
  it('maps Completed to exit code 0', () => {
    expect(TERMINATION_EXIT_CODES[TerminationReason.Completed]).toBe(0);
  });

  it('maps budget/limit reasons to exit code 2', () => {
    expect(TERMINATION_EXIT_CODES[TerminationReason.MaxIterations]).toBe(2);
    expect(TERMINATION_EXIT_CODES[TerminationReason.MaxRuntime]).toBe(2);
    expect(TERMINATION_EXIT_CODES[TerminationReason.MaxCost]).toBe(2);
  });

  it('maps loop safety violation reasons to exit code 1', () => {
    expect(TERMINATION_EXIT_CODES[TerminationReason.ConsecutiveFailures]).toBe(1);
    expect(TERMINATION_EXIT_CODES[TerminationReason.LoopThrashing]).toBe(1);
    expect(TERMINATION_EXIT_CODES[TerminationReason.LoopStale]).toBe(1);
    expect(TERMINATION_EXIT_CODES[TerminationReason.ValidationFailure]).toBe(1);
    expect(TERMINATION_EXIT_CODES[TerminationReason.WorkspaceGone]).toBe(1);
  });

  it('maps Interrupted to exit code 130', () => {
    expect(TERMINATION_EXIT_CODES[TerminationReason.Interrupted]).toBe(130);
  });

  it('has an entry for every TerminationReason', () => {
    const reasons = Object.values(TerminationReason) as TerminationReason[];
    for (const reason of reasons) {
      expect(TERMINATION_EXIT_CODES[reason]).toBeDefined();
    }
  });

  it('contains only the four distinct exit code values: 0, 1, 2, 130', () => {
    const codes = new Set(Object.values(TERMINATION_EXIT_CODES));
    expect(codes).toEqual(new Set([0, 1, 2, 130]));
  });
});
