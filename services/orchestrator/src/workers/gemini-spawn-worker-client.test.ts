
import type { BackendDescriptor } from './backend-descriptor.js';
import type { ProcessSpawner } from './fallback-chain-worker-client.js';

import { describe, expect, it } from 'vitest';

import { BackendFactory } from './backend-factory.js';
import { GeminiSpawnWorkerClient } from './gemini-spawn-worker-client.js';

// ---------------------------------------------------------------------------
// Stub spawner — captures spawn arguments and returns controlled output
// ---------------------------------------------------------------------------

interface SpawnCall {
  command: string;
  args: readonly string[];
  options: {
    stdin?: Uint8Array;
    cwd: string;
    env?: Record<string, string>;
  };
}

function createStubSpawner(
  stdout = '',
  stderr = '',
  exitCode = 0,
): { spawner: ProcessSpawner; calls: SpawnCall[]; killCalls: number[] } {
  const calls: SpawnCall[] = [];
  const killCalls: number[] = [];
  let callIndex = 0;

  const spawner: ProcessSpawner = {
    spawn(command, args, options) {
      const idx = callIndex++;
      calls.push({ command, args, options });
      return {
        stdout: new ReadableStream({
          start(controller) {
            if (stdout.length > 0) {
              controller.enqueue(new TextEncoder().encode(stdout));
            }
            controller.close();
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            if (stderr.length > 0) {
              controller.enqueue(new TextEncoder().encode(stderr));
            }
            controller.close();
          },
        }),
        exited: Promise.resolve(exitCode),
        kill: () => { killCalls.push(idx); },
      };
    },
  };

  return { spawner, calls, killCalls };
}

function createMultiChunkSpawner(
  chunks: string[],
  stderrChunks: string[] = [],
  exitCode = 0,
): { spawner: ProcessSpawner; calls: SpawnCall[] } {
  const calls: SpawnCall[] = [];

  const spawner: ProcessSpawner = {
    spawn(command, args, options) {
      calls.push({ command, args, options });
      return {
        stdout: new ReadableStream({
          start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            for (const chunk of stderrChunks) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          },
        }),
        exited: Promise.resolve(exitCode),
        kill: () => {},
      };
    },
  };

  return { spawner, calls };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function drainStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return new TextDecoder().decode(
    chunks.reduce((acc, c) => {
      const merged = new Uint8Array(acc.length + c.length);
      merged.set(acc);
      merged.set(c, acc.length);
      return merged;
    }, new Uint8Array(0)),
  );
}

const GEMINI_DESCRIPTOR = BackendFactory.create('gemini');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GeminiSpawnWorkerClient', () => {
  describe('constructor', () => {
    it('sets workerId from constructor argument', () => {
      const { spawner } = createStubSpawner();
      const client = new GeminiSpawnWorkerClient(
        'gem-1',
        '/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );
      expect(client.workerId).toBe('gem-1');
    });
  });

  describe('prepareWorkspace', () => {
    it('returns the configured repoPath', async () => {
      const { spawner } = createStubSpawner();
      const client = new GeminiSpawnWorkerClient(
        'gem-1',
        '/my/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );
      const result = await client.prepareWorkspace('main');
      expect(result).toBe('/my/repo');
    });
  });

  describe('process construction', () => {
    it('spawns gemini with flag prompt mode by default', async () => {
      const { spawner, calls } = createStubSpawner('hello');
      const client = new GeminiSpawnWorkerClient(
        'gem-1',
        '/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );

      await client.exec('do something', '/work');

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toBe('gemini');
      expect(calls[0].args).toEqual(['--yolo', '-p', 'do something']);
      expect(calls[0].options.cwd).toBe('/work');
    });

    it('passes stdin for stdin prompt mode', async () => {
      const stdinDescriptor: BackendDescriptor = {
        ...GEMINI_DESCRIPTOR,
        promptMode: 'stdin',
        args: ['--some-flag'],
      };
      const { spawner, calls } = createStubSpawner('output');
      const client = new GeminiSpawnWorkerClient(
        'gem-2',
        '/repo',
        stdinDescriptor,
        {},
        spawner,
      );

      await client.exec('my prompt', '/work');

      expect(calls[0].args).toEqual(['--some-flag']);
      expect(calls[0].options.stdin).toEqual(
        new TextEncoder().encode('my prompt'),
      );
    });

    it('appends prompt as positional arg for positional prompt mode', async () => {
      const positionalDescriptor: BackendDescriptor = {
        ...GEMINI_DESCRIPTOR,
        promptMode: 'positional',
        args: ['--verbose'],
      };
      const { spawner, calls } = createStubSpawner('output');
      const client = new GeminiSpawnWorkerClient(
        'gem-3',
        '/repo',
        positionalDescriptor,
        {},
        spawner,
      );

      await client.exec('fix the bug', '/work');

      expect(calls[0].args).toEqual(['--verbose', 'fix the bug']);
    });

    it('merges descriptor envVars with constructor envOverrides', async () => {
      const descriptorWithEnv: BackendDescriptor = {
        ...GEMINI_DESCRIPTOR,
        envVars: { GEMINI_API_KEY: 'from-descriptor' },
      };
      const { spawner, calls } = createStubSpawner('ok');
      const client = new GeminiSpawnWorkerClient(
        'gem-4',
        '/repo',
        descriptorWithEnv,
        { EXTRA_VAR: 'override-value' },
        spawner,
      );

      await client.exec('test', '/work');

      expect(calls[0].options.env).toEqual({
        GEMINI_API_KEY: 'from-descriptor',
        EXTRA_VAR: 'override-value',
      });
    });

    it('overrides descriptor envVars when envOverrides has same key', async () => {
      const descriptorWithEnv: BackendDescriptor = {
        ...GEMINI_DESCRIPTOR,
        envVars: { GEMINI_API_KEY: 'original' },
      };
      const { spawner, calls } = createStubSpawner('ok');
      const client = new GeminiSpawnWorkerClient(
        'gem-5',
        '/repo',
        descriptorWithEnv,
        { GEMINI_API_KEY: 'overridden' },
        spawner,
      );

      await client.exec('test', '/work');

      expect(calls[0].options.env).toEqual({
        GEMINI_API_KEY: 'overridden',
      });
    });

    it('passes undefined env when no envVars or overrides', async () => {
      const { spawner, calls } = createStubSpawner('ok');
      const client = new GeminiSpawnWorkerClient(
        'gem-6',
        '/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );

      await client.exec('test', '/work');

      expect(calls[0].options.env).toBeUndefined();
    });
  });

  describe('output parsing', () => {
    it('returns stdout from the spawned process', async () => {
      const { spawner } = createStubSpawner('gemini response text');
      const client = new GeminiSpawnWorkerClient(
        'gem-1',
        '/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );

      const wp = await client.exec('prompt', '/work');
      const text = await drainStream(wp.stdout);
      expect(text).toBe('gemini response text');
    });

    it('returns stderr from the spawned process', async () => {
      const { spawner } = createStubSpawner('', 'some warning');
      const client = new GeminiSpawnWorkerClient(
        'gem-1',
        '/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );

      const wp = await client.exec('prompt', '/work');
      const text = await drainStream(wp.stderr);
      expect(text).toBe('some warning');
    });

    it('returns exit code from the spawned process', async () => {
      const { spawner } = createStubSpawner('', '', 42);
      const client = new GeminiSpawnWorkerClient(
        'gem-1',
        '/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );

      const wp = await client.exec('prompt', '/work');
      const code = await wp.exited;
      expect(code).toBe(42);
    });

    it('handles empty stdout and stderr streams', async () => {
      const { spawner } = createStubSpawner('', '', 0);
      const client = new GeminiSpawnWorkerClient(
        'gem-1',
        '/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );

      const wp = await client.exec('prompt', '/work');
      const stdout = await drainStream(wp.stdout);
      const stderr = await drainStream(wp.stderr);
      expect(stdout).toBe('');
      expect(stderr).toBe('');
    });

    it('reassembles multi-chunk stdout correctly', async () => {
      const { spawner } = createMultiChunkSpawner(
        ['hello ', 'world', '!'],
        ['warn', 'ing'],
        0,
      );
      const client = new GeminiSpawnWorkerClient(
        'gem-1',
        '/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );

      const wp = await client.exec('prompt', '/work');
      const stdout = await drainStream(wp.stdout);
      const stderr = await drainStream(wp.stderr);
      expect(stdout).toBe('hello world!');
      expect(stderr).toBe('warning');
    });

    it('returns exit code 0 for successful process', async () => {
      const { spawner } = createStubSpawner('ok', '', 0);
      const client = new GeminiSpawnWorkerClient(
        'gem-1',
        '/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );

      const wp = await client.exec('prompt', '/work');
      const code = await wp.exited;
      expect(code).toBe(0);
    });
  });

  describe('lifecycle methods', () => {
    it('cleanWorkspace is a no-op', async () => {
      const { spawner } = createStubSpawner();
      const client = new GeminiSpawnWorkerClient(
        'gem-1',
        '/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );
      await expect(client.cleanWorkspace()).resolves.toBeUndefined();
    });

    it('isHealthy returns true', async () => {
      const { spawner } = createStubSpawner();
      const client = new GeminiSpawnWorkerClient(
        'gem-1',
        '/repo',
        GEMINI_DESCRIPTOR,
        {},
        spawner,
      );
      await expect(client.isHealthy()).resolves.toBe(true);
    });
  });
});
