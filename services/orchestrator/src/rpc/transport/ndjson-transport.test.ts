import type { RpcCommand, RpcEvent } from '../types/index.js';

import { PassThrough } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { NdjsonTransport } from './ndjson-transport.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(event: string): RpcEvent {
  return {
    event: 'loop_started',
    data: { timestamp: new Date().toISOString(), prompt: event },
  } as RpcEvent;
}

function writeCommand(input: PassThrough, cmd: RpcCommand): void {
  input.write(JSON.stringify(cmd) + '\n');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NdjsonTransport', () => {
  describe('emit', () => {
    it('writes a newline-delimited JSON line to the output stream', () => {
      const output = new PassThrough();
      const transport = new NdjsonTransport(new PassThrough(), output);
      const event = makeEvent('test');

      transport.emit(event);

      const raw = String(output.read());
      const lines = raw.split('\n').filter((l) => l.trim());
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0]!)).toEqual(event);
    });

    it('throws when called after close', () => {
      const transport = new NdjsonTransport(new PassThrough(), new PassThrough());
      transport.close();

      expect(() => transport.emit(makeEvent('fail'))).toThrow(
        'NdjsonTransport is closed',
      );
    });

    it('returns the boolean backpressure signal from the stream', () => {
      const output = new PassThrough({ highWaterMark: 4 });
      const transport = new NdjsonTransport(new PassThrough(), output);

      // First small write should flush immediately (true)
      const result = transport.emit(makeEvent('x'));
      expect(typeof result).toBe('boolean');
    });
  });

  describe('commands', () => {
    it('yields parsed RpcCommand objects from the input stream', async () => {
      const input = new PassThrough();
      const transport = new NdjsonTransport(input, new PassThrough());

      const cmd: RpcCommand = { method: 'get_state' };
      writeCommand(input, cmd);
      input.end();

      const commands: RpcCommand[] = [];
      for await (const c of transport.commands()) {
        commands.push(c);
      }

      expect(commands).toHaveLength(1);
      expect(commands[0]).toEqual(cmd);
    });

    it('yields multiple commands in order', async () => {
      const input = new PassThrough();
      const transport = new NdjsonTransport(input, new PassThrough());

      writeCommand(input, { method: 'get_state' });
      writeCommand(input, { method: 'abort', params: { reason: 'done' } });
      input.end();

      const methods: string[] = [];
      for await (const c of transport.commands()) {
        methods.push(c.method);
      }

      expect(methods).toEqual(['get_state', 'abort']);
    });

    it('stops yielding after close is called', async () => {
      const input = new PassThrough();
      const transport = new NdjsonTransport(input, new PassThrough());

      const commands: RpcCommand[] = [];

      // Start consuming in background
      const consuming = (async () => {
        for await (const c of transport.commands()) {
          commands.push(c);
          // Close after first command
          transport.close();
        }
      })();

      writeCommand(input, { method: 'get_state' });
      // Write a second command — should not be yielded due to close
      await new Promise((r) => setTimeout(r, 0));
      writeCommand(input, { method: 'abort', params: {} });
      // End the input so the underlying parser finishes
      input.end();
      await consuming;

      expect(commands).toHaveLength(1);
      expect(commands[0]!.method).toBe('get_state');
    });

    it('reports parse errors through the onError callback', async () => {
      const input = new PassThrough();
      const transport = new NdjsonTransport(input, new PassThrough());

      const errors: unknown[] = [];
      input.write('not json\n');
      input.end();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of transport.commands({
        onError: (err) => errors.push(err),
      })) {
        // should not yield any valid commands
      }

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ code: 'PARSE_ERROR' });
    });

    it('reports validation errors for unknown methods', async () => {
      const input = new PassThrough();
      const transport = new NdjsonTransport(input, new PassThrough());

      const errors: unknown[] = [];
      input.write(JSON.stringify({ method: 'unknown', params: {} }) + '\n');
      input.end();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of transport.commands({
        onError: (err) => errors.push(err),
      })) {
        // should not yield any valid commands
      }

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('close', () => {
    it('is idempotent — can be called multiple times without error', () => {
      const transport = new NdjsonTransport(new PassThrough(), new PassThrough());
      expect(() => {
        transport.close();
        transport.close();
      }).not.toThrow();
    });
  });
});
