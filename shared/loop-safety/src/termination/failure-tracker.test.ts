import { beforeEach, describe, expect, it } from 'bun:test';

import { FailureTracker } from './failure-tracker';

describe('FailureTracker', () => {
  let tracker: FailureTracker;

  beforeEach(() => {
    tracker = new FailureTracker({ maxConsecutiveFailures: 3 });
  });

  describe('recordFailure — failures accumulate', () => {
    it('returns 1 on the first failure', () => {
      expect(tracker.recordFailure()).toBe(1);
    });

    it('returns 2 on the second consecutive failure', () => {
      tracker.recordFailure();
      expect(tracker.recordFailure()).toBe(2);
    });

    it('returns 3 on the third consecutive failure', () => {
      tracker.recordFailure();
      tracker.recordFailure();
      expect(tracker.recordFailure()).toBe(3);
    });
  });

  describe('recordSuccess — resets counter to zero', () => {
    it('resets the counter after one failure', () => {
      tracker.recordFailure();
      tracker.recordSuccess();
      expect(tracker.recordFailure()).toBe(1);
    });

    it('resets the counter after multiple failures', () => {
      tracker.recordFailure();
      tracker.recordFailure();
      tracker.recordFailure();
      tracker.recordSuccess();
      expect(tracker.recordFailure()).toBe(1);
    });

    it('has no effect on a fresh tracker', () => {
      tracker.recordSuccess();
      expect(tracker.recordFailure()).toBe(1);
    });
  });

  describe('isExceeded', () => {
    it('returns false when no failures have been recorded', () => {
      expect(tracker.isExceeded()).toBe(false);
    });

    it('returns false below the threshold', () => {
      tracker.recordFailure();
      tracker.recordFailure();
      expect(tracker.isExceeded()).toBe(false);
    });

    it('returns true at the threshold', () => {
      tracker.recordFailure();
      tracker.recordFailure();
      tracker.recordFailure();
      expect(tracker.isExceeded()).toBe(true);
    });

    it('returns true above the threshold', () => {
      tracker.recordFailure();
      tracker.recordFailure();
      tracker.recordFailure();
      tracker.recordFailure();
      expect(tracker.isExceeded()).toBe(true);
    });

    it('returns false again after recordSuccess resets the counter', () => {
      tracker.recordFailure();
      tracker.recordFailure();
      tracker.recordFailure();
      tracker.recordSuccess();
      expect(tracker.isExceeded()).toBe(false);
    });
  });

  describe('threshold of 1', () => {
    it('isExceeded returns true after a single failure', () => {
      const t = new FailureTracker({ maxConsecutiveFailures: 1 });
      t.recordFailure();
      expect(t.isExceeded()).toBe(true);
    });
  });
});
