import type { StreamHandler } from '../stream-handler.js';

import { describe, expect, it, vi } from 'vitest';

import { parseTextStream } from './text-stream-parser.js';

function createMockHandler(): StreamHandler {
  return {
    onText: vi.fn(),
    onToolCall: vi.fn(),
    onToolResult: vi.fn(),
    onError: vi.fn(),
    onComplete: vi.fn(),
  };
}

describe('parseTextStream', () => {
  describe('basic text output', () => {
    it('emits trimmed output via onText followed by onComplete', () => {
      const handler = createMockHandler();

      parseTextStream('Hello from Gemini\n', handler);

      expect(handler.onText).toHaveBeenCalledWith('Hello from Gemini');
      expect(handler.onComplete).toHaveBeenCalledWith({
        durationMs: 0,
        inputTokens: undefined,
        outputTokens: undefined,
        cost: undefined,
      });
    });

    it('preserves internal whitespace and newlines', () => {
      const handler = createMockHandler();
      const output = '  Line one\n  Line two\n  Line three  ';

      parseTextStream(output, handler);

      expect(handler.onText).toHaveBeenCalledWith('Line one\n  Line two\n  Line three');
    });

    it('calls onText exactly once for the full output', () => {
      const handler = createMockHandler();

      parseTextStream('first line\nsecond line\nthird line', handler);

      expect(handler.onText).toHaveBeenCalledTimes(1);
    });

    it('calls onText before onComplete', () => {
      const handler = createMockHandler();
      const callOrder: string[] = [];
      (handler.onText as ReturnType<typeof vi.fn>).mockImplementation(() => callOrder.push('text'));
      (handler.onComplete as ReturnType<typeof vi.fn>).mockImplementation(() => callOrder.push('complete'));

      parseTextStream('output', handler);

      expect(callOrder).toEqual(['text', 'complete']);
    });
  });

  describe('empty and whitespace output', () => {
    it('does not call any handler for empty string', () => {
      const handler = createMockHandler();

      parseTextStream('', handler);

      expect(handler.onText).not.toHaveBeenCalled();
      expect(handler.onComplete).not.toHaveBeenCalled();
      expect(handler.onError).not.toHaveBeenCalled();
    });

    it('does not call any handler for whitespace-only string', () => {
      const handler = createMockHandler();

      parseTextStream('   \n\t\n   ', handler);

      expect(handler.onText).not.toHaveBeenCalled();
      expect(handler.onComplete).not.toHaveBeenCalled();
    });

    it('does not call any handler for newline-only string', () => {
      const handler = createMockHandler();

      parseTextStream('\n\n\n', handler);

      expect(handler.onText).not.toHaveBeenCalled();
      expect(handler.onComplete).not.toHaveBeenCalled();
    });
  });

  describe('options', () => {
    it('passes durationMs from options into CompletionMeta', () => {
      const handler = createMockHandler();

      parseTextStream('output', handler, { durationMs: 1500 });

      expect(handler.onComplete).toHaveBeenCalledWith({
        durationMs: 1500,
        inputTokens: undefined,
        outputTokens: undefined,
        cost: undefined,
      });
    });

    it('defaults durationMs to 0 when options are omitted', () => {
      const handler = createMockHandler();

      parseTextStream('output', handler);

      expect(handler.onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ durationMs: 0 }),
      );
    });

    it('defaults durationMs to 0 when options object is empty', () => {
      const handler = createMockHandler();

      parseTextStream('output', handler, {});

      expect(handler.onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ durationMs: 0 }),
      );
    });
  });

  describe('never calls tool or error handlers', () => {
    it('does not call onToolCall for any input', () => {
      const handler = createMockHandler();

      parseTextStream('some tool-like output: read_file("/tmp/a.ts")', handler);

      expect(handler.onToolCall).not.toHaveBeenCalled();
    });

    it('does not call onToolResult for any input', () => {
      const handler = createMockHandler();

      parseTextStream('tool_result: success', handler);

      expect(handler.onToolResult).not.toHaveBeenCalled();
    });

    it('does not call onError for any input', () => {
      const handler = createMockHandler();

      parseTextStream('Error: something went wrong', handler);

      expect(handler.onError).not.toHaveBeenCalled();
    });
  });

  describe('large output', () => {
    it('handles large multi-line output as a single onText call', () => {
      const handler = createMockHandler();
      const lines = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}`);
      const output = lines.join('\n');

      parseTextStream(output, handler);

      expect(handler.onText).toHaveBeenCalledTimes(1);
      expect(handler.onText).toHaveBeenCalledWith(output);
      expect(handler.onComplete).toHaveBeenCalledTimes(1);
    });
  });
});
