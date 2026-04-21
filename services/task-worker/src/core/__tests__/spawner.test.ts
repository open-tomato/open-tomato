import { getPreset } from '@open-tomato/worker-protocol';
import { describe, expect, it } from 'vitest';

import { buildClaudeArgs, buildClaudeEnv } from '../spawner.js';

describe('buildClaudeArgs', () => {
  it('builds args for an Anthropic model', () => {
    const preset = getPreset('sonnet')!;
    const args = buildClaudeArgs(preset);

    expect(args).toContain('claude');
    expect(args).toContain('-p');
    expect(args).toContain('--output-format');
    expect(args).toContain('stream-json');
    expect(args).toContain('--dangerously-skip-permissions');
    expect(args).toContain('--model');
    expect(args).toContain(preset.model);
  });

  it('includes --model for custom provider presets', () => {
    const preset = getPreset('local-qwen-14b')!;
    const args = buildClaudeArgs(preset);

    expect(args).toContain('--model');
    expect(args).toContain('qwen2.5-coder:14b');
  });
});

describe('buildClaudeEnv', () => {
  it('returns empty env for Anthropic provider', () => {
    const preset = getPreset('sonnet')!;
    const env = buildClaudeEnv(preset);

    expect(env).toEqual({});
  });

  it('sets ANTHROPIC_BASE_URL for custom provider', () => {
    const preset = getPreset('local-qwen-14b')!;
    const env = buildClaudeEnv(preset);

    expect(env['ANTHROPIC_BASE_URL']).toBe('http://localhost:11434/v1');
  });

  it('allows providerUrl override', () => {
    const preset = getPreset('local-qwen-14b')!;
    const env = buildClaudeEnv(preset, 'http://custom:8080/v1');

    expect(env['ANTHROPIC_BASE_URL']).toBe('http://custom:8080/v1');
  });

  it('ignores providerUrl override for anthropic provider', () => {
    const preset = getPreset('sonnet')!;
    const env = buildClaudeEnv(preset, 'http://ignored:8080');

    expect(env['ANTHROPIC_BASE_URL']).toBeUndefined();
  });
});
