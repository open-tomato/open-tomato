import type { CliOutputStream } from './output';

import { describe, expect, it } from 'vitest';

import { createJsonOutput, createTextOutput } from './output';

const createMemoryStream = (): { stream: CliOutputStream; chunks: string[] } => {
  const chunks: string[] = [];
  const stream: CliOutputStream = {
    write(chunk: string): unknown {
      chunks.push(chunk);
      return true;
    },
  };
  return { stream, chunks };
};

describe('createTextOutput at verbosity 0', () => {
  it('suppresses debug messages', () => {
    const { stream, chunks } = createMemoryStream();
    const output = createTextOutput({ verbosity: 0, stream });

    output.debug('hidden debug detail');

    expect(chunks).toEqual([]);
  });

  it('suppresses info messages', () => {
    const { stream, chunks } = createMemoryStream();
    const output = createTextOutput({ verbosity: 0, stream });

    output.info('hidden info detail');

    expect(chunks).toEqual([]);
  });

  it('emits warn messages', () => {
    const { stream, chunks } = createMemoryStream();
    const output = createTextOutput({ verbosity: 0, stream });

    output.warn('disk almost full');

    expect(chunks).toEqual(['warn: disk almost full\n']);
  });

  it('emits error messages', () => {
    const { stream, chunks } = createMemoryStream();
    const output = createTextOutput({ verbosity: 0, stream });

    output.error('connection refused');

    expect(chunks).toEqual(['error: connection refused\n']);
  });

  it('emits result payloads', () => {
    const { stream, chunks } = createMemoryStream();
    const output = createTextOutput({ verbosity: 0, stream });

    output.result({ ok: true, items: 3 });

    expect(chunks).toEqual([`result: ${JSON.stringify({ ok: true, items: 3 })}\n`]);
  });

  it('emits warn, error, and result while suppressing debug and info in a mixed sequence', () => {
    const { stream, chunks } = createMemoryStream();
    const output = createTextOutput({ verbosity: 0, stream });

    output.debug('debug-1');
    output.info('info-1');
    output.warn('warn-1');
    output.error('error-1');
    output.result('done');
    output.debug('debug-2');
    output.info('info-2');

    expect(chunks).toEqual([
      'warn: warn-1\n',
      'error: error-1\n',
      'result: done\n',
    ]);
  });
});

describe('createJsonOutput', () => {
  it('produces exactly one JSON object per line for each call', () => {
    const { stream, chunks } = createMemoryStream();
    const output = createJsonOutput({ stream });

    output.info('first');
    output.warn('second');
    output.error('third');
    output.debug('fourth');
    output.result({ count: 1 });

    expect(chunks).toHaveLength(5);
    for (const chunk of chunks) {
      expect(chunk.endsWith('\n')).toBe(true);
      const body = chunk.slice(0, -1);
      expect(body).not.toContain('\n');
      const parsed: unknown = JSON.parse(body);
      expect(typeof parsed).toBe('object');
      expect(parsed).not.toBeNull();
    }
  });

  it('emits a type: "result" event when result is called', () => {
    const { stream, chunks } = createMemoryStream();
    const output = createJsonOutput({ stream });

    output.result({ items: 5 });

    expect(chunks).toHaveLength(1);
    const [chunk] = chunks;
    if (chunk === undefined) {
      throw new Error('expected a chunk to be written');
    }
    const event = JSON.parse(chunk.slice(0, -1)) as {
      type: string;
      ok: boolean;
      data: unknown;
      ts: string;
    };
    expect(event.type).toBe('result');
    expect(event.ok).toBe(true);
    expect(event.data).toEqual({ items: 5 });
    expect(typeof event.ts).toBe('string');
  });
});
