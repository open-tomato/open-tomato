import { describe, it, expect } from 'vitest';

import { handleInboundWebhook } from '../src/handler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBody(sourceId: string, event: Record<string, unknown>): unknown {
  return { sourceId, ...event };
}

// ---------------------------------------------------------------------------
// Successful normalization
// ---------------------------------------------------------------------------

describe('handleInboundWebhook — successful normalization', () => {
  it('normalizes a PreToolUse event', () => {
    const body = makeBody('src-1', {
      hook_event_name: 'PreToolUse',
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test.ts' },
    });
    const result = handleInboundWebhook(body);
    expect(result).toEqual({
      ok: true,
      event: {
        entityKind: 'anthropic',
        sourceId: 'src-1',
        eventType: 'PreToolUse',
        payload: {
          hook_event_name: 'PreToolUse',
          tool_name: 'Read',
          tool_input: { file_path: '/tmp/test.ts' },
        },
      },
    });
  });

  it('normalizes a PostToolUse event with is_error', () => {
    const body = makeBody('src-2', {
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'exit 1' },
      tool_response: { error: 'non-zero exit' },
      is_error: true,
    });
    const result = handleInboundWebhook(body);
    expect(result).toEqual({
      ok: true,
      event: {
        entityKind: 'anthropic',
        sourceId: 'src-2',
        eventType: 'PostToolUse',
        payload: {
          hook_event_name: 'PostToolUse',
          tool_name: 'Bash',
          tool_input: { command: 'exit 1' },
          tool_response: { error: 'non-zero exit' },
          is_error: true,
        },
      },
    });
  });

  it('normalizes a Stop event', () => {
    const body = makeBody('src-3', {
      hook_event_name: 'Stop',
      stop_hook_active: false,
    });
    const result = handleInboundWebhook(body);
    expect(result).toEqual({
      ok: true,
      event: {
        entityKind: 'anthropic',
        sourceId: 'src-3',
        eventType: 'Stop',
        payload: {
          hook_event_name: 'Stop',
          stop_hook_active: false,
        },
      },
    });
  });

  it('normalizes a Notification event', () => {
    const body = makeBody('src-4', {
      hook_event_name: 'Notification',
      message: 'Task completed',
    });
    const result = handleInboundWebhook(body);
    expect(result).toEqual({
      ok: true,
      event: {
        entityKind: 'anthropic',
        sourceId: 'src-4',
        eventType: 'Notification',
        payload: {
          hook_event_name: 'Notification',
          message: 'Task completed',
        },
      },
    });
  });

  it('normalizes a SessionStart event', () => {
    const body = makeBody('src-5', {
      hook_event_name: 'SessionStart',
      model: 'claude-opus-4-6',
      session_id: 'sess-1',
    });
    const result = handleInboundWebhook(body);
    expect(result).toEqual({
      ok: true,
      event: {
        entityKind: 'anthropic',
        sourceId: 'src-5',
        eventType: 'SessionStart',
        payload: {
          hook_event_name: 'SessionStart',
          model: 'claude-opus-4-6',
          session_id: 'sess-1',
        },
      },
    });
  });

  it('normalizes a SubagentStart event', () => {
    const body = makeBody('src-6', {
      hook_event_name: 'SubagentStart',
      agent_id: 'agent-xyz',
    });
    const result = handleInboundWebhook(body);
    expect(result).toEqual({
      ok: true,
      event: {
        entityKind: 'anthropic',
        sourceId: 'src-6',
        eventType: 'SubagentStart',
        payload: {
          hook_event_name: 'SubagentStart',
          agent_id: 'agent-xyz',
        },
      },
    });
  });

  it('normalizes a UserPromptSubmit event', () => {
    const body = makeBody('src-7', { hook_event_name: 'UserPromptSubmit' });
    const result = handleInboundWebhook(body);
    expect(result).toEqual({
      ok: true,
      event: {
        entityKind: 'anthropic',
        sourceId: 'src-7',
        eventType: 'UserPromptSubmit',
        payload: { hook_event_name: 'UserPromptSubmit' },
      },
    });
  });

  it('preserves optional base fields in normalized payload', () => {
    const body = makeBody('src-8', {
      hook_event_name: 'Stop',
      session_id: 'sess-base',
      permission_mode: 'plan',
      transcript_path: '/tmp/transcript.jsonl',
    });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.payload).toEqual({
        hook_event_name: 'Stop',
        session_id: 'sess-base',
        permission_mode: 'plan',
        transcript_path: '/tmp/transcript.jsonl',
      });
    }
  });

  it('strips sourceId from the event payload', () => {
    const body = makeBody('src-9', {
      hook_event_name: 'Stop',
    });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.payload).not.toHaveProperty('sourceId');
      expect(result.event.sourceId).toBe('src-9');
    }
  });
});

// ---------------------------------------------------------------------------
// Schema validation rejection
// ---------------------------------------------------------------------------

describe('handleInboundWebhook — schema validation rejection', () => {
  it('rejects unknown hook_event_name', () => {
    const body = makeBody('src-1', {
      hook_event_name: 'UnknownEvent',
      data: 123,
    });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid Claude Code event payload');
    }
  });

  it('rejects PreToolUse missing required tool_name', () => {
    const body = makeBody('src-1', {
      hook_event_name: 'PreToolUse',
      tool_input: {},
    });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid Claude Code event payload');
    }
  });

  it('rejects PostToolUse missing required tool_response', () => {
    const body = makeBody('src-1', {
      hook_event_name: 'PostToolUse',
      tool_name: 'Read',
      tool_input: {},
    });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(false);
  });

  it('rejects Notification missing required message', () => {
    const body = makeBody('src-1', {
      hook_event_name: 'Notification',
    });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(false);
  });

  it('rejects SubagentStart missing required agent_id', () => {
    const body = makeBody('src-1', {
      hook_event_name: 'SubagentStart',
    });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(false);
  });

  it('rejects payload with no hook_event_name', () => {
    const body = makeBody('src-1', { tool_name: 'Read' });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(false);
  });

  it('rejects payload with wrong type for hook_event_name', () => {
    const body = makeBody('src-1', { hook_event_name: 42 });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge-case payload shapes
// ---------------------------------------------------------------------------

describe('handleInboundWebhook — edge cases', () => {
  it('rejects null body', () => {
    const result = handleInboundWebhook(null);
    expect(result).toEqual({
      ok: false,
      error: 'Request body must be a JSON object',
    });
  });

  it('rejects undefined body', () => {
    const result = handleInboundWebhook(undefined);
    expect(result).toEqual({
      ok: false,
      error: 'Request body must be a JSON object',
    });
  });

  it('rejects a string body', () => {
    const result = handleInboundWebhook('not an object');
    expect(result).toEqual({
      ok: false,
      error: 'Request body must be a JSON object',
    });
  });

  it('rejects a number body', () => {
    const result = handleInboundWebhook(42);
    expect(result).toEqual({
      ok: false,
      error: 'Request body must be a JSON object',
    });
  });

  it('rejects an array body', () => {
    // Arrays pass typeof === 'object' but are not null — handler should still
    // process them. They will fail the sourceId check since arrays don't have it.
    const result = handleInboundWebhook([1, 2, 3]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('sourceId');
    }
  });

  it('rejects empty object (missing sourceId)', () => {
    const result = handleInboundWebhook({});
    expect(result).toEqual({
      ok: false,
      error: 'Missing or empty "sourceId" field',
    });
  });

  it('rejects sourceId as empty string', () => {
    const result = handleInboundWebhook({
      sourceId: '',
      hook_event_name: 'Stop',
    });
    expect(result).toEqual({
      ok: false,
      error: 'Missing or empty "sourceId" field',
    });
  });

  it('rejects sourceId as non-string type', () => {
    const result = handleInboundWebhook({
      sourceId: 123,
      hook_event_name: 'Stop',
    });
    expect(result).toEqual({
      ok: false,
      error: 'Missing or empty "sourceId" field',
    });
  });

  it('rejects sourceId as null', () => {
    const result = handleInboundWebhook({
      sourceId: null,
      hook_event_name: 'Stop',
    });
    expect(result).toEqual({
      ok: false,
      error: 'Missing or empty "sourceId" field',
    });
  });

  it('strips unknown fields from the event payload via Zod', () => {
    const body = {
      sourceId: 'src-strip',
      hook_event_name: 'Stop',
      session_id: 'sess-99',
      unexpected_extra: 'should be stripped',
    };
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.payload).not.toHaveProperty('unexpected_extra');
      expect(result.event.payload).toEqual({
        hook_event_name: 'Stop',
        session_id: 'sess-99',
      });
    }
  });

  it('handles deeply nested tool_input and tool_response', () => {
    const body = makeBody('src-deep', {
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/deep.ts',
        content: { nested: { deep: [1, 2, { x: true }] } },
      },
      tool_response: {
        result: { layers: [{ ok: true }] },
      },
    });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.eventType).toBe('PostToolUse');
    }
  });

  it('handles empty tool_input and tool_response objects', () => {
    const body = makeBody('src-empty', {
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: {},
      tool_response: {},
    });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.eventType).toBe('PostToolUse');
    }
  });

  it('always returns entityKind as anthropic', () => {
    const body = makeBody('src-kind', { hook_event_name: 'Stop' });
    const result = handleInboundWebhook(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.entityKind).toBe('anthropic');
    }
  });
});
