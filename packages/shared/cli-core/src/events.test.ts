import type { CliEvent } from './events';

import { describe, expect, it } from 'vitest';

const roundTrip = (event: CliEvent): CliEvent => JSON.parse(JSON.stringify(event)) as CliEvent;

describe('CliEvent JSON round-trip', () => {
  it('round-trips the start variant', () => {
    const event: CliEvent = {
      type: 'start',
      command: 'svc validate',
      ts: '2026-06-25T12:00:00.000Z',
    };

    const decoded = roundTrip(event);

    expect(decoded).toEqual(event);
    expect(decoded.type).toBe('start');
  });

  it('round-trips the step variant', () => {
    const event: CliEvent = {
      type: 'step',
      name: 'load-config',
      ts: '2026-06-25T12:00:01.000Z',
    };

    const decoded = roundTrip(event);

    expect(decoded).toEqual(event);
    expect(decoded.type).toBe('step');
  });

  it('round-trips every log level', () => {
    const levels = ['debug', 'info', 'warn', 'error'] as const;

    for (const level of levels) {
      const event: CliEvent = {
        type: 'log',
        level,
        message: `message at ${level}`,
        ts: '2026-06-25T12:00:02.000Z',
      };

      const decoded = roundTrip(event);

      expect(decoded).toEqual(event);
      if (decoded.type === 'log') {
        expect(decoded.level).toBe(level);
      }
    }
  });

  it('round-trips the result variant on success with data payload', () => {
    const event: CliEvent = {
      type: 'result',
      ok: true,
      data: { count: 42, items: ['a', 'b', 'c'], nested: { flag: true } },
      ts: '2026-06-25T12:00:03.000Z',
    };

    const decoded = roundTrip(event);

    expect(decoded).toEqual(event);
    expect(decoded.type).toBe('result');
  });

  it('round-trips the result variant on failure with error payload', () => {
    const event: CliEvent = {
      type: 'result',
      ok: false,
      error: { code: 'E_VALIDATION', message: 'invalid input' },
      ts: '2026-06-25T12:00:04.000Z',
    };

    const decoded = roundTrip(event);

    expect(decoded).toEqual(event);
    if (decoded.type === 'result') {
      expect(decoded.ok).toBe(false);
      expect(decoded.error).toEqual({ code: 'E_VALIDATION', message: 'invalid input' });
    }
  });

  it('round-trips the result variant with no optional fields', () => {
    const event: CliEvent = {
      type: 'result',
      ok: true,
      ts: '2026-06-25T12:00:05.000Z',
    };

    const decoded = roundTrip(event);

    expect(decoded).toEqual(event);
  });

  it('produces valid JSON for every variant in a single pass', () => {
    const events: CliEvent[] = [
      { type: 'start', command: 'svc list', ts: '2026-06-25T12:00:00.000Z' },
      { type: 'step', name: 'fetch', ts: '2026-06-25T12:00:01.000Z' },
      { type: 'log', level: 'info', message: 'hello', ts: '2026-06-25T12:00:02.000Z' },
      { type: 'result', ok: true, data: null, ts: '2026-06-25T12:00:03.000Z' },
    ];

    for (const event of events) {
      const serialized = JSON.stringify(event);
      expect(() => JSON.parse(serialized)).not.toThrow();
      expect(JSON.parse(serialized)).toEqual(event);
    }
  });
});
