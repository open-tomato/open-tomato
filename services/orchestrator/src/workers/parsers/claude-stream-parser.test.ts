import type { StreamHandler } from '../stream-handler.js';

import { describe, expect, it, vi } from 'vitest';

import { parseClaudeStream } from './claude-stream-parser.js';

function createMockHandler(): StreamHandler {
  return {
    onText: vi.fn(),
    onToolCall: vi.fn(),
    onToolResult: vi.fn(),
    onError: vi.fn(),
    onComplete: vi.fn(),
  };
}

describe('parseClaudeStream', () => {
  describe('system events', () => {
    it('skips system events without calling any handler', () => {
      const handler = createMockHandler();
      const input = JSON.stringify({ type: 'system', subtype: 'init', message: 'Session started' });

      parseClaudeStream(input, handler);

      expect(handler.onText).not.toHaveBeenCalled();
      expect(handler.onToolCall).not.toHaveBeenCalled();
      expect(handler.onToolResult).not.toHaveBeenCalled();
      expect(handler.onError).not.toHaveBeenCalled();
      expect(handler.onComplete).not.toHaveBeenCalled();
    });
  });

  describe('assistant events', () => {
    it('routes text content blocks to onText', () => {
      const handler = createMockHandler();
      const event = {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hello world' }] },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onText).toHaveBeenCalledWith('Hello world');
    });

    it('routes tool_use content blocks to onToolCall', () => {
      const handler = createMockHandler();
      const event = {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tu_1', name: 'read_file', input: { path: '/tmp/a.ts' } },
          ],
        },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onToolCall).toHaveBeenCalledWith('read_file', { path: '/tmp/a.ts' });
    });

    it('routes tool_result content blocks to onToolResult', () => {
      const handler = createMockHandler();
      const event = {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: 'file contents here' }],
        },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onToolResult).toHaveBeenCalledWith('tu_1', 'file contents here');
    });

    it('routes content_block directly when present', () => {
      const handler = createMockHandler();
      const event = {
        type: 'assistant',
        content_block: { type: 'text', text: 'streaming chunk' },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onText).toHaveBeenCalledWith('streaming chunk');
    });

    it('handles multiple content blocks in one message', () => {
      const handler = createMockHandler();
      const event = {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'First' },
            { type: 'text', text: 'Second' },
          ],
        },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onText).toHaveBeenCalledTimes(2);
      expect(handler.onText).toHaveBeenCalledWith('First');
      expect(handler.onText).toHaveBeenCalledWith('Second');
    });
  });

  describe('user events', () => {
    it('routes user tool_result blocks to onToolResult', () => {
      const handler = createMockHandler();
      const event = {
        type: 'user',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 'tu_2', content: { result: 'ok' } }],
        },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onToolResult).toHaveBeenCalledWith('tu_2', { result: 'ok' });
    });

    it('routes user content_block directly', () => {
      const handler = createMockHandler();
      const event = {
        type: 'user',
        content_block: { type: 'tool_result', tool_use_id: 'tu_3', content: 'done' },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onToolResult).toHaveBeenCalledWith('tu_3', 'done');
    });
  });

  describe('result events', () => {
    it('calls onComplete with metadata', () => {
      const handler = createMockHandler();
      const event = {
        type: 'result',
        duration_ms: 1500,
        cost_usd: 0.02,
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onComplete).toHaveBeenCalledWith({
        durationMs: 1500,
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.02,
      });
    });

    it('emits result text via onText before onComplete', () => {
      const handler = createMockHandler();
      const callOrder: string[] = [];
      (handler.onText as ReturnType<typeof vi.fn>).mockImplementation(() => callOrder.push('text'));
      (handler.onComplete as ReturnType<typeof vi.fn>).mockImplementation(() => callOrder.push('complete'));

      const event = {
        type: 'result',
        result: 'Final answer',
        duration_ms: 500,
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onText).toHaveBeenCalledWith('Final answer');
      expect(callOrder).toEqual(['text', 'complete']);
    });

    it('calls onError for error results and does not call onComplete', () => {
      const handler = createMockHandler();
      const event = {
        type: 'result',
        is_error: true,
        result: 'context length exceeded',
        duration_ms: 200,
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onError).toHaveBeenCalledWith(new Error('context length exceeded'));
      expect(handler.onComplete).not.toHaveBeenCalled();
    });

    it('defaults durationMs to 0 when missing', () => {
      const handler = createMockHandler();
      const event = { type: 'result' };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onComplete).toHaveBeenCalledWith({
        durationMs: 0,
        inputTokens: undefined,
        outputTokens: undefined,
        cost: undefined,
      });
    });

    it('uses duration_api_ms as fallback when duration_ms is absent', () => {
      const handler = createMockHandler();
      const event = { type: 'result', duration_api_ms: 800 };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ durationMs: 800 }),
      );
    });
  });

  describe('NDJSON parsing', () => {
    it('parses multiple events separated by newlines', () => {
      const handler = createMockHandler();
      const lines = [
        JSON.stringify({ type: 'system', message: 'init' }),
        JSON.stringify({
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Hi' }] },
        }),
        JSON.stringify({ type: 'result', duration_ms: 100 }),
      ].join('\n');

      parseClaudeStream(lines, handler);

      expect(handler.onText).toHaveBeenCalledWith('Hi');
      expect(handler.onComplete).toHaveBeenCalledTimes(1);
    });

    it('skips empty lines', () => {
      const handler = createMockHandler();
      const lines = [
        '',
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'A' }] } }),
        '',
        '',
        JSON.stringify({ type: 'result', duration_ms: 10 }),
        '',
      ].join('\n');

      parseClaudeStream(lines, handler);

      expect(handler.onText).toHaveBeenCalledWith('A');
      expect(handler.onComplete).toHaveBeenCalledTimes(1);
    });

    it('skips malformed JSON lines', () => {
      const handler = createMockHandler();
      const lines = [
        '{not valid json',
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'OK' }] } }),
      ].join('\n');

      parseClaudeStream(lines, handler);

      expect(handler.onText).toHaveBeenCalledWith('OK');
      expect(handler.onError).not.toHaveBeenCalled();
    });
  });

  describe('forward-compatibility', () => {
    it('silently skips unknown event types', () => {
      const handler = createMockHandler();
      const lines = [
        JSON.stringify({ type: 'future_event', data: { foo: 'bar' } }),
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hi' }] } }),
      ].join('\n');

      parseClaudeStream(lines, handler);

      expect(handler.onText).toHaveBeenCalledWith('Hi');
      expect(handler.onError).not.toHaveBeenCalled();
    });

    it('skips lines without a type field', () => {
      const handler = createMockHandler();
      const lines = [
        JSON.stringify({ data: 'no type here' }),
        JSON.stringify({ type: 'result', duration_ms: 50 }),
      ].join('\n');

      parseClaudeStream(lines, handler);

      expect(handler.onComplete).toHaveBeenCalledTimes(1);
    });

    it('skips content blocks with unknown types in a message', () => {
      const handler = createMockHandler();
      const event = {
        type: 'assistant',
        message: {
          content: [
            { type: 'unknown_block', data: 42 },
            { type: 'text', text: 'visible' },
          ],
        },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onText).toHaveBeenCalledWith('visible');
      expect(handler.onText).toHaveBeenCalledTimes(1);
    });

    it('handles JSON arrays (non-object) gracefully', () => {
      const handler = createMockHandler();

      parseClaudeStream('[1, 2, 3]', handler);

      expect(handler.onText).not.toHaveBeenCalled();
      expect(handler.onError).not.toHaveBeenCalled();
    });

    it('handles JSON primitives gracefully', () => {
      const handler = createMockHandler();

      parseClaudeStream('"just a string"', handler);

      expect(handler.onText).not.toHaveBeenCalled();
      expect(handler.onError).not.toHaveBeenCalled();
    });

    it('tolerates known events with extra unknown properties', () => {
      const handler = createMockHandler();
      const event = {
        type: 'assistant',
        future_field: { nested: true },
        message: { content: [{ type: 'text', text: 'hello' }] },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onText).toHaveBeenCalledWith('hello');
      expect(handler.onError).not.toHaveBeenCalled();
    });

    it('tolerates content blocks with extra unknown properties', () => {
      const handler = createMockHandler();
      const event = {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'ok', annotations: [{ start: 0, end: 2 }] },
          ],
        },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onText).toHaveBeenCalledWith('ok');
    });

    it('handles known event type with completely unexpected shape', () => {
      const handler = createMockHandler();
      // assistant event with no message or content_block — should not throw
      const event = { type: 'assistant' };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onText).not.toHaveBeenCalled();
      expect(handler.onError).not.toHaveBeenCalled();
    });

    it('processes valid events surrounding unknown ones in a mixed stream', () => {
      const handler = createMockHandler();
      const lines = [
        JSON.stringify({ type: 'system', message: 'init' }),
        JSON.stringify({ type: 'thinking', content: 'internal reasoning' }),
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'A' }] } }),
        JSON.stringify({ type: 'progress', percent: 50 }),
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'B' }] } }),
        JSON.stringify({ type: 'result', duration_ms: 100 }),
      ].join('\n');

      parseClaudeStream(lines, handler);

      expect(handler.onText).toHaveBeenCalledTimes(2);
      expect(handler.onText).toHaveBeenCalledWith('A');
      expect(handler.onText).toHaveBeenCalledWith('B');
      expect(handler.onComplete).toHaveBeenCalledTimes(1);
      expect(handler.onError).not.toHaveBeenCalled();
    });

    it('skips content blocks without a type field mixed with valid blocks', () => {
      const handler = createMockHandler();
      const event = {
        type: 'assistant',
        message: {
          content: [
            { text: 'no type field' },
            { type: 'text', text: 'has type' },
            42,
            null,
          ],
        },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onText).toHaveBeenCalledTimes(1);
      expect(handler.onText).toHaveBeenCalledWith('has type');
    });

    it('handles result event with unknown extra fields without throwing', () => {
      const handler = createMockHandler();
      const event = {
        type: 'result',
        duration_ms: 200,
        model: 'claude-sonnet-4-20250514',
        region: 'us-east-1',
        usage: { input_tokens: 10, output_tokens: 5, cache_read_tokens: 3 },
      };

      parseClaudeStream(JSON.stringify(event), handler);

      expect(handler.onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ durationMs: 200, inputTokens: 10, outputTokens: 5 }),
      );
    });
  });
});
