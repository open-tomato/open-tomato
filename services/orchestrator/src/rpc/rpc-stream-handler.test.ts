import type { RpcEvent } from './types/index.js';

import { describe, expect, it } from 'vitest';

import { RpcEventBus } from './event-bus.js';
import { RpcStreamHandler } from './rpc-stream-handler.js';

function collectEvents(bus: RpcEventBus): RpcEvent[] {
  const events: RpcEvent[] = [];
  bus.subscribe((evt) => events.push(evt));
  return events;
}

describe('RpcStreamHandler', () => {
  describe('text_delta', () => {
    it('publishes a text_delta event for each onText call', () => {
      const bus = new RpcEventBus();
      const events = collectEvents(bus);
      const handler = new RpcStreamHandler({ bus, iterationIndex: 0 });

      handler.onText('Hello');
      handler.onText(' world');

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({
        event: 'text_delta',
        data: { delta: 'Hello', iterationIndex: 0 },
      });
      expect(events[1]).toEqual({
        event: 'text_delta',
        data: { delta: ' world', iterationIndex: 0 },
      });
    });

    it('uses the configured iterationIndex', () => {
      const bus = new RpcEventBus();
      const events = collectEvents(bus);
      const handler = new RpcStreamHandler({ bus, iterationIndex: 3 });

      handler.onText('hi');

      expect(events[0]).toEqual({
        event: 'text_delta',
        data: { delta: 'hi', iterationIndex: 3 },
      });
    });
  });

  describe('tool_call_start', () => {
    it('publishes a tool_call_start event with sequential callId', () => {
      const bus = new RpcEventBus();
      const events = collectEvents(bus);
      const handler = new RpcStreamHandler({ bus, iterationIndex: 1 });

      handler.onToolCall('read_file', { path: '/foo' });

      expect(events).toHaveLength(1);
      expect(events[0]!.event).toBe('tool_call_start');
      const data = (events[0] as Extract<RpcEvent, { event: 'tool_call_start' }>).data;
      expect(data.callId).toBe('tool-0');
      expect(data.toolName).toBe('read_file');
      expect(data.iterationIndex).toBe(1);
      expect(data.timestamp).toBeTruthy();
    });

    it('increments callId for each tool call', () => {
      const bus = new RpcEventBus();
      const events = collectEvents(bus);
      const handler = new RpcStreamHandler({ bus, iterationIndex: 0 });

      handler.onToolCall('read_file', {});
      handler.onToolCall('write_file', {});

      const ids = events
        .filter((e) => e.event === 'tool_call_start')
        .map((e) => (e as Extract<RpcEvent, { event: 'tool_call_start' }>).data.callId);
      expect(ids).toEqual(['tool-0', 'tool-1']);
    });
  });

  describe('tool_call_end', () => {
    it('publishes a tool_call_end event correlated with tool_call_start', () => {
      const bus = new RpcEventBus();
      const events = collectEvents(bus);
      const handler = new RpcStreamHandler({ bus, iterationIndex: 2 });

      handler.onToolCall('read_file', { path: '/foo' });
      handler.onToolResult('toolu_123', 'file contents');

      expect(events).toHaveLength(2);
      expect(events[1]!.event).toBe('tool_call_end');
      const data = (events[1] as Extract<RpcEvent, { event: 'tool_call_end' }>).data;
      expect(data.callId).toBe('tool-0');
      expect(data.toolName).toBe('read_file');
      expect(data.iterationIndex).toBe(2);
      expect(data.success).toBe(true);
      expect(data.durationMs).toBeGreaterThanOrEqual(0);
      expect(data.timestamp).toBeTruthy();
    });

    it('handles multiple tool calls in FIFO order', () => {
      const bus = new RpcEventBus();
      const events = collectEvents(bus);
      const handler = new RpcStreamHandler({ bus, iterationIndex: 0 });

      handler.onToolCall('read_file', {});
      handler.onToolCall('write_file', {});
      handler.onToolResult('toolu_1', 'result1');
      handler.onToolResult('toolu_2', 'result2');

      const endEvents = events
        .filter((e) => e.event === 'tool_call_end')
        .map((e) => (e as Extract<RpcEvent, { event: 'tool_call_end' }>).data);
      expect(endEvents).toHaveLength(2);
      expect(endEvents[0]!.callId).toBe('tool-0');
      expect(endEvents[0]!.toolName).toBe('read_file');
      expect(endEvents[1]!.callId).toBe('tool-1');
      expect(endEvents[1]!.toolName).toBe('write_file');
    });

    it('creates a synthetic entry for orphaned tool results', () => {
      const bus = new RpcEventBus();
      const events = collectEvents(bus);
      const handler = new RpcStreamHandler({ bus, iterationIndex: 0 });

      // No preceding onToolCall
      handler.onToolResult('toolu_orphan', 'some content');

      expect(events).toHaveLength(1);
      const data = (events[0] as Extract<RpcEvent, { event: 'tool_call_end' }>).data;
      expect(data.callId).toMatch(/^tool-orphan-/);
      expect(data.toolName).toBe('unknown');
      expect(data.success).toBe(true);
    });
  });

  describe('no-op callbacks', () => {
    it('onError does not publish any event', () => {
      const bus = new RpcEventBus();
      const events = collectEvents(bus);
      const handler = new RpcStreamHandler({ bus, iterationIndex: 0 });

      handler.onError(new Error('test'));

      expect(events).toHaveLength(0);
    });

    it('onComplete does not publish any event', () => {
      const bus = new RpcEventBus();
      const events = collectEvents(bus);
      const handler = new RpcStreamHandler({ bus, iterationIndex: 0 });

      handler.onComplete({ durationMs: 1000 });

      expect(events).toHaveLength(0);
    });
  });

  describe('end-to-end flow', () => {
    it('publishes a realistic sequence of text and tool events', () => {
      const bus = new RpcEventBus();
      const events = collectEvents(bus);
      const handler = new RpcStreamHandler({ bus, iterationIndex: 0 });

      handler.onText('Let me read the file.');
      handler.onToolCall('read_file', { path: '/src/index.ts' });
      handler.onToolResult('toolu_abc', 'export default {}');
      handler.onText('The file exports a default object.');

      const eventNames = events.map((e) => e.event);
      expect(eventNames).toEqual([
        'text_delta',
        'tool_call_start',
        'tool_call_end',
        'text_delta',
      ]);
    });
  });
});
