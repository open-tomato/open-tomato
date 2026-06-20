import { describe, expect, it, mock } from 'bun:test';

import { BackpressureValidator } from './backpressure-validator';
import { BudgetTracker } from './budget-tracker';
import { FailureTracker } from './failure-tracker';
import { StaleDetector } from './stale-detector';
import { TerminationChecker, TerminationCheckerConfig } from './termination-checker';
import { ThrottleTracker } from './throttle-tracker';
import { TerminationReason } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<TerminationCheckerConfig> = {}): TerminationCheckerConfig {
  return {
    maxIterations: 100,
    maxRuntimeMs: 60_000,
    maxCostUsd: 10,
    maxConsecutiveFailures: 3,
    startTime: Date.now(),
    ...overrides,
  };
}

function makeWorkspaceExists(returns: boolean | Promise<boolean> = true) {
  return mock(() => returns);
}

function makeMocks() {
  const budgetTracker = {
    isExceeded: mock(() => false),
    totalCost: 0,
    addCost: mock(() => undefined),
  } as unknown as BudgetTracker;

  const failureTracker = {
    isExceeded: mock(() => false),
    recordSuccess: mock(() => undefined),
    recordFailure: mock(() => 1),
  } as unknown as FailureTracker;

  const staleDetector = {
    record: mock(() => false),
    resetOnHatActivation: mock(() => undefined),
  } as unknown as StaleDetector;

  const throttleTracker = {
    isThrashing: mock(() => false),
    recordBlock: mock(() => false),
    recordRedispatch: mock(() => 0),
    reset: mock(() => undefined),
  } as unknown as ThrottleTracker;

  const backpressureValidator = {
    validateJsonl: mock(() => null as string | null),
    recordMalformed: mock(() => false),
    recordValid: mock(() => undefined),
    validateBuildEvidence: mock(() => null as string | null),
  } as unknown as BackpressureValidator;

  return { budgetTracker, failureTracker, staleDetector, throttleTracker, backpressureValidator };
}

// ---------------------------------------------------------------------------
// Tests — each termination path covered independently
// ---------------------------------------------------------------------------

describe('TerminationChecker.check', () => {
  describe('MaxCost — fires when budget is exceeded', () => {
    it('returns MaxCost termination result', async () => {
      const mocks = makeMocks();
      (mocks.budgetTracker.isExceeded as ReturnType<typeof mock>).mockReturnValue(true);
      Object.defineProperty(mocks.budgetTracker, 'totalCost', { get: () => 12.5 });

      const checker = new TerminationChecker(
        makeConfig({ maxCostUsd: 10 }),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      const result = await checker.check(1);
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toBe(TerminationReason.MaxCost);
      expect(result.exitCode).toBe(2);
      expect(result.detail).toContain('12.5');
    });
  });

  describe('MaxIterations — fires when iteration >= maxIterations', () => {
    it('returns MaxIterations at the limit', async () => {
      const mocks = makeMocks();
      const checker = new TerminationChecker(
        makeConfig({ maxIterations: 10 }),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      const result = await checker.check(10);
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toBe(TerminationReason.MaxIterations);
      expect(result.exitCode).toBe(2);
    });

    it('does not fire below the limit', async () => {
      const mocks = makeMocks();
      const checker = new TerminationChecker(
        makeConfig({ maxIterations: 10 }),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      const result = await checker.check(9);
      expect(result.shouldTerminate).toBe(false);
    });
  });

  describe('MaxRuntime — fires when elapsed time exceeds limit', () => {
    it('returns MaxRuntime when elapsed > maxRuntimeMs', async () => {
      const mocks = makeMocks();
      const checker = new TerminationChecker(
        makeConfig({ maxRuntimeMs: 100, startTime: Date.now() - 200 }),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      const result = await checker.check(1);
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toBe(TerminationReason.MaxRuntime);
      expect(result.exitCode).toBe(2);
    });
  });

  describe('ConsecutiveFailures — fires when failure tracker is exceeded', () => {
    it('returns ConsecutiveFailures when isExceeded is true', async () => {
      const mocks = makeMocks();
      (mocks.failureTracker.isExceeded as ReturnType<typeof mock>).mockReturnValue(true);

      const checker = new TerminationChecker(
        makeConfig({ maxConsecutiveFailures: 3 }),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      const result = await checker.check(1);
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toBe(TerminationReason.ConsecutiveFailures);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('LoopStale — fires after recordEvent signals stale', () => {
    it('returns LoopStale after three identical events', async () => {
      const mocks = makeMocks();
      let callCount = 0;
      (mocks.staleDetector.record as ReturnType<typeof mock>).mockImplementation(() => {
        callCount += 1;
        return callCount >= 3;
      });

      const checker = new TerminationChecker(
        makeConfig(),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      checker.recordEvent('build.blocked', 'agent-1', 'fp-abc');
      checker.recordEvent('build.blocked', 'agent-1', 'fp-abc');
      checker.recordEvent('build.blocked', 'agent-1', 'fp-abc');

      const result = await checker.check(1);
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toBe(TerminationReason.LoopStale);
      expect(result.exitCode).toBe(1);
    });

    it('does not fire when stale threshold is not reached', async () => {
      const mocks = makeMocks();
      const checker = new TerminationChecker(
        makeConfig(),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      checker.recordEvent('build.blocked', 'agent-1', 'fp-abc');
      checker.recordEvent('build.blocked', 'agent-1', 'fp-abc');

      const result = await checker.check(1);
      expect(result.shouldTerminate).toBe(false);
    });
  });

  describe('LoopThrashing — fires when throttleTracker.isThrashing() is true', () => {
    it('returns LoopThrashing when isThrashing returns true', async () => {
      const mocks = makeMocks();
      (mocks.throttleTracker.isThrashing as ReturnType<typeof mock>).mockReturnValue(true);

      const checker = new TerminationChecker(
        makeConfig(),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      const result = await checker.check(1);
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toBe(TerminationReason.LoopThrashing);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('ValidationFailure — fires after three consecutive malformed JSONL', () => {
    it('returns ValidationFailure after threshold is exceeded', async () => {
      const mocks = makeMocks();
      let malformedCount = 0;
      (mocks.backpressureValidator.validateJsonl as ReturnType<typeof mock>).mockReturnValue('Invalid JSONL: error');
      (mocks.backpressureValidator.recordMalformed as ReturnType<typeof mock>).mockImplementation(() => {
        malformedCount += 1;
        return malformedCount >= 3;
      });

      const checker = new TerminationChecker(
        makeConfig(),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      checker.validateJsonl('{bad json');
      checker.validateJsonl('{bad json');
      checker.validateJsonl('{bad json');

      const result = await checker.check(1);
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toBe(TerminationReason.ValidationFailure);
      expect(result.exitCode).toBe(1);
    });

    it('does not fire before threshold', async () => {
      const mocks = makeMocks();
      let malformedCount = 0;
      (mocks.backpressureValidator.validateJsonl as ReturnType<typeof mock>).mockReturnValue('Invalid JSONL: error');
      (mocks.backpressureValidator.recordMalformed as ReturnType<typeof mock>).mockImplementation(() => {
        malformedCount += 1;
        return malformedCount >= 3;
      });

      const checker = new TerminationChecker(
        makeConfig(),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      checker.validateJsonl('{bad json');
      checker.validateJsonl('{bad json');

      const result = await checker.check(1);
      expect(result.shouldTerminate).toBe(false);
    });
  });

  describe('WorkspaceGone — fires when workspace does not exist', () => {
    it('returns WorkspaceGone when workspaceExists returns false', async () => {
      const mocks = makeMocks();
      const checker = new TerminationChecker(
        makeConfig(),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(false),
      );

      const result = await checker.check(1);
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toBe(TerminationReason.WorkspaceGone);
      expect(result.exitCode).toBe(1);
    });

    it('works with an async workspaceExists returning false', async () => {
      const mocks = makeMocks();
      const checker = new TerminationChecker(
        makeConfig(),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(Promise.resolve(false)),
      );

      const result = await checker.check(1);
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toBe(TerminationReason.WorkspaceGone);
    });
  });

  describe('Continue — returns shouldTerminate: false when no condition is met', () => {
    it('returns shouldTerminate false with no extra fields', async () => {
      const mocks = makeMocks();
      const checker = new TerminationChecker(
        makeConfig(),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      const result = await checker.check(1);
      expect(result.shouldTerminate).toBe(false);
      expect(result.reason).toBeUndefined();
      expect(result.exitCode).toBeUndefined();
      expect(result.detail).toBeUndefined();
    });
  });

  describe('Decision tree order — MaxCost fires before MaxIterations when both exceeded', () => {
    it('returns MaxCost, not MaxIterations, when both limits are reached', async () => {
      const mocks = makeMocks();
      (mocks.budgetTracker.isExceeded as ReturnType<typeof mock>).mockReturnValue(true);
      Object.defineProperty(mocks.budgetTracker, 'totalCost', { get: () => 15 });

      const checker = new TerminationChecker(
        makeConfig({ maxIterations: 5, maxCostUsd: 10 }),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      const result = await checker.check(5);
      expect(result.reason).toBe(TerminationReason.MaxCost);
    });

    it('returns MaxIterations before MaxRuntime when budget is not exceeded', async () => {
      const mocks = makeMocks();
      const checker = new TerminationChecker(
        makeConfig({ maxIterations: 5, maxRuntimeMs: 1, startTime: Date.now() - 1000 }),
        mocks.budgetTracker,
        mocks.failureTracker,
        mocks.staleDetector,
        mocks.throttleTracker,
        mocks.backpressureValidator,
        makeWorkspaceExists(true),
      );

      const result = await checker.check(5);
      expect(result.reason).toBe(TerminationReason.MaxIterations);
    });
  });
});

// ---------------------------------------------------------------------------
// validateJsonl delegation
// ---------------------------------------------------------------------------

describe('TerminationChecker.validateJsonl', () => {
  it('returns null for valid JSON and calls recordValid', () => {
    const mocks = makeMocks();
    (mocks.backpressureValidator.validateJsonl as ReturnType<typeof mock>).mockReturnValue(null);

    const checker = new TerminationChecker(
      makeConfig(),
      mocks.budgetTracker,
      mocks.failureTracker,
      mocks.staleDetector,
      mocks.throttleTracker,
      mocks.backpressureValidator,
      makeWorkspaceExists(true),
    );

    const result = checker.validateJsonl('{"ok":true}');
    expect(result).toBeNull();
    expect(mocks.backpressureValidator.recordValid).toHaveBeenCalledTimes(1);
    expect(mocks.backpressureValidator.recordMalformed).not.toHaveBeenCalled();
  });

  it('returns error string for invalid JSON and calls recordMalformed', () => {
    const mocks = makeMocks();
    (mocks.backpressureValidator.validateJsonl as ReturnType<typeof mock>).mockReturnValue('Invalid JSONL: Unexpected token');

    const checker = new TerminationChecker(
      makeConfig(),
      mocks.budgetTracker,
      mocks.failureTracker,
      mocks.staleDetector,
      mocks.throttleTracker,
      mocks.backpressureValidator,
      makeWorkspaceExists(true),
    );

    const result = checker.validateJsonl('{bad}');
    expect(result).toBe('Invalid JSONL: Unexpected token');
    expect(mocks.backpressureValidator.recordMalformed).toHaveBeenCalledTimes(1);
    expect(mocks.backpressureValidator.recordValid).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Integration-style test — real detector instances, full thrashing scenario
// ---------------------------------------------------------------------------

describe('TerminationChecker integration — thrashing scenario', () => {
  it('detects thrashing after three abandoned-task redispatches using real detectors', async () => {
    const budgetTracker = new BudgetTracker({ maxCostUsd: 100 });
    const failureTracker = new FailureTracker({ maxConsecutiveFailures: 5 });
    const staleDetector = new StaleDetector({ threshold: 3 });
    const throttleTracker = new ThrottleTracker({ blockThreshold: 3, redispatchThreshold: 3 });
    const backpressureValidator = new BackpressureValidator();

    const checker = new TerminationChecker(
      makeConfig({ maxIterations: 1000, maxRuntimeMs: 600_000 }),
      budgetTracker,
      failureTracker,
      staleDetector,
      throttleTracker,
      backpressureValidator,
      () => true,
    );

    // Block task-1 three times → it becomes abandoned
    throttleTracker.recordBlock('task-1');
    throttleTracker.recordBlock('task-1');
    throttleTracker.recordBlock('task-1');

    // Redispatch the abandoned task three times → isThrashing() = true
    throttleTracker.recordRedispatch('task-1');
    throttleTracker.recordRedispatch('task-1');
    throttleTracker.recordRedispatch('task-1');

    const result = await checker.check(1);
    expect(result.shouldTerminate).toBe(true);
    expect(result.reason).toBe(TerminationReason.LoopThrashing);
    expect(result.exitCode).toBe(1);
  });

  it('detects stale loop after three identical events using real detectors', async () => {
    const budgetTracker = new BudgetTracker({ maxCostUsd: 100 });
    const failureTracker = new FailureTracker({ maxConsecutiveFailures: 5 });
    const staleDetector = new StaleDetector({ threshold: 3 });
    const throttleTracker = new ThrottleTracker({ blockThreshold: 3, redispatchThreshold: 3 });
    const backpressureValidator = new BackpressureValidator();

    const checker = new TerminationChecker(
      makeConfig({ maxIterations: 1000, maxRuntimeMs: 600_000 }),
      budgetTracker,
      failureTracker,
      staleDetector,
      throttleTracker,
      backpressureValidator,
      () => true,
    );

    checker.recordEvent('build.blocked', 'agent-x', 'payload-hash-1');
    checker.recordEvent('build.blocked', 'agent-x', 'payload-hash-1');
    checker.recordEvent('build.blocked', 'agent-x', 'payload-hash-1');

    const result = await checker.check(1);
    expect(result.shouldTerminate).toBe(true);
    expect(result.reason).toBe(TerminationReason.LoopStale);
  });

  it('continues normally when no conditions are triggered', async () => {
    const budgetTracker = new BudgetTracker({ maxCostUsd: 100 });
    const failureTracker = new FailureTracker({ maxConsecutiveFailures: 5 });
    const staleDetector = new StaleDetector({ threshold: 3 });
    const throttleTracker = new ThrottleTracker({ blockThreshold: 3, redispatchThreshold: 3 });
    const backpressureValidator = new BackpressureValidator();

    const checker = new TerminationChecker(
      makeConfig({ maxIterations: 1000, maxRuntimeMs: 600_000 }),
      budgetTracker,
      failureTracker,
      staleDetector,
      throttleTracker,
      backpressureValidator,
      () => true,
    );

    budgetTracker.addCost(0.5);
    failureTracker.recordFailure();
    checker.recordEvent('build.blocked', 'agent-x', 'payload-1');
    checker.recordEvent('build.blocked', 'agent-x', 'payload-2');
    checker.validateJsonl('{"valid": true}');

    const result = await checker.check(5);
    expect(result.shouldTerminate).toBe(false);
  });
});
