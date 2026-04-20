import { describe, it, expect } from 'vitest';

import {
  ClaudeCodeEventSchema,
  PreToolUseEventSchema,
  PostToolUseEventSchema,
  StopEventSchema,
  NotificationEventSchema,
  SessionStartEventSchema,
  SubagentStartEventSchema,
  UserPromptSubmitEventSchema,
} from '../src/schema';

describe('PreToolUseEventSchema', () => {
  it('accepts a valid PreToolUse payload', () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test.ts' },
      session_id: 'abc-123',
    };
    expect(PreToolUseEventSchema.parse(payload)).toEqual(payload);
  });

  it('accepts minimal PreToolUse without optional fields', () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: {},
    };
    expect(PreToolUseEventSchema.parse(payload)).toEqual(payload);
  });

  it('rejects missing tool_name', () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      tool_input: {},
    };
    expect(() => PreToolUseEventSchema.parse(payload)).toThrow();
  });

  it('rejects missing tool_input', () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      tool_name: 'Read',
    };
    expect(() => PreToolUseEventSchema.parse(payload)).toThrow();
  });

  it('rejects tool_name with wrong type', () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      tool_name: 42,
      tool_input: {},
    };
    expect(() => PreToolUseEventSchema.parse(payload)).toThrow();
  });
});

describe('PostToolUseEventSchema', () => {
  it('accepts a valid PostToolUse payload', () => {
    const payload = {
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/out.ts', content: 'hello' },
      tool_response: { success: true },
      session_id: 'sess-1',
      permission_mode: 'default',
    };
    expect(PostToolUseEventSchema.parse(payload)).toEqual(payload);
  });

  it('accepts PostToolUse with is_error flag', () => {
    const payload = {
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'exit 1' },
      tool_response: { error: 'non-zero exit' },
      is_error: true,
    };
    const result = PostToolUseEventSchema.parse(payload);
    expect(result.is_error).toBe(true);
  });

  it('defaults is_error to undefined when omitted', () => {
    const payload = {
      hook_event_name: 'PostToolUse',
      tool_name: 'Read',
      tool_input: {},
      tool_response: {},
    };
    const result = PostToolUseEventSchema.parse(payload);
    expect(result.is_error).toBeUndefined();
  });

  it('rejects missing tool_response', () => {
    const payload = {
      hook_event_name: 'PostToolUse',
      tool_name: 'Read',
      tool_input: {},
    };
    expect(() => PostToolUseEventSchema.parse(payload)).toThrow();
  });

  it('rejects is_error with wrong type', () => {
    const payload = {
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: {},
      tool_response: {},
      is_error: 'yes',
    };
    expect(() => PostToolUseEventSchema.parse(payload)).toThrow();
  });
});

describe('StopEventSchema', () => {
  it('accepts a minimal Stop payload', () => {
    const payload = { hook_event_name: 'Stop' };
    expect(StopEventSchema.parse(payload)).toEqual(payload);
  });

  it('accepts Stop with optional fields', () => {
    const payload = {
      hook_event_name: 'Stop',
      stop_hook_active: true,
      session_id: 'sess-2',
      transcript_path: '/tmp/transcript.jsonl',
    };
    expect(StopEventSchema.parse(payload)).toEqual(payload);
  });
});

describe('NotificationEventSchema', () => {
  it('accepts a valid Notification payload', () => {
    const payload = {
      hook_event_name: 'Notification',
      message: 'Task completed',
      session_id: 'sess-3',
    };
    expect(NotificationEventSchema.parse(payload)).toEqual(payload);
  });

  it('rejects missing message', () => {
    const payload = { hook_event_name: 'Notification' };
    expect(() => NotificationEventSchema.parse(payload)).toThrow();
  });
});

describe('SessionStartEventSchema', () => {
  it('accepts SessionStart with model', () => {
    const payload = {
      hook_event_name: 'SessionStart',
      session_id: 'sess-4',
      model: 'claude-opus-4-6',
      permission_mode: 'default',
    };
    expect(SessionStartEventSchema.parse(payload)).toEqual(payload);
  });

  it('accepts SessionStart without model', () => {
    const payload = {
      hook_event_name: 'SessionStart',
      session_id: 'sess-5',
    };
    expect(SessionStartEventSchema.parse(payload)).toEqual(payload);
  });
});

describe('SubagentStartEventSchema', () => {
  it('accepts a valid SubagentStart payload', () => {
    const payload = {
      hook_event_name: 'SubagentStart',
      agent_id: 'agent-xyz',
      session_id: 'sess-6',
    };
    expect(SubagentStartEventSchema.parse(payload)).toEqual(payload);
  });

  it('rejects missing agent_id', () => {
    const payload = {
      hook_event_name: 'SubagentStart',
      session_id: 'sess-6',
    };
    expect(() => SubagentStartEventSchema.parse(payload)).toThrow();
  });
});

describe('UserPromptSubmitEventSchema', () => {
  it('accepts a valid UserPromptSubmit payload', () => {
    const payload = {
      hook_event_name: 'UserPromptSubmit',
      session_id: 'sess-7',
    };
    expect(UserPromptSubmitEventSchema.parse(payload)).toEqual(payload);
  });

  it('accepts minimal UserPromptSubmit without optional fields', () => {
    const payload = { hook_event_name: 'UserPromptSubmit' };
    expect(UserPromptSubmitEventSchema.parse(payload)).toEqual(payload);
  });
});

describe('ClaudeCodeEventSchema (discriminated union)', () => {
  it('parses each variant via the union', () => {
    const variants = [
      { hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: {} },
      { hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: {}, tool_response: {} },
      { hook_event_name: 'Stop' },
      { hook_event_name: 'Notification', message: 'hi' },
      { hook_event_name: 'SessionStart' },
      { hook_event_name: 'SubagentStart', agent_id: 'a1' },
      { hook_event_name: 'UserPromptSubmit' },
    ];
    for (const v of variants) {
      expect(() => ClaudeCodeEventSchema.parse(v)).not.toThrow();
    }
  });

  it('rejects unknown hook_event_name', () => {
    const payload = { hook_event_name: 'UnknownEvent', data: 123 };
    expect(() => ClaudeCodeEventSchema.parse(payload)).toThrow();
  });

  it('rejects payload missing hook_event_name', () => {
    const payload = { tool_name: 'Read' };
    expect(() => ClaudeCodeEventSchema.parse(payload)).toThrow();
  });

  it('rejects payload with wrong shape for known variant', () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      // missing tool_name and tool_input
    };
    expect(() => ClaudeCodeEventSchema.parse(payload)).toThrow();
  });

  it('rejects an empty object', () => {
    expect(() => ClaudeCodeEventSchema.parse({})).toThrow();
  });

  it('rejects null and undefined', () => {
    expect(() => ClaudeCodeEventSchema.parse(null)).toThrow();
    expect(() => ClaudeCodeEventSchema.parse(undefined)).toThrow();
  });

  it('rejects a primitive value', () => {
    expect(() => ClaudeCodeEventSchema.parse('PreToolUse')).toThrow();
  });

  it('strips unknown fields from parsed output', () => {
    const payload = {
      hook_event_name: 'Stop',
      session_id: 'sess-99',
      unexpected_field: 'should be stripped',
    };
    const result = ClaudeCodeEventSchema.parse(payload);
    expect(result).not.toHaveProperty('unexpected_field');
    expect(result).toEqual({ hook_event_name: 'Stop', session_id: 'sess-99' });
  });
});
