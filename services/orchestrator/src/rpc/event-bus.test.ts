import type { RpcEvent } from './types/index.js';

import { describe, expect, it, vi } from 'vitest';

import { RpcEventBus } from './event-bus.js';

const TS = '2026-03-31T12:00:00Z';

/** Helper: creates a minimal valid RpcEvent. */
function makeEvent(
  overrides: Partial<{ event: string; delta: string }> = {},
): RpcEvent {
  if (overrides.event === 'text_delta') {
    return {
      event: 'text_delta',
      data: { delta: overrides.delta ?? 'hello' },
    };
  }
  return {
    event: 'loop_started',
    data: { timestamp: TS, prompt: 'go' },
  };
}

// ---------------------------------------------------------------------------
// Fan-out to multiple subscribers
// ---------------------------------------------------------------------------

describe('RpcEventBus', () => {
  describe('fan-out', () => {
    it('delivers an event to a single subscriber', () => {
      const bus = new RpcEventBus();
      const received: RpcEvent[] = [];

      bus.subscribe((evt) => received.push(evt));
      const event = makeEvent();
      bus.publish(event);

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(event);
    });

    it('delivers an event to multiple subscribers', () => {
      const bus = new RpcEventBus();
      const a: RpcEvent[] = [];
      const b: RpcEvent[] = [];
      const c: RpcEvent[] = [];

      bus.subscribe((evt) => a.push(evt));
      bus.subscribe((evt) => b.push(evt));
      bus.subscribe((evt) => c.push(evt));

      const event = makeEvent();
      bus.publish(event);

      expect(a).toEqual([event]);
      expect(b).toEqual([event]);
      expect(c).toEqual([event]);
    });

    it('delivers multiple events in order to each subscriber', () => {
      const bus = new RpcEventBus();
      const received: RpcEvent[] = [];

      bus.subscribe((evt) => received.push(evt));

      const events: RpcEvent[] = [
        { event: 'loop_started', data: { timestamp: TS, prompt: 'a' } },
        { event: 'text_delta', data: { delta: 'chunk' } },
        {
          event: 'loop_terminated',
          data: {
            timestamp: TS,
            reason: 'completed',
            totalIterations: 1,
          },
        },
      ];

      for (const evt of events) {
        bus.publish(evt);
      }

      expect(received).toEqual(events);
    });

    it('does not deliver to subscribers registered after the publish', () => {
      const bus = new RpcEventBus();
      const early: RpcEvent[] = [];
      const late: RpcEvent[] = [];

      bus.subscribe((evt) => early.push(evt));
      bus.publish(makeEvent());

      bus.subscribe((evt) => late.push(evt));

      expect(early).toHaveLength(1);
      expect(late).toHaveLength(0);
    });

    it('deduplicates the same function reference', () => {
      const bus = new RpcEventBus();
      const received: RpcEvent[] = [];
      const fn = (evt: RpcEvent) => received.push(evt);

      bus.subscribe(fn);
      bus.subscribe(fn); // duplicate — should be ignored by Set

      bus.publish(makeEvent());

      expect(received).toHaveLength(1);
    });

    it('publishes to zero subscribers without throwing', () => {
      const bus = new RpcEventBus();
      expect(() => bus.publish(makeEvent())).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Unsubscribe behavior
  // ---------------------------------------------------------------------------

  describe('unsubscribe', () => {
    it('returns a function from subscribe', () => {
      const bus = new RpcEventBus();
      const unsub = bus.subscribe(() => {});
      expect(typeof unsub).toBe('function');
    });

    it('stops delivering events after unsubscribe is called', () => {
      const bus = new RpcEventBus();
      const received: RpcEvent[] = [];

      const unsub = bus.subscribe((evt) => received.push(evt));
      bus.publish(makeEvent());
      expect(received).toHaveLength(1);

      unsub();
      bus.publish(makeEvent());
      expect(received).toHaveLength(1); // no new event
    });

    it('calling unsubscribe twice is a no-op', () => {
      const bus = new RpcEventBus();
      const unsub = bus.subscribe(() => {});

      unsub();
      expect(() => unsub()).not.toThrow();
    });

    it('only removes the unsubscribed consumer, not others', () => {
      const bus = new RpcEventBus();
      const a: RpcEvent[] = [];
      const b: RpcEvent[] = [];

      const unsubA = bus.subscribe((evt) => a.push(evt));
      bus.subscribe((evt) => b.push(evt));

      unsubA();
      bus.publish(makeEvent());

      expect(a).toHaveLength(0);
      expect(b).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Consumer error isolation
  // ---------------------------------------------------------------------------

  describe('error isolation', () => {
    it('does not throw when a consumer throws', () => {
      const bus = new RpcEventBus();
      bus.subscribe(() => {
        throw new Error('boom');
      });

      expect(() => bus.publish(makeEvent())).not.toThrow();
    });

    it('continues delivering to remaining consumers when one throws', () => {
      const bus = new RpcEventBus();
      const received: RpcEvent[] = [];

      bus.subscribe(() => {
        throw new Error('I break');
      });
      bus.subscribe((evt) => received.push(evt));

      bus.publish(makeEvent());

      // The second subscriber should have received both the original event
      // AND the error event generated by the first subscriber's failure
      expect(received.length).toBeGreaterThanOrEqual(1);
      // At minimum the error event should be present
      const errorEvents = received.filter((e) => e.event === 'error');
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]!.data).toMatchObject({
        code: 'CONSUMER_ERROR',
        message: 'I break',
      });
    });

    it('publishes an error event with the thrown message to other consumers', () => {
      const bus = new RpcEventBus();
      const spy = vi.fn();

      bus.subscribe(() => {
        throw new Error('something went wrong');
      });
      bus.subscribe(spy);

      bus.publish(makeEvent());

      // spy should have been called with the error event
      const errorCall = spy.mock.calls.find(
        ([evt]: [RpcEvent]) => evt.event === 'error',
      );
      expect(errorCall).toBeDefined();
      expect(errorCall![0].data).toMatchObject({
        code: 'CONSUMER_ERROR',
        message: 'something went wrong',
      });
    });

    it('uses fallback message for non-Error throws', () => {
      const bus = new RpcEventBus();
      const spy = vi.fn();

      bus.subscribe(() => {
         
        throw 'string error';
      });
      bus.subscribe(spy);

      bus.publish(makeEvent());

      const errorCall = spy.mock.calls.find(
        ([evt]: [RpcEvent]) => evt.event === 'error',
      );
      expect(errorCall).toBeDefined();
      expect(errorCall![0].data.message).toBe('Unknown consumer error');
    });

    it('does not send error event back to the failing consumer', () => {
      const bus = new RpcEventBus();
      const failingCalls: RpcEvent[] = [];

      const failing = (evt: RpcEvent) => {
        failingCalls.push(evt);
        if (evt.event !== 'error') {
          throw new Error('fail');
        }
      };

      bus.subscribe(failing);
      bus.subscribe(() => {}); // healthy consumer

      bus.publish(makeEvent());

      // The failing consumer should only have received the original event,
      // NOT the error event about its own failure
      expect(failingCalls).toHaveLength(1);
      expect(failingCalls[0]!.event).not.toBe('error');
    });

    it('silently discards errors thrown during error event re-publish', () => {
      const bus = new RpcEventBus();

      // First consumer throws on the original event
      bus.subscribe(() => {
        throw new Error('first breaks');
      });

      // Second consumer also throws (even on error events)
      bus.subscribe(() => {
        throw new Error('second also breaks');
      });

      // Should not throw despite both consumers failing
      expect(() => bus.publish(makeEvent())).not.toThrow();
    });

    it('includes a timestamp in the error event', () => {
      const bus = new RpcEventBus();
      const spy = vi.fn();

      bus.subscribe(() => {
        throw new Error('timed');
      });
      bus.subscribe(spy);

      bus.publish(makeEvent());

      const errorCall = spy.mock.calls.find(
        ([evt]: [RpcEvent]) => evt.event === 'error',
      );
      expect(errorCall).toBeDefined();
      expect(errorCall![0].data.timestamp).toBeDefined();
      // Should be a valid ISO string
      expect(
        Number.isNaN(Date.parse(errorCall![0].data.timestamp)),
      ).toBe(false);
    });

    it('isolates errors between multiple failing consumers', () => {
      const bus = new RpcEventBus();
      const healthy: RpcEvent[] = [];

      bus.subscribe(() => {
        throw new Error('A fails');
      });
      bus.subscribe(() => {
        throw new Error('B fails');
      });
      bus.subscribe((evt) => healthy.push(evt));

      bus.publish(makeEvent());

      // Healthy consumer should receive the original event plus error
      // events for both failing consumers
      const errorEvents = healthy.filter((e) => e.event === 'error');
      expect(errorEvents).toHaveLength(2);
      expect(errorEvents.map((e) => e.data.message)).toContain('A fails');
      expect(errorEvents.map((e) => e.data.message)).toContain('B fails');
    });
  });
});
