import { beforeEach, describe, expect, it } from 'bun:test';

import { StaleDetector } from './stale-detector';

describe('StaleDetector', () => {
  let detector: StaleDetector;

  beforeEach(() => {
    detector = new StaleDetector({ threshold: 3 });
  });

  describe('record — identical signatures accumulate', () => {
    it('returns false on the first occurrence', () => {
      expect(detector.record('build.blocked', 'agent-1', 'fp-abc')).toBe(false);
    });

    it('returns false on the second consecutive identical event', () => {
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      expect(detector.record('build.blocked', 'agent-1', 'fp-abc')).toBe(false);
    });

    it('returns true on the third consecutive identical event (threshold reached)', () => {
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      expect(detector.record('build.blocked', 'agent-1', 'fp-abc')).toBe(true);
    });

    it('returns true on every subsequent identical event above the threshold', () => {
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.record('build.blocked', 'agent-1', 'fp-abc'); // threshold
      expect(detector.record('build.blocked', 'agent-1', 'fp-abc')).toBe(true);
    });
  });

  describe('record — different signature resets counter', () => {
    it('resets when any field changes (payload fingerprint)', () => {
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      // Different payload fingerprint — counter resets to 1
      expect(detector.record('build.blocked', 'agent-1', 'fp-xyz')).toBe(false);
    });

    it('resets when topic changes', () => {
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      expect(detector.record('task.start', 'agent-1', 'fp-abc')).toBe(false);
    });

    it('resets when source changes', () => {
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      expect(detector.record('build.blocked', 'agent-2', 'fp-abc')).toBe(false);
    });

    it('accumulates again after a different signature interrupts the streak', () => {
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.record('build.blocked', 'agent-1', 'fp-xyz'); // reset
      detector.record('build.blocked', 'agent-1', 'fp-abc'); // count = 1 for fp-abc again
      detector.record('build.blocked', 'agent-1', 'fp-abc'); // count = 2
      expect(detector.record('build.blocked', 'agent-1', 'fp-abc')).toBe(true); // count = 3
    });
  });

  describe('excluded topics', () => {
    it('skips task.complete by default without incrementing the counter', () => {
      const d = new StaleDetector({ threshold: 3 });
      d.record('task.complete', 'agent-1', 'fp-abc');
      d.record('task.complete', 'agent-1', 'fp-abc');
      expect(d.record('task.complete', 'agent-1', 'fp-abc')).toBe(false);
    });

    it('does not count excluded topic calls toward the threshold', () => {
      const d = new StaleDetector({ threshold: 3 });
      // Two non-excluded identical events
      d.record('build.blocked', 'agent-1', 'fp-abc');
      d.record('build.blocked', 'agent-1', 'fp-abc');
      // Excluded event in between — should not reset or increment
      d.record('task.complete', 'agent-1', 'fp-abc');
      // Third non-excluded identical event — should still reach threshold
      expect(d.record('build.blocked', 'agent-1', 'fp-abc')).toBe(true);
    });

    it('supports custom excludedTopics', () => {
      const d = new StaleDetector({ threshold: 3, excludedTopics: ['custom.skip'] });
      d.record('custom.skip', 'agent-1', 'fp-abc');
      d.record('custom.skip', 'agent-1', 'fp-abc');
      expect(d.record('custom.skip', 'agent-1', 'fp-abc')).toBe(false);
    });

    it('does not exclude task.complete when overridden with an empty list', () => {
      const d = new StaleDetector({ threshold: 3, excludedTopics: [] });
      d.record('task.complete', 'agent-1', 'fp-abc');
      d.record('task.complete', 'agent-1', 'fp-abc');
      expect(d.record('task.complete', 'agent-1', 'fp-abc')).toBe(true);
    });
  });

  describe('resetOnHatActivation', () => {
    it('clears the consecutive count', () => {
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.resetOnHatActivation();
      // After reset, two more identical events should not trigger threshold
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      expect(detector.record('build.blocked', 'agent-1', 'fp-abc')).toBe(false);
    });

    it('clears the last signature so the same event restarts from 1', () => {
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.resetOnHatActivation();
      // Exactly threshold events again — should reach threshold
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      detector.record('build.blocked', 'agent-1', 'fp-abc');
      expect(detector.record('build.blocked', 'agent-1', 'fp-abc')).toBe(true);
    });

    it('has no effect when called on a fresh detector', () => {
      detector.resetOnHatActivation();
      expect(detector.record('build.blocked', 'agent-1', 'fp-abc')).toBe(false);
    });
  });

  describe('custom threshold', () => {
    it('triggers at threshold of 1 on the first event', () => {
      const d = new StaleDetector({ threshold: 1 });
      expect(d.record('build.blocked', 'agent-1', 'fp-abc')).toBe(true);
    });

    it('triggers at threshold of 5 on the fifth consecutive event', () => {
      const d = new StaleDetector({ threshold: 5 });
      for (let i = 0; i < 4; i++) {
        expect(d.record('build.blocked', 'agent-1', 'fp-abc')).toBe(false);
      }
      expect(d.record('build.blocked', 'agent-1', 'fp-abc')).toBe(true);
    });
  });
});
