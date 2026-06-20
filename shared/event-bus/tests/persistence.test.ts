import type { BusEvent } from '../src/types';

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { appendEvent, readEvents } from '../src/persistence';

let tmpDir: string;
let tmpFile: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'event-bus-test-'));
  tmpFile = path.join(tmpDir, 'events.jsonl');
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('appendEvent', () => {
  it('creates the file if it does not exist and writes a valid JSONL line', async () => {
    const event: BusEvent = { topic: 'build.done', payload: '{}', source: 'builder' };

    await appendEvent(tmpFile, event);

    const content = await fs.readFile(tmpFile, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]) as BusEvent;
    expect(parsed.topic).toBe('build.done');
    expect(parsed.payload).toBe('{}');
    expect(parsed.source).toBe('builder');
    expect(typeof parsed.ts).toBe('string');
  });

  it('multiple appendEvent calls produce multiple lines, each valid JSON', async () => {
    const events: BusEvent[] = [
      { topic: 'build.done', payload: '{"status":"ok"}' },
      { topic: 'review.started', payload: '{"pr":1}', source: 'reviewer' },
      { topic: 'impl.done', payload: '{"file":"x.ts"}' },
    ];

    for (const event of events) {
      await appendEvent(tmpFile, event);
    }

    const content = await fs.readFile(tmpFile, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    expect(lines).toHaveLength(3);

    const parsed = lines.map((line) => JSON.parse(line) as BusEvent);
    expect(parsed[0].topic).toBe('build.done');
    expect(parsed[1].topic).toBe('review.started');
    expect(parsed[2].topic).toBe('impl.done');

    for (const record of parsed) {
      expect(typeof record.ts).toBe('string');
    }
  });

  it('preserves an existing ts field instead of overwriting it', async () => {
    const ts = '2024-01-01T00:00:00.000Z';
    const event: BusEvent = { topic: 'build.done', payload: '{}', ts };

    await appendEvent(tmpFile, event);

    const content = await fs.readFile(tmpFile, 'utf8');
    const parsed = JSON.parse(content.trim()) as BusEvent;
    expect(parsed.ts).toBe(ts);
  });
});

describe('readEvents', () => {
  it('parses all valid lines and returns BusEvent[]', async () => {
    const lines = [
      JSON.stringify({ topic: 'build.done', payload: '{}', ts: '2024-01-01T00:00:00.000Z' }),
      JSON.stringify({ topic: 'review.done', payload: '{}', ts: '2024-01-01T00:00:01.000Z' }),
    ].join('\n') + '\n';

    await fs.writeFile(tmpFile, lines, 'utf8');

    const events = await readEvents(tmpFile);
    expect(events).toHaveLength(2);
    expect(events[0].topic).toBe('build.done');
    expect(events[1].topic).toBe('review.done');
  });

  it('skips malformed lines without throwing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const lines = [
      JSON.stringify({ topic: 'build.done', payload: '{}' }),
      'NOT VALID JSON {{{',
      JSON.stringify({ topic: 'impl.done', payload: '{}' }),
    ].join('\n') + '\n';

    await fs.writeFile(tmpFile, lines, 'utf8');

    const events = await readEvents(tmpFile);
    expect(events).toHaveLength(2);
    expect(events[0].topic).toBe('build.done');
    expect(events[1].topic).toBe('impl.done');
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('returns an empty array when the file does not exist', async () => {
    const missing = path.join(tmpDir, 'no-such-file.jsonl');
    const events = await readEvents(missing);
    expect(events).toEqual([]);
  });
});
