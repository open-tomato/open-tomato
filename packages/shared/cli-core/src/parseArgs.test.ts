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
