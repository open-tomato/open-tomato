import type { WebSocketLike } from './websocket-adapter.js';
import type { RpcCommand, RpcEvent } from '../types/index.js';

import { describe, expect, it, vi } from 'vitest';

import { WebSocketRpcAdapter } from './websocket-adapter.js';

// ---------------------------------------------------------------------------
// WebSocket mock
// ---------------------------------------------------------------------------

const WS_OPEN = 1;
const WS_CLOSED = 3;

interface MockWebSocket extends WebSocketLike {
  /** Simulate receiving a message from the remote end. */
  simulateMessage(data: unknown): void;
  /** Simulate the connection closing. */
  simulateClose(): void;
  /** Simulate a WebSocket error event. */
  simulateError(event: unknown): void;
}

function createMockWebSocket(readyState = WS_OPEN): MockWebSocket {
  const listeners: Record<string, ((...args: never[]) => void)[]> = {};

  return {
    readyState,
    send: vi.fn(),
    addEventListener(type: string, listener: (...args: never[]) => void) {
      listeners[type] ??= [];
      listeners[type]!.push(listener);
    },
    removeEventListener(type: string, listener: (...args: never[]) => void) {
      const list = listeners[type];
      if (list) {
        const idx = list.indexOf(listener);
        if (idx !== -1) list.splice(idx, 1);
      }
    },
    close: vi.fn(),

    simulateMessage(data: unknown) {
      for (const fn of listeners['message'] ?? []) {
        (fn as (event: { data: unknown }) => void)({ data });
      }
    },
    simulateClose() {
      for (const fn of listeners['close'] ?? []) {
        (fn as () => void)();
      }
    },
    simulateError(event: unknown) {
      for (const fn of listeners['error'] ?? []) {
        (fn as (event: unknown) => void)(event);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(prompt: string): RpcEvent {
  return {
    event: 'loop_started',
    data: { timestamp: new Date().toISOString(), prompt },
  } as RpcEvent;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebSocketRpcAdapter', () => {
  describe('emit', () => {
    it('sends a JSON-serialized event through the WebSocket', () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);
      const event = makeEvent('test');

      const result = adapter.emit(event);

      expect(ws.send).toHaveBeenCalledOnce();
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(event));
      expect(result).toBe(true);
    });

    it('returns false when the socket is not open', () => {
      const ws = createMockWebSocket(WS_CLOSED);
      const adapter = new WebSocketRpcAdapter(ws);

      const result = adapter.emit(makeEvent('test'));

      expect(result).toBe(false);
      expect(ws.send).not.toHaveBeenCalled();
    });

    it('throws when called after close', () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);
      adapter.close();

      expect(() => adapter.emit(makeEvent('fail'))).toThrow(
        'WebSocketRpcAdapter is closed',
      );
    });
  });

  describe('commands', () => {
    it('yields parsed RpcCommand objects from WebSocket messages', async () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);

      const cmd: RpcCommand = { method: 'get_state' };
      const commands: RpcCommand[] = [];

      // Start consuming in the background
      const consuming = (async () => {
        for await (const c of adapter.commands()) {
          commands.push(c);
        }
      })();

      // Simulate a message arriving
      await new Promise((r) => setTimeout(r, 0));
      ws.simulateMessage(JSON.stringify(cmd));
      await new Promise((r) => setTimeout(r, 0));

      // Close to end the iterable
      ws.simulateClose();
      await consuming;

      expect(commands).toHaveLength(1);
      expect(commands[0]).toEqual(cmd);
    });

    it('discards invalid JSON and calls onError with PARSE_ERROR', async () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);

      const errors: unknown[] = [];
      const commands: RpcCommand[] = [];

      const consuming = (async () => {
        for await (const c of adapter.commands({
          onError: (err) => errors.push(err),
        })) {
          commands.push(c);
        }
      })();

      await new Promise((r) => setTimeout(r, 0));
      ws.simulateMessage('not valid json{');
      await new Promise((r) => setTimeout(r, 0));

      ws.simulateClose();
      await consuming;

      expect(commands).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ code: 'PARSE_ERROR' });
    });

    it('discards unknown methods and calls onError with VALIDATION_ERROR', async () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);

      const errors: unknown[] = [];
      const commands: RpcCommand[] = [];

      const consuming = (async () => {
        for await (const c of adapter.commands({
          onError: (err) => errors.push(err),
        })) {
          commands.push(c);
        }
      })();

      await new Promise((r) => setTimeout(r, 0));
      ws.simulateMessage(JSON.stringify({ method: 'unknown', params: {} }));
      await new Promise((r) => setTimeout(r, 0));

      ws.simulateClose();
      await consuming;

      expect(commands).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('ends the iterable when close is called on the adapter', async () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);

      const commands: RpcCommand[] = [];

      const consuming = (async () => {
        for await (const c of adapter.commands()) {
          commands.push(c);
          adapter.close();
        }
      })();

      await new Promise((r) => setTimeout(r, 0));
      ws.simulateMessage(JSON.stringify({ method: 'get_state' }));
      await new Promise((r) => setTimeout(r, 0));

      // Send another after close — should not be yielded
      ws.simulateMessage(JSON.stringify({ method: 'abort', params: {} }));
      await new Promise((r) => setTimeout(r, 0));

      // Also close the WS to unblock the generator if waiting
      ws.simulateClose();
      await consuming;

      expect(commands).toHaveLength(1);
      expect(commands[0]!.method).toBe('get_state');
    });

    it('ends the iterable when the WebSocket closes', async () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);

      const commands: RpcCommand[] = [];

      const consuming = (async () => {
        for await (const c of adapter.commands()) {
          commands.push(c);
        }
      })();

      await new Promise((r) => setTimeout(r, 0));
      ws.simulateMessage(JSON.stringify({ method: 'get_state' }));
      await new Promise((r) => setTimeout(r, 0));
      ws.simulateClose();
      await consuming;

      expect(commands).toHaveLength(1);
    });

    it('yields multiple commands in order', async () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);

      const methods: string[] = [];

      const consuming = (async () => {
        for await (const c of adapter.commands()) {
          methods.push(c.method);
        }
      })();

      await new Promise((r) => setTimeout(r, 0));
      ws.simulateMessage(JSON.stringify({ method: 'get_state' }));
      ws.simulateMessage(
        JSON.stringify({ method: 'abort', params: { reason: 'done' } }),
      );
      await new Promise((r) => setTimeout(r, 0));

      ws.simulateClose();
      await consuming;

      expect(methods).toEqual(['get_state', 'abort']);
    });

    it('handles non-string message data by coercing to string', async () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);

      const errors: unknown[] = [];

      const consuming = (async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of adapter.commands({
          onError: (err) => errors.push(err),
        })) {
          // Buffer-like data that isn't valid JSON
        }
      })();

      await new Promise((r) => setTimeout(r, 0));
      ws.simulateMessage(12345);
      await new Promise((r) => setTimeout(r, 0));

      ws.simulateClose();
      await consuming;

      // "12345" is valid JSON (a number) but fails RpcCommand validation
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('calls onError and ends the iterable on a WebSocket error event', async () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);

      const errors: unknown[] = [];
      const commands: RpcCommand[] = [];

      const consuming = (async () => {
        for await (const c of adapter.commands({
          onError: (err) => errors.push(err),
        })) {
          commands.push(c);
        }
      })();

      await new Promise((r) => setTimeout(r, 0));
      ws.simulateError(new Error('connection reset'));
      await consuming;

      expect(commands).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        code: 'PARSE_ERROR',
        message: expect.stringContaining('connection reset'),
      });
    });

    it('handles non-Error error events gracefully', async () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);

      const errors: unknown[] = [];

      const consuming = (async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of adapter.commands({
          onError: (err) => errors.push(err),
        })) {
          // no-op
        }
      })();

      await new Promise((r) => setTimeout(r, 0));
      ws.simulateError('string error event');
      await consuming;

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        code: 'PARSE_ERROR',
        message: expect.stringContaining('WebSocket transport error'),
      });
    });
  });

  describe('close', () => {
    it('is idempotent — can be called multiple times', () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);

      expect(() => {
        adapter.close();
        adapter.close();
      }).not.toThrow();
    });

    it('does not call ws.close', () => {
      const ws = createMockWebSocket();
      const adapter = new WebSocketRpcAdapter(ws);

      adapter.close();

      expect(ws.close).not.toHaveBeenCalled();
    });
  });
});
