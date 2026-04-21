import type { RpcEvent } from '../types/index.js';

import { PassThrough } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { NdjsonEmitter } from './ndjson-emitter.js';

const TS = '2026-03-31T12:00:00Z';

/**
 * Helper: creates a PassThrough stream and an emitter, returns both plus
 * a `written()` function that returns everything written so far.
 */
function setup() {
  const stream = new PassThrough();
  const emitter = new NdjsonEmitter(stream);
  const chunks: string[] = [];
  stream.on('data', (chunk: string) => chunks.push(String(chunk)));
  const written = () => chunks.join('');
  return { stream, emitter, written };
}

// ---------------------------------------------------------------------------
// Core: each emit produces exactly one newline-terminated JSON line
// ---------------------------------------------------------------------------

describe('NdjsonEmitter', () => {
  it('emits a single newline-terminated JSON line for a lifecycle event', () => {
    const { emitter, written } = setup();
    const event: RpcEvent = {
      event: 'loop_started',
      data: { timestamp: TS, prompt: 'hello' },
    };

    emitter.emit(event);

    const output = written();
    expect(output.endsWith('\n')).toBe(true);

    const lines = output.split('\n');
    // One content line + one empty string after trailing newline
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('');
    expect(JSON.parse(lines[0])).toEqual(event);
  });

  it('emits a single newline-terminated JSON line for a streaming event', () => {
    const { emitter, written } = setup();
    const event: RpcEvent = {
      event: 'text_delta',
      data: { delta: 'chunk of text' },
    };

    emitter.emit(event);

    const output = written();
    const lines = output.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual(event);
  });

  it('emits a single newline-terminated JSON line for an error event', () => {
    const { emitter, written } = setup();
    const event: RpcEvent = {
      event: 'error',
      data: { timestamp: TS, code: 'PARSE_ERROR', message: 'bad json' },
    };

    emitter.emit(event);

    const output = written();
    const lines = output.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual(event);
  });

  it('emits a single newline-terminated JSON line for a wave event', () => {
    const { emitter, written } = setup();
    const event: RpcEvent = {
      event: 'wave_started',
      data: { waveId: 'w1', workerCount: 3, timestamp: TS },
    };

    emitter.emit(event);

    const output = written();
    const lines = output.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual(event);
  });

  // ---------------------------------------------------------------------------
  // Multiple emits produce separate lines
  // ---------------------------------------------------------------------------

  it('produces one line per emit when called multiple times', () => {
    const { emitter, written } = setup();
    const events: RpcEvent[] = [
      { event: 'loop_started', data: { timestamp: TS, prompt: 'go' } },
      { event: 'iteration_start', data: { index: 0, timestamp: TS } },
      { event: 'text_delta', data: { delta: 'hi' } },
      {
        event: 'iteration_end',
        data: { index: 0, timestamp: TS, durationMs: 42 },
      },
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
      emitter.emit(evt);
    }

    const output = written();
    const lines = output.split('\n').filter(Boolean);
    expect(lines).toHaveLength(events.length);

    for (let i = 0; i < events.length; i++) {
      expect(JSON.parse(lines[i])).toEqual(events[i]);
    }
  });

  // ---------------------------------------------------------------------------
  // Each line is valid, parseable JSON
  // ---------------------------------------------------------------------------

  it('each line is valid JSON that round-trips through JSON.parse', () => {
    const { emitter, written } = setup();
    const event: RpcEvent = {
      event: 'hat_changed',
      data: { timestamp: TS, from: 'planner', to: 'developer' },
    };

    emitter.emit(event);

    const line = written().trim();
    const parsed = JSON.parse(line);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(event));
  });

  // ---------------------------------------------------------------------------
  // No extra whitespace or padding around the JSON
  // ---------------------------------------------------------------------------

  it('does not add leading whitespace or extra padding', () => {
    const { emitter, written } = setup();
    const event: RpcEvent = {
      event: 'text_delta',
      data: { delta: 'x' },
    };

    emitter.emit(event);

    const raw = written();
    // First character should be '{' (start of JSON)
    expect(raw[0]).toBe('{');
    // Last two characters should be '}\n'
    expect(raw.slice(-2)).toBe('}\n');
  });

  // ---------------------------------------------------------------------------
  // Return value reflects stream.write backpressure
  // ---------------------------------------------------------------------------

  it('returns the boolean from stream.write (backpressure signal)', () => {
    const { emitter } = setup();
    const event: RpcEvent = {
      event: 'text_delta',
      data: { delta: 'test' },
    };

    const result = emitter.emit(event);
    expect(typeof result).toBe('boolean');
  });

  // ---------------------------------------------------------------------------
  // Close behavior
  // ---------------------------------------------------------------------------

  it('throws after close() is called', () => {
    const { emitter } = setup();
    emitter.close();

    expect(() => emitter.emit({
      event: 'text_delta',
      data: { delta: 'late' },
    })).toThrow('NdjsonEmitter is closed');
  });

  it('allows multiple emits before close', () => {
    const { emitter, written } = setup();

    emitter.emit({ event: 'text_delta', data: { delta: 'a' } });
    emitter.emit({ event: 'text_delta', data: { delta: 'b' } });
    emitter.close();

    const lines = written().split('\n')
      .filter(Boolean);
    expect(lines).toHaveLength(2);
  });

  it('close is idempotent', () => {
    const { emitter } = setup();
    emitter.close();
    emitter.close(); // should not throw
  });

  // ---------------------------------------------------------------------------
  // Special characters in data are properly JSON-escaped
  // ---------------------------------------------------------------------------

  it('handles events with special characters in string fields', () => {
    const { emitter, written } = setup();
    const event: RpcEvent = {
      event: 'text_delta',
      data: { delta: 'line1\nline2\ttab "quotes" \\backslash' },
    };

    emitter.emit(event);

    const lines = written().split('\n');
    // The delta contains a \n but that is JSON-escaped, so the raw output
    // should still be exactly one content line + one trailing empty string
    const contentLines = lines.filter(Boolean);
    expect(contentLines).toHaveLength(1);
    expect(JSON.parse(contentLines[0])).toEqual(event);
  });

  // ---------------------------------------------------------------------------
  // Events with optional fields omitted
  // ---------------------------------------------------------------------------

  it('handles events with optional fields omitted', () => {
    const { emitter, written } = setup();
    const event: RpcEvent = {
      event: 'loop_started',
      data: { timestamp: TS, prompt: 'hi' },
      // hatId and maxIterations omitted
    };

    emitter.emit(event);

    const parsed = JSON.parse(written().trim());
    expect(parsed).toEqual(event);
    expect(parsed.data.hatId).toBeUndefined();
    expect(parsed.data.maxIterations).toBeUndefined();
  });
});
