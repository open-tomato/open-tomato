import { describe, expect, it } from 'vitest';

import { CircuitBreaker } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  describe('closed state', () => {
    it('reports closed for an unknown backend', () => {
      const cb = new CircuitBreaker();

      expect(cb.isOpen('claude')).toBe(false);
    });

    it('remains closed below failure threshold', () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });

      cb.recordFailure('claude');
      cb.recordFailure('claude');

      expect(cb.isOpen('claude')).toBe(false);
    });
  });

  describe('threshold opening', () => {
    it('opens the circuit when failures reach the threshold', () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });

      cb.recordFailure('claude');
      cb.recordFailure('claude');
      cb.recordFailure('claude');

      expect(cb.isOpen('claude')).toBe(true);
    });

    it('opens the circuit with a custom threshold of 1', () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });

      cb.recordFailure('gemini');

      expect(cb.isOpen('gemini')).toBe(true);
    });

    it('remains open after additional failures beyond threshold', () => {
      const cb = new CircuitBreaker({ failureThreshold: 2 });

      cb.recordFailure('codex');
      cb.recordFailure('codex');
      cb.recordFailure('codex');
      cb.recordFailure('codex');

      expect(cb.isOpen('codex')).toBe(true);
    });
  });

  describe('cool-down expiry (half-open)', () => {
    it('reports closed after cool-down window elapses', () => {
      let now = 1000;
      const cb = new CircuitBreaker(
        { failureThreshold: 2, coolDownMs: 60_000 },
        () => now,
      );

      cb.recordFailure('claude');
      cb.recordFailure('claude');
      expect(cb.isOpen('claude')).toBe(true);

      // Advance past cool-down
      now += 60_000;
      expect(cb.isOpen('claude')).toBe(false);
    });

    it('remains open just before cool-down expires', () => {
      let now = 1000;
      const cb = new CircuitBreaker(
        { failureThreshold: 2, coolDownMs: 60_000 },
        () => now,
      );

      cb.recordFailure('claude');
      cb.recordFailure('claude');

      now += 59_999;
      expect(cb.isOpen('claude')).toBe(true);
    });
  });

  describe('success reset', () => {
    it('closes the circuit and resets failures on success', () => {
      const cb = new CircuitBreaker({ failureThreshold: 2 });

      cb.recordFailure('claude');
      cb.recordFailure('claude');
      expect(cb.isOpen('claude')).toBe(true);

      cb.recordSuccess('claude');
      expect(cb.isOpen('claude')).toBe(false);
    });

    it('requires full threshold failures again after a reset', () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });

      cb.recordFailure('claude');
      cb.recordFailure('claude');
      cb.recordFailure('claude');
      expect(cb.isOpen('claude')).toBe(true);

      cb.recordSuccess('claude');

      // Two more failures — below threshold again
      cb.recordFailure('claude');
      cb.recordFailure('claude');
      expect(cb.isOpen('claude')).toBe(false);

      // Third failure reopens
      cb.recordFailure('claude');
      expect(cb.isOpen('claude')).toBe(true);
    });
  });

  describe('per-backend isolation', () => {
    it('tracks each backend independently', () => {
      const cb = new CircuitBreaker({ failureThreshold: 2 });

      cb.recordFailure('claude');
      cb.recordFailure('claude');
      cb.recordFailure('gemini');

      expect(cb.isOpen('claude')).toBe(true);
      expect(cb.isOpen('gemini')).toBe(false);
    });

    it('success on one backend does not affect another', () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });

      cb.recordFailure('claude');
      cb.recordFailure('gemini');

      cb.recordSuccess('claude');

      expect(cb.isOpen('claude')).toBe(false);
      expect(cb.isOpen('gemini')).toBe(true);
    });
  });

  describe('half-open probe', () => {
    it('re-opens on failure during half-open probe', () => {
      let now = 1000;
      const cb = new CircuitBreaker(
        { failureThreshold: 2, coolDownMs: 5000 },
        () => now,
      );

      cb.recordFailure('claude');
      cb.recordFailure('claude');
      expect(cb.isOpen('claude')).toBe(true);

      // Cool-down expires → half-open
      now += 5000;
      expect(cb.isOpen('claude')).toBe(false);

      // Probe fails → circuit re-opens immediately (failures already at threshold)
      cb.recordFailure('claude');
      expect(cb.isOpen('claude')).toBe(true);
    });

    it('closes on success during half-open probe', () => {
      let now = 1000;
      const cb = new CircuitBreaker(
        { failureThreshold: 2, coolDownMs: 5000 },
        () => now,
      );

      cb.recordFailure('claude');
      cb.recordFailure('claude');

      now += 5000;
      expect(cb.isOpen('claude')).toBe(false);

      cb.recordSuccess('claude');
      expect(cb.isOpen('claude')).toBe(false);

      // Should need full threshold again
      cb.recordFailure('claude');
      expect(cb.isOpen('claude')).toBe(false);
    });
  });
});
