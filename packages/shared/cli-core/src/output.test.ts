import type { CliOutputStream } from './output';

import { describe, expect, it } from 'vitest';

import { createTextOutput } from './output';

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
