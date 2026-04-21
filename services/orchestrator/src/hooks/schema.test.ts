/**
 * @packageDocumentation
 * Negative tests for Zod schema validation — assert invalid `HookSpec` inputs
 * throw with descriptive messages.
 */

import { describe, expect, it } from 'vitest';

import {
  hookPayloadSchema,
  hookResultSchema,
  hookSpecSchema,
  suspendStateSchema,
} from './schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validSpec(): Record<string, unknown> {
  return {
    name: 'my-hook',
    command: '/usr/bin/env',
    timeoutMs: 1000,
    on_error: 'warn',
  };
}

function validPayload(): Record<string, unknown> {
  return {
    iteration: 1,
    hat: 'planner',
    events: [],
    metadata: {},
  };
}

function validResult(): Record<string, unknown> {
  return {
    hookName: 'my-hook',
    phase: 'pre.loop.start',
    exitCode: 0,
    stdout: '',
    stderr: '',
    durationMs: 42,
    disposition: 'continue',
  };
}

function validSuspendState(): Record<string, unknown> {
  return {
    phase: 'pre.loop.start',
    hookName: 'my-hook',
    payload: validPayload(),
    suspendMode: 'WaitForResume',
    suspendedAt: '2026-01-01T00:00:00.000Z',
    retryCount: 0,
  };
}

/** Returns the flattened path strings from a ZodError issue list. */
function issuePaths(error: unknown): string[] {
  if (
    error instanceof Error &&
    'issues' in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
  ) {
    return (error as { issues: { path: (string | number)[] }[] }).issues.map(
      (issue) => issue.path.join('.'),
    );
  }
  return [];
}

/** Returns the flattened message strings from a ZodError issue list. */
function issueMessages(error: unknown): string[] {
  if (
    error instanceof Error &&
    'issues' in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
  ) {
    return (error as { issues: { message: string }[] }).issues.map((issue) => issue.message);
  }
  return [];
}

// ---------------------------------------------------------------------------
// hookSpecSchema — negative tests
// ---------------------------------------------------------------------------

describe('hookSpecSchema — invalid inputs', () => {
  it('rejects missing name', () => {
    const input = { ...validSpec(), name: undefined };
    expect(() => hookSpecSchema.parse(input)).toThrow();
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('name');
    }
  });

  it('rejects empty string name', () => {
    const input = { ...validSpec(), name: '' };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('name');
    }
  });

  it('rejects missing command', () => {
    const input = { ...validSpec(), command: undefined };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('command');
    }
  });

  it('rejects empty string command', () => {
    const input = { ...validSpec(), command: '' };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('command');
    }
  });

  it('rejects missing timeoutMs', () => {
    const input = { ...validSpec(), timeoutMs: undefined };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('timeoutMs');
    }
  });

  it('rejects zero timeoutMs', () => {
    const input = { ...validSpec(), timeoutMs: 0 };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('timeoutMs');
    }
  });

  it('rejects negative timeoutMs', () => {
    const input = { ...validSpec(), timeoutMs: -100 };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('timeoutMs');
    }
  });

  it('rejects non-integer timeoutMs', () => {
    const input = { ...validSpec(), timeoutMs: 1.5 };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('timeoutMs');
    }
  });

  it('rejects missing on_error', () => {
    const input = { ...validSpec(), on_error: undefined };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('on_error');
    }
  });

  it('rejects unknown on_error value', () => {
    const input = { ...validSpec(), on_error: 'ignore' };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('on_error');
      expect(issueMessages(err.error).join(' ')).toMatch(/invalid_enum_value|Invalid enum value/i);
    }
  });

  it('rejects unknown suspend_mode value', () => {
    const input = { ...validSpec(), suspend_mode: 'AutoRetry' };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('suspend_mode');
    }
  });

  it('rejects non-boolean mutate.enabled', () => {
    const input = { ...validSpec(), mutate: { enabled: 'yes' } };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('mutate.enabled');
    }
  });

  it('rejects zero max_output_bytes', () => {
    const input = { ...validSpec(), max_output_bytes: 0 };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('max_output_bytes');
    }
  });

  it('rejects non-integer max_output_bytes', () => {
    const input = { ...validSpec(), max_output_bytes: 1024.5 };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('max_output_bytes');
    }
  });

  it('rejects non-record env value', () => {
    const input = { ...validSpec(), env: { KEY: 42 } };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error).some((p) => p.startsWith('env'))).toBe(true);
    }
  });

  it('rejects args containing non-strings', () => {
    const input = { ...validSpec(), args: [123] };
    const err = hookSpecSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error).some((p) => p.startsWith('args'))).toBe(true);
    }
  });

  it('accepts a minimal valid spec', () => {
    const result = hookSpecSchema.safeParse(validSpec());
    expect(result.success).toBe(true);
  });

  it('accepts a fully populated valid spec', () => {
    const input = {
      ...validSpec(),
      args: ['--flag'],
      cwd: '/tmp',
      env: { MY_VAR: 'value' },
      suspend_mode: 'RetryBackoff',
      mutate: { enabled: true },
      max_output_bytes: 4096,
    };
    const result = hookSpecSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hookPayloadSchema — negative tests
// ---------------------------------------------------------------------------

describe('hookPayloadSchema — invalid inputs', () => {
  it('rejects missing iteration', () => {
    const input = { ...validPayload(), iteration: undefined };
    const err = hookPayloadSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('iteration');
    }
  });

  it('rejects zero iteration', () => {
    const input = { ...validPayload(), iteration: 0 };
    const err = hookPayloadSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('iteration');
    }
  });

  it('rejects non-integer iteration', () => {
    const input = { ...validPayload(), iteration: 1.5 };
    const err = hookPayloadSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('iteration');
    }
  });

  it('rejects missing hat', () => {
    const input = { ...validPayload(), hat: undefined };
    const err = hookPayloadSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('hat');
    }
  });

  it('rejects empty string hat', () => {
    const input = { ...validPayload(), hat: '' };
    const err = hookPayloadSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('hat');
    }
  });

  it('rejects non-array events', () => {
    const input = { ...validPayload(), events: 'not-an-array' };
    const err = hookPayloadSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('events');
    }
  });

  it('rejects non-object metadata', () => {
    const input = { ...validPayload(), metadata: 'flat-string' };
    const err = hookPayloadSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('metadata');
    }
  });

  it('accepts a valid payload', () => {
    expect(hookPayloadSchema.safeParse(validPayload()).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hookResultSchema — negative tests
// ---------------------------------------------------------------------------

describe('hookResultSchema — invalid inputs', () => {
  it('rejects empty hookName', () => {
    const input = { ...validResult(), hookName: '' };
    const err = hookResultSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('hookName');
    }
  });

  it('rejects unknown phase', () => {
    const input = { ...validResult(), phase: 'pre.unknown.event' };
    const err = hookResultSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('phase');
    }
  });

  it('rejects non-null non-integer exitCode', () => {
    const input = { ...validResult(), exitCode: 1.5 };
    const err = hookResultSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('exitCode');
    }
  });

  it('rejects negative durationMs', () => {
    const input = { ...validResult(), durationMs: -1 };
    const err = hookResultSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('durationMs');
    }
  });

  it('rejects unknown disposition', () => {
    const input = { ...validResult(), disposition: 'skip' };
    const err = hookResultSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('disposition');
    }
  });

  it('accepts null exitCode (process killed)', () => {
    const input = { ...validResult(), exitCode: null };
    expect(hookResultSchema.safeParse(input).success).toBe(true);
  });

  it('accepts a valid result', () => {
    expect(hookResultSchema.safeParse(validResult()).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// suspendStateSchema — negative tests
// ---------------------------------------------------------------------------

describe('suspendStateSchema — invalid inputs', () => {
  it('rejects unknown suspendMode', () => {
    const input = { ...validSuspendState(), suspendMode: 'ManualResume' };
    const err = suspendStateSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('suspendMode');
    }
  });

  it('rejects non-ISO suspendedAt', () => {
    const input = { ...validSuspendState(), suspendedAt: '1st January 2026' };
    const err = suspendStateSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('suspendedAt');
    }
  });

  it('rejects negative retryCount', () => {
    const input = { ...validSuspendState(), retryCount: -1 };
    const err = suspendStateSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('retryCount');
    }
  });

  it('rejects non-integer retryCount', () => {
    const input = { ...validSuspendState(), retryCount: 1.2 };
    const err = suspendStateSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error)).toContain('retryCount');
    }
  });

  it('rejects invalid nested payload', () => {
    const input = { ...validSuspendState(), payload: { ...validPayload(), iteration: 0 } };
    const err = suspendStateSchema.safeParse(input);
    expect(err.success).toBe(false);
    if (!err.success) {
      expect(issuePaths(err.error).some((p) => p.startsWith('payload'))).toBe(true);
    }
  });

  it('accepts a valid suspend state', () => {
    expect(suspendStateSchema.safeParse(validSuspendState()).success).toBe(true);
  });
});
