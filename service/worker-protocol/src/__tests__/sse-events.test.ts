import { describe, expect, it } from 'vitest';

import {
  isSseErrorEvent,
  isSseExitEvent,
  isSseStderrEvent,
  isSseStdoutEvent,
  toNdjsonLine,
  toSseLine,
} from '../sse-events.js';

describe('type guards', () => {
  it('identifies stdout events', () => {
    expect(isSseStdoutEvent({ stream: 'stdout', line: 'hello' })).toBe(true);
    expect(isSseStdoutEvent({ stream: 'stderr', line: 'hello' })).toBe(false);
    expect(isSseStdoutEvent({ exit: 0 })).toBe(false);
    expect(isSseStdoutEvent(null)).toBe(false);
  });

  it('identifies stderr events', () => {
    expect(isSseStderrEvent({ stream: 'stderr', line: 'error' })).toBe(true);
    expect(isSseStderrEvent({ stream: 'stdout', line: 'error' })).toBe(false);
    expect(isSseStderrEvent({ exit: 1 })).toBe(false);
  });

  it('identifies exit events', () => {
    expect(isSseExitEvent({ exit: 0 })).toBe(true);
    expect(isSseExitEvent({ exit: 1 })).toBe(true);
    expect(isSseExitEvent({ stream: 'stdout', line: '' })).toBe(false);
    expect(isSseExitEvent({ error: 'fail' })).toBe(false);
  });

  it('identifies error events', () => {
    expect(isSseErrorEvent({ error: 'something broke' })).toBe(true);
    expect(isSseErrorEvent({ exit: 1 })).toBe(false);
    expect(isSseErrorEvent({ stream: 'stderr', line: 'err' })).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isSseStdoutEvent('string')).toBe(false);
    expect(isSseStdoutEvent(42)).toBe(false);
    expect(isSseStdoutEvent(undefined)).toBe(false);
  });
});

describe('toSseLine', () => {
  it('formats stdout event as SSE line', () => {
    const line = toSseLine({ stream: 'stdout', line: 'hello world' });
    expect(line).toBe('data: {"stream":"stdout","line":"hello world"}\n\n');
  });

  it('formats exit event as SSE line', () => {
    const line = toSseLine({ exit: 0 });
    expect(line).toBe('data: {"exit":0}\n\n');
  });

  it('formats error event as SSE line', () => {
    const line = toSseLine({ error: 'failed' });
    expect(line).toBe('data: {"error":"failed"}\n\n');
  });
});

describe('toNdjsonLine', () => {
  it('formats stdout event as NDJSON line', () => {
    const line = toNdjsonLine({ stream: 'stdout', line: 'output' });
    expect(line).toBe('{"stream":"stdout","line":"output"}\n');
  });

  it('formats exit event as NDJSON line', () => {
    const line = toNdjsonLine({ exit: 42 });
    expect(line).toBe('{"exit":42}\n');
  });

  it('each line ends with exactly one newline', () => {
    const line = toNdjsonLine({ stream: 'stderr', line: 'warn' });
    expect(line.endsWith('\n')).toBe(true);
    expect(line.endsWith('\n\n')).toBe(false);
  });
});
