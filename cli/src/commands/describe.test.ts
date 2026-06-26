import type {
  CliCommand,
  CliContext,
  CliEvent,
  CliEventResult,
} from '@open-tomato/cli-core';

import { describe, expect, it } from 'vitest';

import { CommandRegistry } from '../registry.js';

import * as describeCommand from './describe.js';

interface DescribeEntryShape {
  tool: string;
  command: string;
  description: string;
  args: readonly unknown[];
  flags: readonly unknown[];
}

function makeStubCtx(): { ctx: CliContext; events: CliEvent[] } {
  const events: CliEvent[] = [];
  const ctx: CliContext = {
    args: [],
    flags: {},
    outputMode: 'json',
    verbosity: 0,
    output: {
      info: (): void => {},
      warn: (): void => {},
      error: (): void => {},
      debug: (): void => {},
      emit: (event: CliEvent): void => {
        events.push(event);
      },
      result: (): void => {},
    },
    signal: new AbortController().signal,
    env: {},
  };
  return { ctx, events };
}

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

describe('collectDescribeEntries', () => {
  it('emits tool, command, description, args, flags for each registered command with meta', () => {
    const registry = new CommandRegistry({ commandsDir: null });
    const meta: CliCommand = {
      name: 'next',
      description: 'Show the next Linear task',
      args: [
        { name: 'id', description: 'task id', type: 'string' },
      ],
      flags: [
        { name: 'verbose', description: 'verbose output', type: 'boolean' },
      ],
      run: async (): Promise<void> => {},
    };
    registry.register('linear', 'next', {
      default: async (): Promise<void> => {},
      meta,
    });

    const entries = describeCommand.collectDescribeEntries(registry);

    expect(entries).toEqual([
      {
        tool: 'linear',
        command: 'next',
        description: 'Show the next Linear task',
        args: [{ name: 'id', description: 'task id', type: 'string' }],
        flags: [{ name: 'verbose', description: 'verbose output', type: 'boolean' }],
      },
    ]);
  });

  it('defaults description to "" and empty args/flags for commands without meta', () => {
    const registry = new CommandRegistry({ commandsDir: null });
    registry.register('linear', 'login', {
      default: async (): Promise<void> => {},
    });

    const entries = describeCommand.collectDescribeEntries(registry);

    expect(entries).toEqual([
      {
        tool: 'linear',
        command: 'login',
        description: '',
        args: [],
        flags: [],
      },
    ]);
  });

  it('walks every registered command across multiple tools', () => {
    const registry = new CommandRegistry({ commandsDir: null });
    registry.register('linear', 'next', { default: async (): Promise<void> => {} });
    registry.register('linear', 'login', { default: async (): Promise<void> => {} });
    registry.register('event', 'send', { default: async (): Promise<void> => {} });

    const entries = describeCommand.collectDescribeEntries(registry);
    const keys = entries.map((e) => `${e.tool} ${e.command}`).sort();

    expect(keys).toEqual(['event send', 'linear login', 'linear next']);
  });
});

describe('describe run', () => {
  it('emits a result event whose data.commands is the registry tree', async () => {
    const { ctx, events } = makeStubCtx();

    await describeCommand.default(ctx);

    const result = events.find((e): e is CliEventResult => e.type === 'result');
    expect(result).toBeDefined();
    expect(result?.ok).toBe(true);

    const payload = result?.data as { commands: DescribeEntryShape[] };
    expect(payload).toBeDefined();
    expect(Array.isArray(payload.commands)).toBe(true);
    expect(payload.commands.length).toBeGreaterThan(0);

    for (const entry of payload.commands) {
      expect(typeof entry.tool).toBe('string');
      expect(typeof entry.command).toBe('string');
      expect(typeof entry.description).toBe('string');
      expect(Array.isArray(entry.args)).toBe(true);
      expect(Array.isArray(entry.flags)).toBe(true);
    }
  });
});
