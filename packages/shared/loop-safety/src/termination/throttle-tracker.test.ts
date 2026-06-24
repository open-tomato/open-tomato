import { beforeEach, describe, expect, it } from 'bun:test';

import { ThrottleTracker } from './throttle-tracker';

describe('ThrottleTracker', () => {
  let tracker: ThrottleTracker;

  beforeEach(() => {
    tracker = new ThrottleTracker({ blockThreshold: 3, redispatchThreshold: 3 });
  });

  describe('recordBlock', () => {
    it('returns false on the first block for a task', () => {
      expect(tracker.recordBlock('task-1')).toBe(false);
    });

    it('returns false on the second block for a task', () => {
      tracker.recordBlock('task-1');
      expect(tracker.recordBlock('task-1')).toBe(false);
    });

    it('returns true on the third block (crossing threshold) and marks task abandoned', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      expect(tracker.recordBlock('task-1')).toBe(true);
    });

    it('returns false on subsequent blocks after task is already abandoned', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1'); // abandoned
      expect(tracker.recordBlock('task-1')).toBe(false);
    });

    it('tracks block counts independently per task ID', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      expect(tracker.recordBlock('task-2')).toBe(false); // task-2 only has 1 block
      expect(tracker.recordBlock('task-1')).toBe(true);  // task-1 hits threshold
    });
  });

  describe('recordRedispatch', () => {
    it('does not increment the counter when task is not abandoned', () => {
      const count = tracker.recordRedispatch('task-1');
      expect(count).toBe(0);
    });

    it('increments the counter when the task is abandoned', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1'); // abandoned

      const count = tracker.recordRedispatch('task-1');
      expect(count).toBe(1);
    });

    it('returns current count when task is not in abandoned set', () => {
      // First abandon task-1 and redispatch it once
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordRedispatch('task-1'); // count = 1

      // task-2 is not abandoned — count should stay at 1
      const count = tracker.recordRedispatch('task-2');
      expect(count).toBe(1);
    });

    it('increments correctly across multiple redispatches', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1'); // abandoned

      expect(tracker.recordRedispatch('task-1')).toBe(1);
      expect(tracker.recordRedispatch('task-1')).toBe(2);
      expect(tracker.recordRedispatch('task-1')).toBe(3);
    });
  });

  describe('isThrashing', () => {
    it('returns false when no redispatches have occurred', () => {
      expect(tracker.isThrashing()).toBe(false);
    });

    it('returns false below the redispatch threshold', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1'); // abandoned

      tracker.recordRedispatch('task-1');
      tracker.recordRedispatch('task-1');
      expect(tracker.isThrashing()).toBe(false);
    });

    it('returns true when redispatch count reaches the threshold', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1'); // abandoned

      tracker.recordRedispatch('task-1');
      tracker.recordRedispatch('task-1');
      tracker.recordRedispatch('task-1'); // threshold reached
      expect(tracker.isThrashing()).toBe(true);
    });

    it('returns true above the threshold', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1'); // abandoned

      tracker.recordRedispatch('task-1');
      tracker.recordRedispatch('task-1');
      tracker.recordRedispatch('task-1');
      tracker.recordRedispatch('task-1'); // above threshold
      expect(tracker.isThrashing()).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears block counts', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.reset();
      // After reset, task-1 counts from zero again — third block triggers abandonment
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      expect(tracker.recordBlock('task-1')).toBe(true);
    });

    it('clears abandoned tasks', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1'); // abandoned
      tracker.reset();

      // task-1 is no longer abandoned — redispatch should not count
      const count = tracker.recordRedispatch('task-1');
      expect(count).toBe(0);
    });

    it('resets the redispatch counter', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1'); // abandoned
      tracker.recordRedispatch('task-1');
      tracker.recordRedispatch('task-1');
      tracker.recordRedispatch('task-1'); // thrashing

      tracker.reset();
      expect(tracker.isThrashing()).toBe(false);
    });

    it('clears all state together', () => {
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordBlock('task-1');
      tracker.recordRedispatch('task-1');
      tracker.reset();

      expect(tracker.isThrashing()).toBe(false);
      // Confirm block count cleared: need 3 blocks to abandon again
      expect(tracker.recordBlock('task-1')).toBe(false);
      expect(tracker.recordBlock('task-1')).toBe(false);
      expect(tracker.recordBlock('task-1')).toBe(true);
    });
  });

  describe('custom thresholds', () => {
    it('respects a blockThreshold of 1', () => {
      const t = new ThrottleTracker({ blockThreshold: 1, redispatchThreshold: 3 });
      expect(t.recordBlock('task-1')).toBe(true);
    });

    it('respects a redispatchThreshold of 1', () => {
      const t = new ThrottleTracker({ blockThreshold: 1, redispatchThreshold: 1 });
      t.recordBlock('task-1'); // abandoned immediately
      t.recordRedispatch('task-1');
      expect(t.isThrashing()).toBe(true);
    });
  });
});
