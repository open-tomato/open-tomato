import { describe, expect, it } from 'vitest';

import { parseArgs } from './parseArgs';

describe('parseArgs --flag=value syntax', () => {
  it('parses a single --flag=value assignment', () => {
    const result = parseArgs(['--env=staging']);

    expect(result.flags).toEqual({ env: 'staging' });
    expect(result.positional).toEqual([]);
  });

  it('parses multiple --flag=value assignments', () => {
    const result = parseArgs(['--env=staging', '--region=us-east-1']);

    expect(result.flags).toEqual({ env: 'staging', region: 'us-east-1' });
    expect(result.positional).toEqual([]);
  });

  it('preserves positional args alongside --flag=value', () => {
    const result = parseArgs(['svc', '--env=staging', 'validate']);

    expect(result.flags).toEqual({ env: 'staging' });
    expect(result.positional).toEqual(['svc', 'validate']);
  });

  it('treats the value as a string even when it parses as a number', () => {
    const result = parseArgs(['--port=8080']);

    expect(result.flags).toEqual({ port: '8080' });
  });

  it('accepts an empty value after the equals sign', () => {
    const result = parseArgs(['--label=']);

    expect(result.flags).toEqual({ label: '' });
  });

  it('keeps additional equals signs inside the value', () => {
    const result = parseArgs(['--filter=key=value']);

    expect(result.flags).toEqual({ filter: 'key=value' });
  });
});

describe('parseArgs --flag value (space-separated) syntax', () => {
  it('parses a single space-separated --flag value pair', () => {
    const result = parseArgs(['--env', 'staging']);

    expect(result.flags).toEqual({ env: 'staging' });
    expect(result.positional).toEqual([]);
  });

  it('parses multiple space-separated --flag value pairs', () => {
    const result = parseArgs(['--env', 'staging', '--region', 'us-east-1']);

    expect(result.flags).toEqual({ env: 'staging', region: 'us-east-1' });
    expect(result.positional).toEqual([]);
  });

  it('preserves positional args alongside space-separated flags', () => {
    const result = parseArgs(['svc', '--env', 'staging', 'validate']);

    expect(result.flags).toEqual({ env: 'staging' });
    expect(result.positional).toEqual(['svc', 'validate']);
  });

  it('keeps an = inside a space-separated value', () => {
    const result = parseArgs(['--filter', 'key=value']);

    expect(result.flags).toEqual({ filter: 'key=value' });
  });

  it('treats the value as a string even when it parses as a number', () => {
    const result = parseArgs(['--port', '8080']);

    expect(result.flags).toEqual({ port: '8080' });
  });

  it('mixes --flag=value and --flag value forms in one argv', () => {
    const result = parseArgs(['--env=staging', '--region', 'us-east-1']);

    expect(result.flags).toEqual({ env: 'staging', region: 'us-east-1' });
    expect(result.positional).toEqual([]);
  });

  it('does not consume a following flag as a value', () => {
    const result = parseArgs(['--env', '--region', 'us-east-1']);

    expect(result.flags).toEqual({ env: true, region: 'us-east-1' });
    expect(result.positional).toEqual([]);
  });
});

describe('parseArgs boolean flag syntax', () => {
  it('parses a single bare --flag as true', () => {
    const result = parseArgs(['--verbose']);

    expect(result.flags).toEqual({ verbose: true });
    expect(result.positional).toEqual([]);
  });

  it('parses multiple bare --flag arguments as true', () => {
    const result = parseArgs(['--verbose', '--debug']);

    expect(result.flags).toEqual({ verbose: true, debug: true });
    expect(result.positional).toEqual([]);
  });

  it('treats a trailing --flag at the end of argv as boolean true', () => {
    const result = parseArgs(['svc', '--verbose']);

    expect(result.flags).toEqual({ verbose: true });
    expect(result.positional).toEqual(['svc']);
  });

  it('mixes boolean flags with --flag=value forms', () => {
    const result = parseArgs(['--verbose', '--env=staging']);

    expect(result.flags).toEqual({ verbose: true, env: 'staging' });
    expect(result.positional).toEqual([]);
  });

  it('treats a flag followed by another flag as boolean true', () => {
    const result = parseArgs(['--verbose', '--env=staging', '--region', 'us-east-1']);

    expect(result.flags).toEqual({ verbose: true, env: 'staging', region: 'us-east-1' });
    expect(result.positional).toEqual([]);
  });
});
