import type { CliCommand, CliContext } from '@open-tomato/cli-core';

import { describe, expect, it } from 'vitest';

import * as describeCommand from './describe.js';

describe('describe command module', () => {
  it('exports a meta describing the describe command', () => {
    const meta: CliCommand = describeCommand.meta;
    expect(meta.name).toBe('describe');
    expect(typeof meta.description).toBe('string');
    expect(meta.description.length).toBeGreaterThan(0);
    expect(Array.isArray(meta.args)).toBe(true);
    expect(Array.isArray(meta.flags)).toBe(true);
    expect(typeof meta.run).toBe('function');
  });

  it('exports a default(ctx: CliContext) implementation', () => {
    const fn: (ctx: CliContext) => Promise<void> = describeCommand.default;
    expect(typeof fn).toBe('function');
  });
});
