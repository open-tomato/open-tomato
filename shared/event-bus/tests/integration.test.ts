import type { BusEvent } from '../src/types';

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EventBus } from '../src/event-bus';
import { readEvents } from '../src/persistence';

let tmpDir: string;
let tmpFile: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'event-bus-integration-'));
  tmpFile = path.join(tmpDir, 'events.jsonl');
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('EventBus integration', () => {
  it('routes events correctly, persists to JSONL, and replays all events', async () => {
    const bus = new EventBus({ persistencePath: tmpFile });

    const buildReceived: BusEvent[] = [];
    const implReceived: BusEvent[] = [];
    const wildcardReceived: BusEvent[] = [];

    bus.subscribe('build.done', async (event) => {
      buildReceived.push(event);
    });
    bus.subscribe('impl.*', async (event) => {
      implReceived.push(event);
    });
    bus.subscribe('*', async (event) => {
      wildcardReceived.push(event);
    });

    const events: BusEvent[] = [
      { topic: 'build.done', payload: '{"status":"ok"}', source: 'builder' },
      { topic: 'impl.started', payload: '{"file":"app.ts"}', source: 'implementer' },
      { topic: 'review.done', payload: '{"pr":42}', source: 'reviewer' },
    ];

    for (const event of events) {
      await bus.publish(event);
    }

    // Assert routing
    expect(buildReceived).toHaveLength(1);
    expect(buildReceived[0].topic).toBe('build.done');

    expect(implReceived).toHaveLength(1);
    expect(implReceived[0].topic).toBe('impl.started');

    // Wildcard receives all three events (after specific subscribers)
    expect(wildcardReceived).toHaveLength(3);
    expect(wildcardReceived.map((e) => e.topic)).toEqual([
      'build.done',
      'impl.started',
      'review.done',
    ]);

    // Assert JSONL persistence by reading the file directly
    const persisted = await readEvents(tmpFile);
    expect(persisted).toHaveLength(3);
    expect(persisted[0].topic).toBe('build.done');
    expect(persisted[0].source).toBe('builder');
    expect(persisted[1].topic).toBe('impl.started');
    expect(persisted[2].topic).toBe('review.done');

    for (const record of persisted) {
      expect(typeof record.ts).toBe('string');
    }

    // Verify raw JSONL file format
    const raw = await fs.readFile(tmpFile, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }

    // Reset counters before replay
    buildReceived.length = 0;
    implReceived.length = 0;
    wildcardReceived.length = 0;

    // Replay from file — all events re-dispatched, file not re-appended
    await bus.replayFromFile(tmpFile);

    expect(buildReceived).toHaveLength(1);
    expect(buildReceived[0].topic).toBe('build.done');

    expect(implReceived).toHaveLength(1);
    expect(implReceived[0].topic).toBe('impl.started');

    expect(wildcardReceived).toHaveLength(3);

    // File still has only 3 lines (replay did not re-persist)
    const afterReplay = await readEvents(tmpFile);
    expect(afterReplay).toHaveLength(3);
  });

  it('observer receives all events without affecting routing', async () => {
    const bus = new EventBus({ persistencePath: tmpFile });

    const observed: BusEvent[] = [];
    const routed: BusEvent[] = [];

    bus.addObserver((event) => {
      observed.push(event);
    });
    bus.subscribe('build.*', async (event) => {
      routed.push(event);
    });

    await bus.publish({ topic: 'build.done', payload: '{}' });
    await bus.publish({ topic: 'review.done', payload: '{}' });

    expect(observed).toHaveLength(2);
    expect(routed).toHaveLength(1);
    expect(routed[0].topic).toBe('build.done');
  });

  it('specific subscriber receives event before wildcard subscriber', async () => {
    const bus = new EventBus({ persistencePath: tmpFile });

    const order: string[] = [];

    bus.subscribe('build.done', async () => {
      order.push('specific');
    });
    bus.subscribe('*', async () => {
      order.push('wildcard');
    });

    await bus.publish({ topic: 'build.done', payload: '{}' });

    expect(order).toEqual(['specific', 'wildcard']);
  });
});
