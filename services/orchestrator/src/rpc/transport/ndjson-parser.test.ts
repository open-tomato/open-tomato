import type { NdjsonParseError } from './ndjson-parser.js';

import { Buffer } from 'node:buffer';
import { PassThrough } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import { parseNdjsonStream } from './ndjson-parser.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collects all yielded values from the async generator into an array. */
async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of gen) {
    results.push(item);
  }
  return results;
}

/** Pushes data into a PassThrough stream and then ends it. */
function streamFrom(...chunks: string[]): PassThrough {
  const stream = new PassThrough();
  for (const chunk of chunks) {
    stream.push(chunk);
  }
  stream.push(null);
  return stream;
}

// Valid command payloads used across tests
const VALID_GET_STATE = '{"method":"get_state"}';
const VALID_PROMPT = '{"method":"prompt","params":{"text":"hello"}}';
const VALID_ABORT = '{"method":"abort","params":{"reason":"done"}}';

// ---------------------------------------------------------------------------
// Single-line inputs
// ---------------------------------------------------------------------------

describe('parseNdjsonStream', () => {
  describe('single-line inputs', () => {
    it('parses a single valid command from one line', async () => {
      const stream = streamFrom(`${VALID_GET_STATE}\n`);
      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ method: 'get_state' });
    });

    it('parses a single command with params', async () => {
      const stream = streamFrom(`${VALID_PROMPT}\n`);
      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        method: 'prompt',
        params: { text: 'hello' },
      });
    });

    it('parses a command without a trailing newline (flushed on stream end)', async () => {
      const stream = streamFrom(VALID_GET_STATE);
      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ method: 'get_state' });
    });

    it('skips empty lines', async () => {
      const stream = streamFrom(`\n\n${VALID_GET_STATE}\n\n`);
      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(1);
    });

    it('skips whitespace-only lines', async () => {
      const stream = streamFrom(`   \n\t\n${VALID_GET_STATE}\n`);
      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Multi-line inputs
  // ---------------------------------------------------------------------------

  describe('multi-line inputs', () => {
    it('parses multiple commands from consecutive lines', async () => {
      const stream = streamFrom(
        `${VALID_GET_STATE}\n${VALID_PROMPT}\n${VALID_ABORT}\n`,
      );
      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ method: 'get_state' });
      expect(results[1]).toEqual({
        method: 'prompt',
        params: { text: 'hello' },
      });
      expect(results[2]).toEqual({
        method: 'abort',
        params: { reason: 'done' },
      });
    });

    it('skips empty lines between valid commands', async () => {
      const stream = streamFrom(
        `${VALID_GET_STATE}\n\n\n${VALID_PROMPT}\n`,
      );
      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(2);
    });

    it('handles all command types in sequence', async () => {
      const commands = [
        '{"method":"get_state"}',
        '{"method":"prompt","params":{"text":"go"}}',
        '{"method":"guidance","params":{"text":"be careful"}}',
        '{"method":"steer","params":{"directive":"use tool X"}}',
        '{"method":"follow_up","params":{"text":"also check Y"}}',
        '{"method":"abort","params":{"reason":"timeout"}}',
        '{"method":"get_iterations","params":{"limit":5}}',
        '{"method":"set_hat","params":{"hatId":"planner"}}',
      ];
      const stream = streamFrom(commands.join('\n') + '\n');
      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(commands.length);
      expect(results[0]!.method).toBe('get_state');
      expect(results[7]!.method).toBe('set_hat');
    });
  });

  // ---------------------------------------------------------------------------
  // Partial-chunk inputs (simulates TCP/stdin fragmentation)
  // ---------------------------------------------------------------------------

  describe('partial-chunk inputs', () => {
    it('reassembles a command split across two chunks', async () => {
      const full = `${VALID_PROMPT}\n`;
      const mid = Math.floor(full.length / 2);

      const stream = new PassThrough();
      stream.push(full.slice(0, mid));
      stream.push(full.slice(mid));
      stream.push(null);

      const results = await collect(parseNdjsonStream(stream));
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        method: 'prompt',
        params: { text: 'hello' },
      });
    });

    it('reassembles a command split into single-byte chunks', async () => {
      const full = `${VALID_GET_STATE}\n`;
      const stream = new PassThrough();
      for (const char of full) {
        stream.push(char);
      }
      stream.push(null);

      const results = await collect(parseNdjsonStream(stream));
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ method: 'get_state' });
    });

    it('handles a chunk containing a full line plus a partial next line', async () => {
      const stream = new PassThrough();
      // First chunk: full get_state + start of prompt
      stream.push(`${VALID_GET_STATE}\n{"method":"pro`);
      // Second chunk: rest of prompt
      stream.push('mpt","params":{"text":"hello"}}\n');
      stream.push(null);

      const results = await collect(parseNdjsonStream(stream));
      expect(results).toHaveLength(2);
      expect(results[0]!.method).toBe('get_state');
      expect(results[1]!.method).toBe('prompt');
    });

    it('handles multiple complete lines in a single chunk', async () => {
      const stream = new PassThrough();
      stream.push(
        `${VALID_GET_STATE}\n${VALID_PROMPT}\n${VALID_ABORT}\n`,
      );
      stream.push(null);

      const results = await collect(parseNdjsonStream(stream));
      expect(results).toHaveLength(3);
    });

    it('flushes a partial line remaining after stream ends', async () => {
      const stream = new PassThrough();
      stream.push(VALID_GET_STATE); // no trailing newline
      stream.push(null);

      const results = await collect(parseNdjsonStream(stream));
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ method: 'get_state' });
    });
  });

  // ---------------------------------------------------------------------------
  // Malformed JSON inputs
  // ---------------------------------------------------------------------------

  describe('malformed JSON inputs', () => {
    it('discards invalid JSON and invokes onError with PARSE_ERROR', async () => {
      const onError = vi.fn<(error: NdjsonParseError) => void>();
      const stream = streamFrom('not json at all\n');

      const results = await collect(
        parseNdjsonStream(stream, { onError }),
      );

      expect(results).toHaveLength(0);
      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0]![0].code).toBe('PARSE_ERROR');
      expect(onError.mock.calls[0]![0].details.rawLine).toBe(
        'not json at all',
      );
    });

    it('discards valid JSON that fails Zod validation and invokes onError with VALIDATION_ERROR', async () => {
      const onError = vi.fn<(error: NdjsonParseError) => void>();
      // Valid JSON but unknown method
      const stream = streamFrom('{"method":"unknown_cmd"}\n');

      const results = await collect(
        parseNdjsonStream(stream, { onError }),
      );

      expect(results).toHaveLength(0);
      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0]![0].code).toBe('VALIDATION_ERROR');
    });

    it('discards JSON missing required params and invokes onError', async () => {
      const onError = vi.fn<(error: NdjsonParseError) => void>();
      // prompt requires params.text
      const stream = streamFrom('{"method":"prompt"}\n');

      const results = await collect(
        parseNdjsonStream(stream, { onError }),
      );

      expect(results).toHaveLength(0);
      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0]![0].code).toBe('VALIDATION_ERROR');
    });

    it('continues yielding valid commands after malformed lines', async () => {
      const onError = vi.fn<(error: NdjsonParseError) => void>();
      const stream = streamFrom(
        `${VALID_GET_STATE}\ngarbage\n${VALID_PROMPT}\n`,
      );

      const results = await collect(
        parseNdjsonStream(stream, { onError }),
      );

      expect(results).toHaveLength(2);
      expect(results[0]!.method).toBe('get_state');
      expect(results[1]!.method).toBe('prompt');
      expect(onError).toHaveBeenCalledOnce();
    });

    it('handles multiple malformed lines interspersed with valid ones', async () => {
      const onError = vi.fn<(error: NdjsonParseError) => void>();
      const stream = streamFrom(
        [
          'bad1',
          VALID_GET_STATE,
          '{invalid json}',
          VALID_PROMPT,
          '{"method":"nope"}',
        ].join('\n') + '\n',
      );

      const results = await collect(
        parseNdjsonStream(stream, { onError }),
      );

      expect(results).toHaveLength(2);
      expect(onError).toHaveBeenCalledTimes(3);
    });

    it('silently discards malformed lines when no onError is provided', async () => {
      const stream = streamFrom(
        `not-json\n${VALID_GET_STATE}\n`,
      );

      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(1);
      expect(results[0]!.method).toBe('get_state');
    });

    it('truncates long raw lines in error messages', async () => {
      const onError = vi.fn<(error: NdjsonParseError) => void>();
      const longLine = 'x'.repeat(300);
      const stream = streamFrom(`${longLine}\n`);

      await collect(parseNdjsonStream(stream, { onError }));

      expect(onError).toHaveBeenCalledOnce();
      const msg = onError.mock.calls[0]![0].message;
      expect(msg.length).toBeLessThan(longLine.length);
      expect(msg).toContain('…');
    });

    it('includes a timestamp in error objects', async () => {
      const onError = vi.fn<(error: NdjsonParseError) => void>();
      const stream = streamFrom('bad\n');

      await collect(parseNdjsonStream(stream, { onError }));

      expect(onError).toHaveBeenCalledOnce();
      const ts = onError.mock.calls[0]![0].timestamp;
      // Should be a valid ISO-8601 string
      expect(new Date(ts).toISOString()).toBe(ts);
    });

    it('discards a malformed partial line flushed on stream end', async () => {
      const onError = vi.fn<(error: NdjsonParseError) => void>();
      const stream = streamFrom('{"method":"get_sta'); // truncated, no newline

      const results = await collect(
        parseNdjsonStream(stream, { onError }),
      );

      expect(results).toHaveLength(0);
      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0]![0].code).toBe('PARSE_ERROR');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('yields nothing from an empty stream', async () => {
      const stream = streamFrom('');
      const results = await collect(parseNdjsonStream(stream));
      expect(results).toHaveLength(0);
    });

    it('yields nothing from a stream of only newlines', async () => {
      const stream = streamFrom('\n\n\n');
      const results = await collect(parseNdjsonStream(stream));
      expect(results).toHaveLength(0);
    });

    it('handles Buffer chunks in addition to string chunks', async () => {
      const stream = new PassThrough();
      stream.push(Buffer.from(`${VALID_GET_STATE}\n`));
      stream.push(null);

      const results = await collect(parseNdjsonStream(stream));
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ method: 'get_state' });
    });

    it('trims leading/trailing whitespace from lines before parsing', async () => {
      const stream = streamFrom(`  ${VALID_GET_STATE}  \n`);
      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ method: 'get_state' });
    });

    it('applies Zod defaults to command params', async () => {
      // guidance.appliesTo defaults to 'remaining'
      const stream = streamFrom(
        '{"method":"guidance","params":{"text":"tip"}}\n',
      );
      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        method: 'guidance',
        params: { text: 'tip', appliesTo: 'remaining' },
      });
    });

    it('applies Zod defaults to steer.force', async () => {
      const stream = streamFrom(
        '{"method":"steer","params":{"directive":"do X"}}\n',
      );
      const results = await collect(parseNdjsonStream(stream));

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        method: 'steer',
        params: { directive: 'do X', force: false },
      });
    });
  });
});
