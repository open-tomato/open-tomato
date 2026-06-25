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

describe('parseArgs --no-flag negation syntax', () => {
  it('sets the underlying flag to false for --no-flag', () => {
    const result = parseArgs(['--no-color']);

    expect(result.flags).toEqual({ color: false });
    expect(result.positional).toEqual([]);
  });

  it('does not consume the next token as a value for --no-flag', () => {
    const result = parseArgs(['--no-color', 'staging']);

    expect(result.flags).toEqual({ color: false });
    expect(result.positional).toEqual(['staging']);
  });

  it('mixes --no-flag with positional and other flags', () => {
    const result = parseArgs(['svc', '--no-color', '--env=staging']);

    expect(result.flags).toEqual({ color: false, env: 'staging' });
    expect(result.positional).toEqual(['svc']);
  });

  it('preserves hyphenated targets when negating', () => {
    const result = parseArgs(['--no-dry-run']);

    expect(result.flags).toEqual({ 'dry-run': false });
    expect(result.positional).toEqual([]);
  });

  it('treats --no-flag=value as a literal flag named no-<rest>', () => {
    const result = parseArgs(['--no-color=red']);

    expect(result.flags).toEqual({ 'no-color': 'red' });
    expect(result.positional).toEqual([]);
  });

  it('lets a later --flag=value override an earlier --no-flag', () => {
    const result = parseArgs(['--no-color', '--color=red']);

    expect(result.flags).toEqual({ color: 'red' });
    expect(result.positional).toEqual([]);
  });
});

describe('parseArgs short alias syntax', () => {
  it('parses -f=value as a string assignment', () => {
    const result = parseArgs(['-v=2']);

    expect(result.flags).toEqual({ v: '2' });
    expect(result.positional).toEqual([]);
  });

  it('parses space-separated -f value as a string assignment', () => {
    const result = parseArgs(['-v', '2']);

    expect(result.flags).toEqual({ v: '2' });
    expect(result.positional).toEqual([]);
  });

  it('treats a trailing -f at the end of argv as boolean true', () => {
    const result = parseArgs(['svc', '-v']);

    expect(result.flags).toEqual({ v: true });
    expect(result.positional).toEqual(['svc']);
  });

  it('treats -f followed by another flag as boolean true', () => {
    const result = parseArgs(['-v', '--env=staging']);

    expect(result.flags).toEqual({ v: true, env: 'staging' });
    expect(result.positional).toEqual([]);
  });

  it('mixes short aliases with positional args', () => {
    const result = parseArgs(['svc', '-v=2', 'validate']);

    expect(result.flags).toEqual({ v: '2' });
    expect(result.positional).toEqual(['svc', 'validate']);
  });

  it('mixes short aliases with long flags', () => {
    const result = parseArgs(['-v', '2', '--env=staging']);

    expect(result.flags).toEqual({ v: '2', env: 'staging' });
    expect(result.positional).toEqual([]);
  });

  it('keeps additional equals signs inside the value', () => {
    const result = parseArgs(['-f=key=value']);

    expect(result.flags).toEqual({ f: 'key=value' });
  });

  it('accepts an empty value after the equals sign', () => {
    const result = parseArgs(['-f=']);

    expect(result.flags).toEqual({ f: '' });
  });

  it('does not consume a following short flag as a value', () => {
    const result = parseArgs(['-v', '-d']);

    expect(result.flags).toEqual({ v: true, d: true });
    expect(result.positional).toEqual([]);
  });

  it('treats a bare - as a positional argument', () => {
    const result = parseArgs(['cmd', '-']);

    expect(result.flags).toEqual({});
    expect(result.positional).toEqual(['cmd', '-']);
  });
});
