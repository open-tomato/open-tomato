import type {
  CliCommand,
  CliContext,
  CliEvent,
  CliEventResult,
  CliOutputStream,
} from '@open-tomato/cli-core';

import { describe, expect, it, vi } from 'vitest';

vi.mock('./root.js', () => ({
  resolveRepoRoot: vi.fn(() => '/repo'),
}));

vi.mock('./discovery/index.js', () => ({
  findOpenTomatoRoot: vi.fn(() => null),
  loadManifest: vi.fn(() => null),
  loadExternalCommands: vi.fn(async () => []),
}));

import {
  findOpenTomatoRoot,
  loadExternalCommands,
  loadManifest,
} from './discovery/index.js';
import { dispatch } from './dispatch.js';
import { CommandRegistry, type CommandModule } from './registry.js';

interface Recorder {
  stream: CliOutputStream;
  chunks: string[];
}

function makeRecorder(): Recorder {
  const chunks: string[] = [];
  const stream: CliOutputStream = {
    write(chunk: string): unknown {
      chunks.push(chunk);
      return true;
    },
  };
  return { stream, chunks };
}

function parseNdjson(chunks: readonly string[]): CliEvent[] {
  return chunks
    .join('')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as CliEvent);
}

function makeMeta(name: string): CliCommand {
  return {
    name,
    description: `meta for ${name}`,
    args: [],
    flags: [],
    run: async (): Promise<void> => {},
  };
}

describe('dispatch', () => {
  it('returns exit code 1 and emits a command_not_found result event when the command is unknown', async () => {
    const registry = new CommandRegistry({ commandsDir: null });
    const { stream, chunks } = makeRecorder();

    const code = await dispatch(['linear', 'next', '--output=json'], {
      registry,
      env: {},
      stream,
    });

    expect(code).toBe(1);

    const events = parseNdjson(chunks);
    const result = events.find((e): e is CliEventResult => e.type === 'result');
    expect(result).toBeDefined();
    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe('command_not_found');
    expect(result?.error?.message).toContain('linear next');
  });

  it('routes a known legacy command (no meta) through runLegacyCommand with sliced args', async () => {
    const registry = new CommandRegistry({ commandsDir: null });
    const defaultFn = vi.fn();
    const mod: CommandModule = { default: defaultFn };
    registry.register('linear', 'next', mod);

    const { stream } = makeRecorder();

    const code = await dispatch(['linear', 'next', 'extra'], {
      registry,
      env: {},
      stream,
    });

    expect(code).toBe(0);
    expect(defaultFn).toHaveBeenCalledTimes(1);

    const call = defaultFn.mock.calls[0];
    expect(call).toBeDefined();
    expect(call?.[0]).toEqual(['extra']);
    expect(call?.[1]).toEqual({ repoRoot: '/repo' });
  });

  it('passes the assembled CliContext directly to a meta-aware command', async () => {
    const registry = new CommandRegistry({ commandsDir: null });
    const defaultFn = vi.fn().mockResolvedValue(undefined);
    registry.register('linear', 'next', {
      default: defaultFn,
      meta: makeMeta('next'),
    });

    const { stream } = makeRecorder();

    const code = await dispatch(['linear', 'next', 'extra'], {
      registry,
      env: {},
      stream,
    });

    expect(code).toBe(0);
    expect(defaultFn).toHaveBeenCalledTimes(1);
    expect(defaultFn.mock.calls[0]).toHaveLength(1);

    const ctx = defaultFn.mock.calls[0]?.[0] as CliContext;
    expect(ctx).toBeDefined();
    expect(ctx.args).toEqual(['extra']);
    expect(ctx.outputMode).toBe('text');
    expect(typeof ctx.output.emit).toBe('function');
    expect(ctx.signal).toBeInstanceOf(AbortSignal);
  });

  it('emits NDJSON events to stdout as one-per-line JSON when --output=json', async () => {
    const registry = new CommandRegistry({ commandsDir: null });
    registry.register('linear', 'next', {
      default: async (): Promise<void> => {},
      meta: makeMeta('next'),
    });

    const { stream, chunks } = makeRecorder();
    const code = await dispatch(['linear', 'next', '--output=json'], {
      registry,
      env: {},
      stream,
    });

    expect(code).toBe(0);
    expect(chunks.length).toBeGreaterThan(0);

    for (const chunk of chunks) {
      expect(chunk.endsWith('\n')).toBe(true);
      const trimmed = chunk.slice(0, -1);
      expect(trimmed).not.toContain('\n');
      expect(() => JSON.parse(trimmed)).not.toThrow();
    }

    const events = parseNdjson(chunks);
    const types = events.map((e) => e.type);
    expect(types).toContain('start');
    expect(types).toContain('result');

    const start = events.find((e) => e.type === 'start');
    expect(start).toMatchObject({ type: 'start', command: 'linear next' });

    const result = events.find((e): e is CliEventResult => e.type === 'result');
    expect(result?.ok).toBe(true);
  });

  it('triggers JSON mode via TOMATO_OUTPUT=json env var when --output=json flag is absent', async () => {
    const registry = new CommandRegistry({ commandsDir: null });
    const defaultFn = vi.fn().mockResolvedValue(undefined);
    registry.register('linear', 'next', {
      default: defaultFn,
      meta: makeMeta('next'),
    });

    const { stream, chunks } = makeRecorder();
    const code = await dispatch(['linear', 'next'], {
      registry,
      env: { TOMATO_OUTPUT: 'json' },
      stream,
    });

    expect(code).toBe(0);
    expect(defaultFn).toHaveBeenCalledTimes(1);

    const ctx = defaultFn.mock.calls[0]?.[0] as CliContext;
    expect(ctx.outputMode).toBe('json');

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.endsWith('\n')).toBe(true);
      const trimmed = chunk.slice(0, -1);
      expect(() => JSON.parse(trimmed)).not.toThrow();
    }

    const events = parseNdjson(chunks);
    const types = events.map((e) => e.type);
    expect(types).toContain('start');
    expect(types).toContain('result');

    const result = events.find((e): e is CliEventResult => e.type === 'result');
    expect(result?.ok).toBe(true);
  });

  it('dispatches an external command discovered at startup when no registry is supplied', async () => {
    vi.mocked(findOpenTomatoRoot).mockReturnValue('/fake/root');
    vi.mocked(loadManifest).mockReturnValue({
      commands: [
        {
          tool: 'svc',
          command: 'validate',
          module: '/fake/root/tools/commands/svc/validate.mjs',
        },
      ],
    });

    const externalDefault = vi.fn().mockResolvedValue(undefined);
    vi.mocked(loadExternalCommands).mockResolvedValue([
      {
        tool: 'svc',
        command: 'validate',
        module: {
          default: externalDefault,
          meta: makeMeta('validate'),
        },
      },
    ]);

    const { stream, chunks } = makeRecorder();
    const code = await dispatch(['svc', 'validate', 'extra', '--output=json'], {
      env: {},
      stream,
    });

    expect(findOpenTomatoRoot).toHaveBeenCalledTimes(1);
    expect(loadManifest).toHaveBeenCalledWith('/fake/root');
    expect(loadExternalCommands).toHaveBeenCalledTimes(1);
    expect(vi.mocked(loadExternalCommands).mock.calls[0]?.[1]).toBe('/fake/root');

    expect(code).toBe(0);
    expect(externalDefault).toHaveBeenCalledTimes(1);

    const ctx = externalDefault.mock.calls[0]?.[0] as CliContext;
    expect(ctx).toBeDefined();
    expect(ctx.args).toEqual(['extra']);

    const events = parseNdjson(chunks);
    const start = events.find((e) => e.type === 'start');
    expect(start).toMatchObject({ type: 'start', command: 'svc validate' });
    const result = events.find((e): e is CliEventResult => e.type === 'result');
    expect(result?.ok).toBe(true);
  });

  it('runs internal commands without errors when no .open-tomato-root is found at startup', async () => {
    vi.mocked(findOpenTomatoRoot).mockReset()
      .mockReturnValue(null);
    vi.mocked(loadManifest).mockReset()
      .mockReturnValue(null);
    vi.mocked(loadExternalCommands).mockReset()
      .mockResolvedValue([]);

    const { stream, chunks } = makeRecorder();

    const code = await dispatch(
      ['no-such-tool', 'no-such-command', '--output=json'],
      {
        env: {},
        stream,
      },
    );

    expect(findOpenTomatoRoot).toHaveBeenCalledTimes(1);
    // findOpenTomatoRoot returned null, so manifest/external loaders never ran.
    expect(loadManifest).not.toHaveBeenCalled();
    expect(loadExternalCommands).not.toHaveBeenCalled();

    // Dispatcher built an internal-only registry and reached the lookup path
    // without throwing. The unknown route resolves to a clean command_not_found
    // result, proving the no-marker fallback keeps internal dispatch operational.
    expect(code).toBe(1);
    const events = parseNdjson(chunks);
    const result = events.find((e): e is CliEventResult => e.type === 'result');
    expect(result).toBeDefined();
    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe('command_not_found');
    expect(result?.error?.message).toContain('no-such-tool no-such-command');
  });
});
