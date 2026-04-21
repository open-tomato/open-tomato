import type { OutputFormat } from '../backend-descriptor.js';
import type { StreamHandler } from '../stream-handler.js';

import { describe, expect, it, vi } from 'vitest';

import { parseClaudeStream } from './claude-stream-parser.js';
import { parseTextStream } from './text-stream-parser.js';

import { selectStreamParser } from './index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHandler(): StreamHandler {
  return {
    onText: vi.fn(),
    onToolCall: vi.fn(),
    onToolResult: vi.fn(),
    onError: vi.fn(),
    onComplete: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('selectStreamParser', () => {
  it('returns parseClaudeStream for stream-json format', () => {
    expect(selectStreamParser('stream-json')).toBe(parseClaudeStream);
  });

  it('returns parseTextStream for text format', () => {
    expect(selectStreamParser('text')).toBe(parseTextStream);
  });

  it('returns parseTextStream for pi-stream-json format (placeholder)', () => {
    expect(selectStreamParser('pi-stream-json')).toBe(parseTextStream);
  });

  it('returns parseTextStream for acp format (placeholder)', () => {
    expect(selectStreamParser('acp')).toBe(parseTextStream);
  });

  it('covers all OutputFormat values exhaustively', () => {
    const formats: OutputFormat[] = ['text', 'stream-json', 'pi-stream-json', 'acp'];

    for (const format of formats) {
      const parser = selectStreamParser(format);
      expect(typeof parser).toBe('function');
    }
  });

  it('selected parser for stream-json routes text events correctly', () => {
    const parser = selectStreamParser('stream-json');
    const handler = makeHandler();

    const ndjson = '{"type":"assistant","content_block":{"type":"text","text":"hello"}}\n'
      + '{"type":"result","result":"done","duration_ms":100}';

    parser(ndjson, handler);

    expect(handler.onText).toHaveBeenCalledWith('hello');
    expect(handler.onText).toHaveBeenCalledWith('done');
    expect(handler.onComplete).toHaveBeenCalledTimes(1);
  });

  it('selected parser for text routes output as single text event', () => {
    const parser = selectStreamParser('text');
    const handler = makeHandler();

    parser('plain text output', handler);

    expect(handler.onText).toHaveBeenCalledWith('plain text output');
    expect(handler.onComplete).toHaveBeenCalledTimes(1);
  });
});
