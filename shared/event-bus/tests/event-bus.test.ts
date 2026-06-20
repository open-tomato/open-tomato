import type { BusEvent } from '../src/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/persistence', () => ({
  appendEvent: vi.fn().mockResolvedValue(undefined),
  readEvents: vi.fn(),
}));

import { EventBus } from '../src/event-bus';
import { appendEvent, readEvents } from '../src/persistence';

const mockedReadEvents = vi.mocked(readEvents);
const mockedAppendEvent = vi.mocked(appendEvent);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveHandlers — specific subscribers (no event.target)', () => {
  it('specific subscriber receives a matching exact-topic event', async () => {
    const bus = new EventBus();

    const calls: BusEvent[] = [];
    bus.subscribe('build.done', (event) => {
      calls.push(event);
    });

    await bus.publish({ topic: 'build.done', payload: '{}' });

    expect(calls).toHaveLength(1);
    expect(calls[0].topic).toBe('build.done');
  });

  it('specific subscriber does not receive a non-matching topic event', async () => {
    const bus = new EventBus();

    const calls: BusEvent[] = [];
    bus.subscribe('build.done', (event) => {
      calls.push(event);
    });

    await bus.publish({ topic: 'review.done', payload: '{}' });

    expect(calls).toHaveLength(0);
  });

  it('specific subscriber is invoked before wildcard subscriber for the same event', async () => {
    const bus = new EventBus();

    const order: string[] = [];
    bus.subscribe('build.done', () => {
      order.push('specific');
    });
    bus.subscribe('*', () => {
      order.push('wildcard');
    });

    await bus.publish({ topic: 'build.done', payload: '{}' });

    expect(order).toEqual(['specific', 'wildcard']);
  });

  it('multiple specific subscribers all receive a matching event', async () => {
    const bus = new EventBus();

    const calls: string[] = [];
    bus.subscribe('impl.done', () => {
      calls.push('first');
    });
    bus.subscribe('impl.done', () => {
      calls.push('second');
    });

    await bus.publish({ topic: 'impl.done', payload: '{}' });

    expect(calls).toEqual(['first', 'second']);
  });
});

describe('resolveHandlers — wildcard/fallback subscribers', () => {
  it('wildcard * subscriber receives every published event', async () => {
    const bus = new EventBus();

    const calls: BusEvent[] = [];
    bus.subscribe('*', (event) => {
      calls.push(event);
    });

    await bus.publish({ topic: 'build.done', payload: '{}' });
    await bus.publish({ topic: 'review.blocked', payload: '{}' });
    await bus.publish({ topic: 'impl.started', payload: '{}' });

    expect(calls).toHaveLength(3);
    expect(calls.map((e) => e.topic)).toEqual(['build.done', 'review.blocked', 'impl.started']);
  });

  it('impl.* subscriber receives impl.done but not build.done', async () => {
    const bus = new EventBus();

    const calls: BusEvent[] = [];
    bus.subscribe('impl.*', (event) => {
      calls.push(event);
    });

    await bus.publish({ topic: 'impl.done', payload: '{}' });
    await bus.publish({ topic: 'build.done', payload: '{}' });

    expect(calls).toHaveLength(1);
    expect(calls[0].topic).toBe('impl.done');
  });

  it('*.done subscriber receives build.done and review.done but not build.started', async () => {
    const bus = new EventBus();

    const calls: BusEvent[] = [];
    bus.subscribe('*.done', (event) => {
      calls.push(event);
    });

    await bus.publish({ topic: 'build.done', payload: '{}' });
    await bus.publish({ topic: 'review.done', payload: '{}' });
    await bus.publish({ topic: 'build.started', payload: '{}' });

    expect(calls).toHaveLength(2);
    expect(calls.map((e) => e.topic)).toEqual(['build.done', 'review.done']);
  });

  it('wildcard subscriber receives event after specific subscriber when both match', async () => {
    const bus = new EventBus();

    const order: string[] = [];
    bus.subscribe('impl.*', () => {
      order.push('wildcard-suffix');
    });
    bus.subscribe('impl.done', () => {
      order.push('specific');
    });
    bus.subscribe('*', () => {
      order.push('global-wildcard');
    });

    await bus.publish({ topic: 'impl.done', payload: '{}' });

    expect(order[0]).toBe('specific');
    expect(order).toContain('wildcard-suffix');
    expect(order).toContain('global-wildcard');
    expect(order.indexOf('specific')).toBeLessThan(order.indexOf('wildcard-suffix'));
    expect(order.indexOf('specific')).toBeLessThan(order.indexOf('global-wildcard'));
  });

  it('human.* subscriber receives human.prompt and human.response events', async () => {
    const bus = new EventBus();

    const calls: BusEvent[] = [];
    bus.subscribe('human.*', (event) => {
      calls.push(event);
    });

    await bus.publish({ topic: 'human.prompt', payload: 'What is 2+2?' });
    await bus.publish({ topic: 'human.response', payload: '4' });
    await bus.publish({ topic: 'build.done', payload: '{}' });

    expect(calls).toHaveLength(2);
    expect(calls[0].topic).toBe('human.prompt');
    expect(calls[1].topic).toBe('human.response');
  });
});

describe('resolveHandlers — direct target routing', () => {
  it('invokes the handler whose pattern matches event.target and not unrelated subscribers', async () => {
    const bus = new EventBus();

    const targetCalls: BusEvent[] = [];
    const otherCalls: BusEvent[] = [];

    bus.subscribe('builder', (event) => {
      targetCalls.push(event);
    });
    bus.subscribe('reviewer', (event) => {
      otherCalls.push(event);
    });
    bus.subscribe('*', (event) => {
      otherCalls.push(event);
    });

    await bus.publish({ topic: 'build.done', payload: '{}', target: 'builder' });

    expect(targetCalls).toHaveLength(1);
    expect(targetCalls[0].target).toBe('builder');
    expect(otherCalls).toHaveLength(0);
  });

  it('delivers to no handlers when event.target matches no subscription pattern', async () => {
    const bus = new EventBus();

    const calls: BusEvent[] = [];
    bus.subscribe('builder', (event) => {
      calls.push(event);
    });

    await bus.publish({ topic: 'build.done', payload: '{}', target: 'unknown-agent' });

    expect(calls).toHaveLength(0);
  });
});

describe('observer', () => {
  it('receives every event regardless of routing priority', async () => {
    const bus = new EventBus();

    const observed: BusEvent[] = [];
    bus.addObserver((event) => {
      observed.push(event);
    });

    bus.subscribe('build.done', () => {});
    bus.subscribe('*', () => {});

    await bus.publish({ topic: 'build.done', payload: '{}' });
    await bus.publish({ topic: 'review.blocked', payload: '{}' });

    expect(observed).toHaveLength(2);
    expect(observed[0].topic).toBe('build.done');
    expect(observed[1].topic).toBe('review.blocked');
  });

  it('removal function removes the observer', async () => {
    const bus = new EventBus();

    const observed: BusEvent[] = [];
    const remove = bus.addObserver((event) => {
      observed.push(event);
    });

    await bus.publish({ topic: 'build.done', payload: '{}' });
    expect(observed).toHaveLength(1);

    remove();

    await bus.publish({ topic: 'review.done', payload: '{}' });
    expect(observed).toHaveLength(1);
  });
});

describe('unsubscribe', () => {
  it('removes the handler — subsequent publishes do not invoke it', async () => {
    const bus = new EventBus();

    const calls: BusEvent[] = [];
    const unsubscribe = bus.subscribe('build.done', (event) => {
      calls.push(event);
    });

    await bus.publish({ topic: 'build.done', payload: '{}' });
    expect(calls).toHaveLength(1);

    unsubscribe();

    await bus.publish({ topic: 'build.done', payload: '{}' });
    expect(calls).toHaveLength(1);
  });
});

describe('error handling', () => {
  it('a handler error does not prevent other handlers from receiving the event', async () => {
    const bus = new EventBus();

    const calls: string[] = [];
    bus.subscribe('build.done', () => {
      throw new Error('handler boom');
    });
    bus.subscribe('build.done', () => {
      calls.push('second');
    });
    bus.subscribe('*', () => {
      calls.push('wildcard');
    });

    await bus.publish({ topic: 'build.done', payload: '{}' });

    expect(calls).toContain('second');
    expect(calls).toContain('wildcard');
  });
});

describe('persistence', () => {
  it('publish appends to JSONL when persistencePath is configured', async () => {
    const bus = new EventBus({ persistencePath: './events.jsonl' });

    await bus.publish({ topic: 'build.done', payload: '{"status":"ok"}', source: 'builder' });

    expect(mockedAppendEvent).toHaveBeenCalledOnce();
    expect(mockedAppendEvent).toHaveBeenCalledWith(
      './events.jsonl',
      expect.objectContaining({ topic: 'build.done', payload: '{"status":"ok"}', source: 'builder' }),
    );
  });

  it('publish does not append when persistencePath is not configured', async () => {
    const bus = new EventBus();

    await bus.publish({ topic: 'build.done', payload: '{}' });

    expect(mockedAppendEvent).not.toHaveBeenCalled();
  });
});

describe('replayFromFile', () => {
  it('publishes all stored events without re-appending to the file', async () => {
    const storedEvents: BusEvent[] = [
      { topic: 'build.done', payload: '{"status":"ok"}', ts: '2024-01-01T00:00:00.000Z' },
      { topic: 'review.blocked', payload: '{"pr":1}', ts: '2024-01-01T00:00:01.000Z' },
    ];

    mockedReadEvents.mockResolvedValueOnce(storedEvents);

    const bus = new EventBus({ persistencePath: './events.jsonl' });

    const received: BusEvent[] = [];
    bus.subscribe('*', (event) => {
      received.push(event);
    });

    await bus.replayFromFile('./events.jsonl');

    expect(mockedReadEvents).toHaveBeenCalledWith('./events.jsonl');
    expect(received).toHaveLength(2);
    expect(received[0].topic).toBe('build.done');
    expect(received[1].topic).toBe('review.blocked');
    expect(mockedAppendEvent).not.toHaveBeenCalled();
  });

  it('notifies observers for each replayed event', async () => {
    const storedEvents: BusEvent[] = [
      { topic: 'impl.done', payload: '{}', ts: '2024-01-01T00:00:00.000Z' },
    ];

    mockedReadEvents.mockResolvedValueOnce(storedEvents);

    const bus = new EventBus();
    const observed: BusEvent[] = [];
    bus.addObserver((event) => {
      observed.push(event);
    });

    await bus.replayFromFile('./events.jsonl');

    expect(observed).toHaveLength(1);
    expect(observed[0].topic).toBe('impl.done');
  });

  it('replays an empty file without errors', async () => {
    mockedReadEvents.mockResolvedValueOnce([]);

    const bus = new EventBus({ persistencePath: './events.jsonl' });

    await expect(bus.replayFromFile('./events.jsonl')).resolves.toBeUndefined();
    expect(mockedAppendEvent).not.toHaveBeenCalled();
  });
});
