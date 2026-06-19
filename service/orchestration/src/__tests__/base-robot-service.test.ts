import { describe, expect, it } from 'bun:test';

import { BaseRobotService } from '../base-robot-service.js';
import { waitForResponse } from '../wait-for-response.js';

/**
 * Minimal concrete subclass for testing the abstract base.
 *
 * `sendQuestion` delegates to {@link waitForResponse} so that injecting a
 * response via {@link injectResponse} actually unblocks the caller — this
 * mirrors how a real transport adapter would wire things up.
 */
class TestRobotService extends BaseRobotService {
  async sendQuestion(
    sessionId: string,
    _question: string,
    timeoutMs = 5_000,
  ): Promise<string | null> {
    return waitForResponse(
      this.pendingResponses,
      sessionId,
      timeoutMs,
      /* pollIntervalMs */ 10,
      this.shutdownSignal,
    );
  }
   
  async sendCheckin(sessionId: string, message: string): Promise<void> {
    console.log(`Check-in for session ${sessionId}: ${message}`);
    // no-op
  }

  /** Expose protected helper for testing. */
  testInjectGuidanceEntry(sessionId: string, text: string): void {
    this.injectGuidanceEntry(sessionId, text);
  }

  /** Expose protected helper for testing. */
  testInjectResponse(sessionId: string, text: string): void {
    this.injectResponse(sessionId, text);
  }

  /** Expose pending responses map for assertions. */
  get testPendingResponses(): Map<string, string> {
    return this.pendingResponses;
  }

  /** Expose guidance accumulator for assertions. */
  get testGuidanceAccumulator() {
    return this.guidanceAccumulator;
  }

  /** Expose protected signal for testing. */
  get testShutdownSignal(): AbortSignal {
    return this.shutdownSignal;
  }
}

describe('BaseRobotService', () => {
  // ── Response injection unblocks sendQuestion ──────────────────────────

  describe('sendQuestion / injectResponse integration', () => {
    it('resolves with the injected response text', async () => {
      const service = new TestRobotService();
      const questionPromise = service.sendQuestion('s1', 'approve?');

      // Inject response after a small delay so the poll loop picks it up
      setTimeout(() => service.testInjectResponse('s1', 'approved'), 30);

      const result = await questionPromise;
      expect(result).toBe('approved');
    });

    it('only unblocks the matching session', async () => {
      const service = new TestRobotService();

      const q1 = service.sendQuestion('s1', 'question-1');
      const q2 = service.sendQuestion('s2', 'question-2');

      setTimeout(() => {
        service.testInjectResponse('s2', 'answer-2');
        service.testInjectResponse('s1', 'answer-1');
      }, 30);

      const [r1, r2] = await Promise.all([q1, q2]);
      expect(r1).toBe('answer-1');
      expect(r2).toBe('answer-2');
    });

    it('returns null when timeout expires without a response', async () => {
      const service = new TestRobotService();

      const result = await service.sendQuestion('s1', 'hello?', 50);

      expect(result).toBeNull();
    });

    it('consumes the response so a second call does not see it', async () => {
      const service = new TestRobotService();

      service.testInjectResponse('s1', 'once');

      const first = await service.sendQuestion('s1', 'q1');
      expect(first).toBe('once');

      // Second call should timeout because the response was consumed
      const second = await service.sendQuestion('s1', 'q2', 50);
      expect(second).toBeNull();
    });
  });

  // ── Guidance injection is retrievable via accumulator ─────────────────

  describe('injectGuidanceEntry', () => {
    it('accumulates guidance and notifies registered handler', () => {
      const service = new TestRobotService();
      const received: Array<{ sessionId: string; guidance: string }> = [];

      service.onGuidance((sessionId, guidance) => {
        received.push({ sessionId, guidance });
      });

      service.testInjectGuidanceEntry('s1', 'do X');

      expect(received).toEqual([{ sessionId: 's1', guidance: 'do X' }]);
      expect(service.testGuidanceAccumulator.flush('s1')).toBe('1. do X');
    });

    it('invokes multiple registered handlers in order', () => {
      const service = new TestRobotService();
      const order: number[] = [];

      service.onGuidance(() => order.push(1));
      service.onGuidance(() => order.push(2));
      service.onGuidance(() => order.push(3));

      service.testInjectGuidanceEntry('s1', 'msg');

      expect(order).toEqual([1, 2, 3]);
    });

    it('does nothing harmful when no handlers are registered', () => {
      const service = new TestRobotService();
      // Should not throw, and should still accumulate
      service.testInjectGuidanceEntry('s1', 'msg');

      expect(service.testGuidanceAccumulator.flush('s1')).toBe('1. msg');
    });

    it('accumulates multiple entries retrievable via flush', () => {
      const service = new TestRobotService();

      service.testInjectGuidanceEntry('s1', 'first');
      service.testInjectGuidanceEntry('s1', 'second');

      expect(service.testGuidanceAccumulator.flush('s1')).toBe(
        '1. first\n2. second',
      );
    });

    it('accumulates entries independently per session', () => {
      const service = new TestRobotService();

      service.testInjectGuidanceEntry('s1', 'alpha');
      service.testInjectGuidanceEntry('s2', 'beta');

      expect(service.testGuidanceAccumulator.flush('s1')).toBe('1. alpha');
      expect(service.testGuidanceAccumulator.flush('s2')).toBe('1. beta');
    });

    it('flush clears guidance so subsequent flush returns null', () => {
      const service = new TestRobotService();

      service.testInjectGuidanceEntry('s1', 'guidance');

      expect(service.testGuidanceAccumulator.flush('s1')).toBe('1. guidance');
      expect(service.testGuidanceAccumulator.flush('s1')).toBeNull();
    });

    it('flush on a session with no guidance returns null', () => {
      const service = new TestRobotService();

      expect(service.testGuidanceAccumulator.flush('unknown')).toBeNull();
    });
  });

  // ── injectResponse low-level ──────────────────────────────────────────

  describe('injectResponse', () => {
    it('stores the response in the pending responses map', () => {
      const service = new TestRobotService();

      service.testInjectResponse('s1', 'yes, proceed');

      expect(service.testPendingResponses.get('s1')).toBe('yes, proceed');
    });

    it('overwrites a previous response for the same session', () => {
      const service = new TestRobotService();

      service.testInjectResponse('s1', 'first');
      service.testInjectResponse('s1', 'second');

      expect(service.testPendingResponses.get('s1')).toBe('second');
    });

    it('stores responses independently per session', () => {
      const service = new TestRobotService();

      service.testInjectResponse('s1', 'reply-a');
      service.testInjectResponse('s2', 'reply-b');

      expect(service.testPendingResponses.get('s1')).toBe('reply-a');
      expect(service.testPendingResponses.get('s2')).toBe('reply-b');
    });
  });

  // ── Shutdown causes in-flight sendQuestion to resolve null ────────────

  describe('shutdown', () => {
    it('aborts the shutdown signal', async () => {
      const service = new TestRobotService();

      expect(service.testShutdownSignal.aborted).toBe(false);

      await service.shutdown();

      expect(service.testShutdownSignal.aborted).toBe(true);
    });

    it('is idempotent — calling shutdown twice does not throw', async () => {
      const service = new TestRobotService();

      await service.shutdown();
      await service.shutdown();

      expect(service.testShutdownSignal.aborted).toBe(true);
    });

    it('causes an in-flight sendQuestion to resolve null', async () => {
      const service = new TestRobotService();

      // Start a long-running question
      const questionPromise = service.sendQuestion('s1', 'waiting...', 10_000);

      // Shutdown after a small delay
      setTimeout(() => service.shutdown(), 30);

      const result = await questionPromise;
      expect(result).toBeNull();
    });

    it('causes multiple in-flight sendQuestion calls to resolve null', async () => {
      const service = new TestRobotService();

      const q1 = service.sendQuestion('s1', 'q1', 10_000);
      const q2 = service.sendQuestion('s2', 'q2', 10_000);

      setTimeout(() => service.shutdown(), 30);

      const [r1, r2] = await Promise.all([q1, q2]);
      expect(r1).toBeNull();
      expect(r2).toBeNull();
    });

    it('sendQuestion called after shutdown resolves null immediately', async () => {
      const service = new TestRobotService();
      await service.shutdown();

      const result = await service.sendQuestion('s1', 'too late', 5_000);
      expect(result).toBeNull();
    });
  });
});
