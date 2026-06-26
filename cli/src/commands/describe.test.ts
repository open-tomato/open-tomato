import type {
  CliCommand,
  CliContext,
  CliEvent,
  CliEventResult,
} from '@open-tomato/cli-core';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { CommandRegistry } from '../registry.js';

import * as describeCommand from './describe.js';

interface DescribeEntryShape {
  tool: string;
  command: string;
  description: string;
  args: readonly unknown[];
  flags: readonly unknown[];
}

function makeStubCtx(
  outputMode: 'text' | 'json' = 'json',
): { ctx: CliContext; events: CliEvent[] } {
  const events: CliEvent[] = [];
  const ctx: CliContext = {
    args: [],
    flags: {},
    outputMode,
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

  it('surfaces a newly added command file with meta in the describe output', () => {
    const registry = new CommandRegistry({ commandsDir: null });
    registry.register('linear', 'next', {
      default: async (): Promise<void> => {},
      meta: {
        name: 'next',
        description: 'Show the next Linear task',
        args: [],
        flags: [],
        run: async (): Promise<void> => {},
      },
    });

    const baseline = describeCommand.collectDescribeEntries(registry);
    expect(baseline.find((e) => e.command === 'brand-new')).toBeUndefined();

    // Simulate the dispatcher autoloading a freshly added command file —
    // autoload() registers discovered modules via the same `register()`
    // path used here.
    registry.register('linear', 'brand-new', {
      default: async (): Promise<void> => {},
      meta: {
        name: 'brand-new',
        description: 'A freshly added command',
        args: [{ name: 'target', description: 'who to greet', type: 'string' }],
        flags: [{ name: 'force', description: 'force the action', type: 'boolean' }],
        run: async (): Promise<void> => {},
      },
    });

    const updated = describeCommand.collectDescribeEntries(registry);
    const added = updated.find((e) => e.command === 'brand-new');
    expect(added).toEqual({
      tool: 'linear',
      command: 'brand-new',
      description: 'A freshly added command',
      args: [{ name: 'target', description: 'who to greet', type: 'string' }],
      flags: [{ name: 'force', description: 'force the action', type: 'boolean' }],
    });
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

describe('describe JSON output shape contract', () => {
  it('emits a payload whose top-level keys match the documented shape', async () => {
    const { ctx, events } = makeStubCtx('json');

    await describeCommand.default(ctx);

    const result = events.find((e): e is CliEventResult => e.type === 'result');
    expect(result).toBeDefined();
    expect(result?.ok).toBe(true);

    const payload = result?.data as describeCommand.DescribePayload;
    expect(payload).toBeDefined();
    expect(Object.keys(payload).sort()).toEqual(
      ['binary', 'commands', 'schemaVersion', 'version'].sort(),
    );
  });

  it('sets schemaVersion to the literal 1', async () => {
    const { ctx, events } = makeStubCtx('json');

    await describeCommand.default(ctx);

    const result = events.find((e): e is CliEventResult => e.type === 'result');
    const payload = result?.data as describeCommand.DescribePayload;

    expect(payload.schemaVersion).toBe(1);
    expect(typeof payload.schemaVersion).toBe('number');
  });

  it('sets binary to "tomato" and version to a non-empty string', async () => {
    const { ctx, events } = makeStubCtx('json');

    await describeCommand.default(ctx);

    const result = events.find((e): e is CliEventResult => e.type === 'result');
    const payload = result?.data as describeCommand.DescribePayload;

    expect(payload.binary).toBe('tomato');
    expect(typeof payload.version).toBe('string');
    expect(payload.version.length).toBeGreaterThan(0);
  });

  it('emits each commands[] entry with exactly tool, command, description, args, flags keys', async () => {
    const { ctx, events } = makeStubCtx('json');

    await describeCommand.default(ctx);

    const result = events.find((e): e is CliEventResult => e.type === 'result');
    const payload = result?.data as describeCommand.DescribePayload;

    expect(payload.commands.length).toBeGreaterThan(0);
    for (const entry of payload.commands) {
      expect(Object.keys(entry).sort()).toEqual(
        ['args', 'command', 'description', 'flags', 'tool'].sort(),
      );
    }
  });

  it('serializes cleanly to JSON and round-trips with schemaVersion === 1', async () => {
    const { ctx, events } = makeStubCtx('json');

    await describeCommand.default(ctx);

    const result = events.find((e): e is CliEventResult => e.type === 'result');
    const payload = result?.data as describeCommand.DescribePayload;

    const roundTripped = JSON.parse(JSON.stringify(payload)) as {
      schemaVersion: number;
      binary: string;
      version: string;
      commands: DescribeEntryShape[];
    };

    expect(roundTripped.schemaVersion).toBe(1);
    expect(roundTripped.binary).toBe('tomato');
    expect(typeof roundTripped.version).toBe('string');
    expect(Array.isArray(roundTripped.commands)).toBe(true);
  });
});

describe('renderTextTree', () => {
  it('groups commands by tool with a header line per tool', () => {
    const payload: describeCommand.DescribePayload = {
      schemaVersion: 1,
      binary: 'tomato',
      version: '0.2.0',
      commands: [
        { tool: 'linear', command: 'next', description: 'Show the next task', args: [], flags: [] },
        { tool: 'linear', command: 'login', description: 'Authenticate', args: [], flags: [] },
        { tool: 'event', command: 'send', description: 'Send an event', args: [], flags: [] },
      ],
    };

    const text = describeCommand.renderTextTree(payload);

    expect(text).toContain('linear:');
    expect(text).toContain('event:');
    expect(text).toContain('next');
    expect(text).toContain('login');
    expect(text).toContain('send');
  });

  it('sorts tools alphabetically and commands alphabetically within each tool', () => {
    const payload: describeCommand.DescribePayload = {
      schemaVersion: 1,
      binary: 'tomato',
      version: '0.2.0',
      commands: [
        { tool: 'linear', command: 'next', description: '', args: [], flags: [] },
        { tool: 'event', command: 'send', description: '', args: [], flags: [] },
        { tool: 'linear', command: 'login', description: '', args: [], flags: [] },
      ],
    };

    const text = describeCommand.renderTextTree(payload);

    const eventIdx = text.indexOf('event:');
    const linearIdx = text.indexOf('linear:');
    expect(eventIdx).toBeGreaterThanOrEqual(0);
    expect(linearIdx).toBeGreaterThan(eventIdx);

    const loginIdx = text.indexOf('login');
    const nextIdx = text.indexOf('next');
    expect(loginIdx).toBeGreaterThan(linearIdx);
    expect(nextIdx).toBeGreaterThan(loginIdx);
  });

  it('includes binary and version in a header line', () => {
    const payload: describeCommand.DescribePayload = {
      schemaVersion: 1,
      binary: 'tomato',
      version: '9.9.9',
      commands: [
        { tool: 'linear', command: 'next', description: '', args: [], flags: [] },
      ],
    };

    const text = describeCommand.renderTextTree(payload);
    expect(text).toContain('tomato');
    expect(text).toContain('9.9.9');
  });

  it('includes the description when present and omits the colon when absent', () => {
    const payload: describeCommand.DescribePayload = {
      schemaVersion: 1,
      binary: 'tomato',
      version: '0.2.0',
      commands: [
        { tool: 'linear', command: 'next', description: 'Show the next task', args: [], flags: [] },
        { tool: 'linear', command: 'login', description: '', args: [], flags: [] },
      ],
    };

    const text = describeCommand.renderTextTree(payload);
    expect(text).toContain('next: Show the next task');
    expect(text).not.toContain('login: ');
    expect(text).toContain('login');
  });
});

describe('describe run in text mode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes a human-readable grouped tree to stdout instead of emitting a result event', async () => {
    const writeSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const { ctx, events } = makeStubCtx('text');

    await describeCommand.default(ctx);

    const result = events.find((e): e is CliEventResult => e.type === 'result');
    expect(result).toBeUndefined();

    const written = writeSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(written.length).toBeGreaterThan(0);
    expect(written).toMatch(/:/);
    expect(written).not.toMatch(/^\{"schemaVersion"/);
  });
});
