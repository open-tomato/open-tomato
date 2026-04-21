import type { BackendDescriptor } from './backend-descriptor.js';

import { describe, expect, it } from 'vitest';

import { resolveBackendOverride } from './resolve-backend-override.js';

describe('resolveBackendOverride', () => {
  it('resolves "claude" to the Claude descriptor', () => {
    const result = resolveBackendOverride('claude');
    expect(result.name).toBe('claude');
    expect(result.command).toBe('claude');
    expect(result.outputFormat).toBe('stream-json');
  });

  it('resolves "gemini" to the Gemini descriptor', () => {
    const result = resolveBackendOverride('gemini');
    expect(result.name).toBe('gemini');
    expect(result.command).toBe('gemini');
  });

  it('resolves "codex" to the Codex descriptor', () => {
    const result = resolveBackendOverride('codex');
    expect(result.name).toBe('codex');
    expect(result.command).toBe('codex');
  });

  it('returns a defensive copy of a full BackendDescriptor', () => {
    const custom: BackendDescriptor = {
      name: 'my-backend',
      command: 'my-cli',
      args: ['--verbose'],
      promptMode: 'stdin',
      outputFormat: 'text',
      envVars: { MY_KEY: 'val' },
    };

    const result = resolveBackendOverride(custom);

    expect(result).toEqual(custom);
    // Should be a copy, not the same reference
    expect(result).not.toBe(custom);
  });

  it('throws for unknown named backend', () => {
    expect(() => resolveBackendOverride('nonexistent')).toThrow();
  });
});
