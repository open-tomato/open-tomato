import { beforeEach, describe, expect, it } from 'bun:test';

import { BudgetTracker } from './budget-tracker';

describe('BudgetTracker', () => {
  let tracker: BudgetTracker;

  beforeEach(() => {
    tracker = new BudgetTracker({ maxCostUsd: 10 });
  });

  describe('addCost — cost accumulates across multiple additions', () => {
    it('starts at zero', () => {
      expect(tracker.totalCost).toBe(0);
    });

    it('reflects a single addition', () => {
      tracker.addCost(3);
      expect(tracker.totalCost).toBe(3);
    });

    it('accumulates across multiple additions', () => {
      tracker.addCost(2);
      tracker.addCost(4.5);
      tracker.addCost(1);
      expect(tracker.totalCost).toBe(7.5);
    });
  });

  describe('isExceeded', () => {
    it('returns false when no cost has been added', () => {
      expect(tracker.isExceeded()).toBe(false);
    });

    it('returns false below the limit', () => {
      tracker.addCost(9.99);
      expect(tracker.isExceeded()).toBe(false);
    });

    it('returns true at the limit', () => {
      tracker.addCost(10);
      expect(tracker.isExceeded()).toBe(true);
    });

    it('returns true above the limit', () => {
      tracker.addCost(10.01);
      expect(tracker.isExceeded()).toBe(true);
    });

    it('returns true when multiple additions cross the limit', () => {
      tracker.addCost(6);
      tracker.addCost(5);
      expect(tracker.isExceeded()).toBe(true);
    });
  });

  describe('totalCost getter', () => {
    it('reflects accumulated value after additions', () => {
      tracker.addCost(1.25);
      tracker.addCost(0.75);
      expect(tracker.totalCost).toBe(2);
    });

    it('does not change without addCost calls', () => {
      const before = tracker.totalCost;
      const after = tracker.totalCost;
      expect(before).toBe(after);
    });
  });

  describe('limit of 0', () => {
    it('isExceeded returns true immediately without any cost added', () => {
      const t = new BudgetTracker({ maxCostUsd: 0 });
      expect(t.isExceeded()).toBe(true);
    });
  });
});
