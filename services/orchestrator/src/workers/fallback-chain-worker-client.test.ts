import type { BackendDescriptor } from './backend-descriptor.js';
import type { ProcessSpawner } from './fallback-chain-worker-client.js';
import type { FallbackEvent, FallbackEventSink } from './fallback-event-sink.js';

import { describe, expect, it } from 'vitest';

import { BackendDetector } from './backend-detector.js';
import { CircuitBreaker } from './circuit-breaker.js';
import {
  FallbackChainWorkerClient,
  ClassifiedError,
} from './fallback-chain-worker-client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBackend(
  name: string,
  overrides: Partial<BackendDescriptor> = {},
): BackendDescriptor {
  return {
    name,
    command: name,
    args: ['--output-format', 'stream-json'],
    promptMode: 'flag',
    outputFormat: 'stream-json',
    envVars: {},
    ...overrides,
  };
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function makeReadableStream(data: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      if (data.length > 0) controller.enqueue(data);
      controller.close();
    },
  });
}

/**
 * Creates a ProcessSpawner stub that resolves each call sequentially
 * using the provided outcomes. Each outcome specifies stdout, stderr,
 * and exit code.
 */
function makeSpawner(
  outcomes: readonly {
    stdout: string;
    stderr: string;
    exitCode: number;
  }[],
): { spawner: ProcessSpawner; calls: { command: string; args: readonly string[] }[] } {
  let callIndex = 0;
  const calls: { command: string; args: readonly string[] }[] = [];

  const spawner: ProcessSpawner = {
    spawn(command, args) {
      calls.push({ command, args });
      const outcome = outcomes[callIndex] ?? outcomes[outcomes.length - 1];
      callIndex++;

      return {
        stdout: makeReadableStream(encode(outcome.stdout)),
        stderr: makeReadableStream(encode(outcome.stderr)),
        exited: Promise.resolve(outcome.exitCode),
        kill: () => {},
      };
    },
  };

  return { spawner, calls };
}

function makeDetector(available: string[]): BackendDetector {
  const runner = {
    async run(command: string) {
      return { exitCode: available.includes(command)
        ? 0
        : 1 };
    },
  };
  return new BackendDetector({}, runner);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FallbackChainWorkerClient', () => {
  describe('constructor', () => {
    it('throws when given an empty backends array', () => {
      expect(
        () => new FallbackChainWorkerClient(
          'w1',
          [],
          new CircuitBreaker(),
          makeDetector([]),
        ),
      ).toThrow('At least one backend is required');
    });
  });

  describe('selectEligibleBackend', () => {
    it('returns the first backend when all circuits are closed', () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
      );

      expect(client.selectEligibleBackend()).toEqual(backends[0]);
    });

    it('skips a backend with an open circuit', () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      cb.recordFailure('claude');

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        cb,
        makeDetector(['claude', 'gemini']),
      );

      expect(client.selectEligibleBackend()).toEqual(backends[1]);
    });

    it('returns null when all circuits are open', () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      cb.recordFailure('claude');
      cb.recordFailure('gemini');

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        cb,
        makeDetector(['claude', 'gemini']),
      );

      expect(client.selectEligibleBackend()).toBeNull();
    });
  });

  describe('successful invocation on first backend', () => {
    it('returns a WorkerProcess with buffered stdout', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const { spawner, calls } = makeSpawner([
        { stdout: 'hello world', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('test prompt', '/tmp');

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toBe('claude');

      expect(wp.stdout).toBeInstanceOf(ReadableStream);
      expect(wp.stderr).toBeInstanceOf(ReadableStream);
      expect(await wp.exited).toBe(0);

      const reader = wp.stdout.getReader();
      const { value } = await reader.read();
      expect(new TextDecoder().decode(value)).toBe('hello world');
    });

    it('tracks activeBackend after success', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const { spawner } = makeSpawner([
        { stdout: 'ok', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      await client.exec('prompt', '/tmp');
      expect(client.activeBackend()).toBe('claude');
    });
  });

  describe('fallback on rate_limit', () => {
    it('retries when the first attempt returns a rate_limit error', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const { spawner, calls } = makeSpawner([
        { stdout: '', stderr: '429 rate limit exceeded', exitCode: 1 },
        { stdout: 'fallback ok', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      expect(calls).toHaveLength(2);
      expect(await wp.exited).toBe(0);
    });
  });

  describe('immediate propagation on auth_failure', () => {
    it('does not retry when the error is auth_failure', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const { spawner, calls } = makeSpawner([
        { stdout: '', stderr: 'auth 401 unauthorized', exitCode: 41 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      await expect(client.exec('prompt', '/tmp')).rejects.toThrow(ClassifiedError);
      expect(calls).toHaveLength(1);
    });

    it('propagates ClassifiedError with auth_failure class', async () => {
      const backends = [makeBackend('claude')];
      const { spawner } = makeSpawner([
        { stdout: '', stderr: 'auth 401 unauthorized', exitCode: 41 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      try {
        await client.exec('prompt', '/tmp');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClassifiedError);
        expect((err as ClassifiedError).errorClass).toBe('auth_failure');
        expect((err as ClassifiedError).backendName).toBe('claude');
      }
    });
  });

  describe('immediate propagation on task_error', () => {
    it('does not retry when the error is task_error', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const { spawner, calls } = makeSpawner([
        { stdout: '', stderr: '400 invalid request', exitCode: 1 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      await expect(client.exec('prompt', '/tmp')).rejects.toThrow(ClassifiedError);
      expect(calls).toHaveLength(1);
    });
  });

  describe('all backends exhausted', () => {
    it('throws after exhausting all retries', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const { spawner, calls } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      await expect(client.exec('prompt', '/tmp')).rejects.toThrow(ClassifiedError);
      // maxRetries = backends.length - 1 = 1, so 2 total attempts
      expect(calls).toHaveLength(2);
    });

    it('carries the last backend name in the exhaustion error', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const { spawner } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: '', stderr: 'quota exceeded', exitCode: 1 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      try {
        await client.exec('prompt', '/tmp');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClassifiedError);
        const classified = err as ClassifiedError;
        expect(classified.errorClass).toBe('rate_limit');
        expect(classified.stderrText).toBe('quota exceeded');
      }
    });

    it('exhausts a three-backend chain with rate_limit errors', async () => {
      const backends = [
        makeBackend('claude'),
        makeBackend('gemini', { outputFormat: 'text' }),
        makeBackend('codex', { outputFormat: 'text' }),
      ];
      const { spawner, calls } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini', 'codex']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      await expect(client.exec('prompt', '/tmp')).rejects.toThrow(ClassifiedError);
      // maxRetries = 3 - 1 = 2, so 3 total attempts
      expect(calls).toHaveLength(3);
    });
  });

  describe('fallback chain integration', () => {
    it('falls back through three backends until one succeeds', async () => {
      const backends = [
        makeBackend('claude'),
        makeBackend('gemini', { outputFormat: 'text' }),
        makeBackend('codex', { outputFormat: 'text' }),
      ];
      const { spawner, calls } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: 'codex response', stderr: '', exitCode: 0 },
      ]);

      // failureThreshold: 1 so each rate_limit opens the circuit immediately,
      // forcing selectEligibleBackend to advance to the next backend
      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker({ failureThreshold: 1 }),
        makeDetector(['claude', 'gemini', 'codex']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      expect(calls).toHaveLength(3);
      expect(calls[0].command).toBe('claude');
      expect(calls[1].command).toBe('gemini');
      expect(calls[2].command).toBe('codex');
      expect(await wp.exited).toBe(0);
      expect(client.activeBackend()).toBe('codex');
    });

    it('falls back on unknown errors the same as rate_limit', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini', { outputFormat: 'text' })];
      // Unrecognized stderr with non-zero exit -> classified as 'unknown'
      const { spawner, calls } = makeSpawner([
        { stdout: '', stderr: 'unexpected failure', exitCode: 2 },
        { stdout: 'gemini ok', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker({ failureThreshold: 1 }),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      expect(calls).toHaveLength(2);
      expect(await wp.exited).toBe(0);
      expect(client.activeBackend()).toBe('gemini');
    });

    it('does not record circuit breaker failure on auth_failure', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      const { spawner } = makeSpawner([
        { stdout: '', stderr: 'auth 401 unauthorized', exitCode: 41 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        cb,
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      await expect(client.exec('prompt', '/tmp')).rejects.toThrow(ClassifiedError);
      // auth_failure should NOT open the circuit
      expect(cb.isOpen('claude')).toBe(false);
    });

    it('stops at auth_failure even when it occurs on a fallback backend', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const { spawner, calls } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: '', stderr: 'auth 401 unauthorized', exitCode: 41 },
      ]);

      // failureThreshold: 1 so claude's circuit opens after first rate_limit,
      // forcing the retry to select gemini
      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker({ failureThreshold: 1 }),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      try {
        await client.exec('prompt', '/tmp');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClassifiedError);
        const classified = err as ClassifiedError;
        expect(classified.errorClass).toBe('auth_failure');
        expect(classified.backendName).toBe('gemini');
      }
      // First call was rate_limit (retryable), second was auth_failure (immediate)
      expect(calls).toHaveLength(2);
    });

    it('circuit breaker state persists across multiple invocations', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini', { outputFormat: 'text' })];
      const cb = new CircuitBreaker({ failureThreshold: 1 });

      // First invocation: claude fails, gemini succeeds
      const { spawner: spawner1 } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: 'gemini first', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        cb,
        makeDetector(['claude', 'gemini']),
        spawner1,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      await client.exec('prompt1', '/tmp');
      expect(client.activeBackend()).toBe('gemini');
      // Claude's circuit is open after 1 failure (threshold 1)
      expect(cb.isOpen('claude')).toBe(true);
    });

    it('returns buffered output from the successful fallback backend', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini', { outputFormat: 'text' })];
      const { spawner } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: 'gemini detailed response\nwith multiple lines', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      const reader = wp.stdout.getReader();
      const chunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new TextDecoder().decode(value));
      }

      expect(chunks.join('')).toBe('gemini detailed response\nwith multiple lines');
    });
  });

  describe('prompt modes', () => {
    it('passes prompt as flag argument', async () => {
      const backends = [makeBackend('claude', { promptMode: 'flag' })];
      const { spawner, calls } = makeSpawner([
        { stdout: 'ok', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
      );

      await client.exec('my prompt', '/tmp');
      expect(calls[0].args).toContain('-p');
      expect(calls[0].args).toContain('my prompt');
    });

    it('passes prompt as positional argument', async () => {
      const backends = [makeBackend('codex', { promptMode: 'positional', args: [] })];
      const { spawner, calls } = makeSpawner([
        { stdout: 'ok', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['codex']),
        spawner,
      );

      await client.exec('my prompt', '/tmp');
      expect(calls[0].args[calls[0].args.length - 1]).toBe('my prompt');
    });
  });

  describe('circuit breaker integration', () => {
    it('records failure on rate_limit errors', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const cb = new CircuitBreaker({ failureThreshold: 3 });
      const { spawner } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: 'ok', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        cb,
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      await client.exec('prompt', '/tmp');
      // Circuit should not be open yet (only 1 failure, threshold is 3)
      expect(cb.isOpen('claude')).toBe(false);
    });

    it('records success and resets circuit state', async () => {
      const backends = [makeBackend('claude')];
      const cb = new CircuitBreaker({ failureThreshold: 3 });
      cb.recordFailure('claude');
      cb.recordFailure('claude');

      const { spawner } = makeSpawner([
        { stdout: 'ok', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        cb,
        makeDetector(['claude']),
        spawner,
      );

      await client.exec('prompt', '/tmp');
      expect(cb.isOpen('claude')).toBe(false);
    });
  });

  describe('isHealthy', () => {
    it('returns true when at least one backend is available', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
      );

      expect(await client.isHealthy()).toBe(true);
    });

    it('returns false when no backends are available', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector([]),
      );

      expect(await client.isHealthy()).toBe(false);
    });
  });

  describe('prepareWorkspace / cleanWorkspace', () => {
    it('prepareWorkspace returns the branch string unchanged', async () => {
      const backends = [makeBackend('claude')];
      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
      );

      expect(await client.prepareWorkspace('main')).toBe('main');
    });

    it('cleanWorkspace resolves without error', async () => {
      const backends = [makeBackend('claude')];
      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
      );

      await expect(client.cleanWorkspace()).resolves.toBeUndefined();
    });
  });

  describe('bufferAndRun', () => {
    it('resolves with buffered stdout, stderr, and exit code on success', async () => {
      const backend = makeBackend('claude');
      const { spawner } = makeSpawner([
        { stdout: 'response output', stderr: 'some warning', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        [backend],
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
      );

      const result = await client.bufferAndRun(backend, 'test prompt', '/tmp');

      expect(new TextDecoder().decode(result.stdout)).toBe('response output');
      expect(new TextDecoder().decode(result.stderr)).toBe('some warning');
      expect(result.exitCode).toBe(0);
    });

    it('buffers stdout and stderr concurrently from the same process', async () => {
      const backend = makeBackend('claude');
      const { spawner } = makeSpawner([
        { stdout: 'out-data', stderr: 'err-data', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        [backend],
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
      );

      const result = await client.bufferAndRun(backend, 'prompt', '/work');

      // Both streams captured in the same result
      expect(result.stdout.length).toBeGreaterThan(0);
      expect(result.stderr.length).toBeGreaterThan(0);
    });

    it('throws ClassifiedError on non-zero exit code', async () => {
      const backend = makeBackend('claude');
      const { spawner } = makeSpawner([
        { stdout: 'partial', stderr: '429 rate limit exceeded', exitCode: 1 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        [backend],
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
      );

      try {
        await client.bufferAndRun(backend, 'prompt', '/tmp');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClassifiedError);
        const classified = err as InstanceType<typeof ClassifiedError>;
        expect(classified.errorClass).toBe('rate_limit');
        expect(classified.stderrText).toBe('429 rate limit exceeded');
        expect(classified.exitCode).toBe(1);
        expect(classified.backendName).toBe('claude');
      }
    });

    it('classifies auth_failure from exit code 41', async () => {
      const backend = makeBackend('gemini');
      const { spawner } = makeSpawner([
        { stdout: '', stderr: 'unauthorized', exitCode: 41 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        [backend],
        new CircuitBreaker(),
        makeDetector(['gemini']),
        spawner,
      );

      try {
        await client.bufferAndRun(backend, 'prompt', '/tmp');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClassifiedError);
        expect((err as ClassifiedError).errorClass).toBe('auth_failure');
      }
    });

    it('handles empty stdout and stderr on failure', async () => {
      const backend = makeBackend('claude');
      const { spawner } = makeSpawner([
        { stdout: '', stderr: '', exitCode: 2 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        [backend],
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
      );

      try {
        await client.bufferAndRun(backend, 'prompt', '/tmp');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClassifiedError);
        expect((err as ClassifiedError).errorClass).toBe('unknown');
        expect((err as ClassifiedError).stderrText).toBe('');
      }
    });

    it('passes envVars to the spawner when present', async () => {
      const backend = makeBackend('claude', {
        envVars: { API_KEY: 'secret123' },
      });

      let capturedEnv: Record<string, string> | undefined;
      const spawner: ProcessSpawner = {
        spawn(_command, _args, options) {
          capturedEnv = options.env;
          return {
            stdout: makeReadableStream(encode('ok')),
            stderr: makeReadableStream(encode('')),
            exited: Promise.resolve(0),
            kill: () => {},
          };
        },
      };

      const client = new FallbackChainWorkerClient(
        'w1',
        [backend],
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
      );

      await client.bufferAndRun(backend, 'prompt', '/tmp');
      expect(capturedEnv).toEqual({ API_KEY: 'secret123' });
    });

    it('omits env when envVars is empty', async () => {
      const backend = makeBackend('claude', { envVars: {} });

      let capturedEnv: Record<string, string> | undefined;
      const spawner: ProcessSpawner = {
        spawn(_command, _args, options) {
          capturedEnv = options.env;
          return {
            stdout: makeReadableStream(encode('ok')),
            stderr: makeReadableStream(encode('')),
            exited: Promise.resolve(0),
            kill: () => {},
          };
        },
      };

      const client = new FallbackChainWorkerClient(
        'w1',
        [backend],
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
      );

      await client.bufferAndRun(backend, 'prompt', '/tmp');
      expect(capturedEnv).toBeUndefined();
    });

    it('passes the correct cwd to the spawner', async () => {
      const backend = makeBackend('claude');

      let capturedCwd = '';
      const spawner: ProcessSpawner = {
        spawn(_command, _args, options) {
          capturedCwd = options.cwd;
          return {
            stdout: makeReadableStream(encode('ok')),
            stderr: makeReadableStream(encode('')),
            exited: Promise.resolve(0),
            kill: () => {},
          };
        },
      };

      const client = new FallbackChainWorkerClient(
        'w1',
        [backend],
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
      );

      await client.bufferAndRun(backend, 'prompt', '/my/work/dir');
      expect(capturedCwd).toBe('/my/work/dir');
    });

    it('uses stdin prompt mode correctly', async () => {
      const backend = makeBackend('gemini', {
        promptMode: 'stdin',
        args: ['--model', 'pro'],
      });

      let capturedStdin: Uint8Array | undefined;
      const spawner: ProcessSpawner = {
        spawn(_command, _args, options) {
          capturedStdin = options.stdin;
          return {
            stdout: makeReadableStream(encode('ok')),
            stderr: makeReadableStream(encode('')),
            exited: Promise.resolve(0),
            kill: () => {},
          };
        },
      };

      const client = new FallbackChainWorkerClient(
        'w1',
        [backend],
        new CircuitBreaker(),
        makeDetector(['gemini']),
        spawner,
      );

      await client.bufferAndRun(backend, 'my stdin prompt', '/tmp');
      expect(capturedStdin).toBeDefined();
      expect(new TextDecoder().decode(capturedStdin)).toBe('my stdin prompt');
    });
  });

  describe('ClassifiedError', () => {
    it('includes backend name and error class in message', () => {
      const err = new ClassifiedError('rate_limit', '429 too many requests', 1, 'claude');

      expect(err.message).toContain('claude');
      expect(err.message).toContain('rate_limit');
      expect(err.errorClass).toBe('rate_limit');
      expect(err.backendName).toBe('claude');
      expect(err.exitCode).toBe(1);
      expect(err.name).toBe('ClassifiedError');
    });

    it('truncates long stderr in the message', () => {
      const longStderr = 'x'.repeat(500);
      const err = new ClassifiedError('unknown', longStderr, 1, 'gemini');

      expect(err.message.length).toBeLessThan(longStderr.length + 100);
    });
  });

  describe('reconstructWorkProcess (runner contract)', () => {
    /**
     * The runner (runner.ts) consumes WorkerProcess via:
     *   1. drainStream(proc.stdout) — reads ReadableStream<Uint8Array> line-by-line
     *   2. drainStream(proc.stderr) — same for stderr
     *   3. proc.exited — awaits exit code
     *   4. proc.kill() — called via onChildSpawned for cancellation
     *
     * These tests verify the reconstructed WorkerProcess satisfies that contract.
     */

    it('stdout is a drainable ReadableStream containing buffered output', async () => {
      const backends = [makeBackend('claude')];
      const { spawner } = makeSpawner([
        { stdout: 'line1\nline2\nline3', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      // Drain stdout fully, mimicking runner.ts drainStream
      const reader = wp.stdout.getReader();
      const chunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new TextDecoder().decode(value));
      }

      expect(chunks.join('')).toBe('line1\nline2\nline3');
    });

    it('stderr is a drainable ReadableStream containing buffered output', async () => {
      const backends = [makeBackend('claude')];
      const { spawner } = makeSpawner([
        { stdout: 'ok', stderr: 'warn: something happened', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      const reader = wp.stderr.getReader();
      const chunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new TextDecoder().decode(value));
      }

      expect(chunks.join('')).toBe('warn: something happened');
    });

    it('exited resolves to the buffered exit code', async () => {
      const backends = [makeBackend('claude')];
      const { spawner } = makeSpawner([
        { stdout: 'done', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      // exited is already resolved (buffered process completed)
      const exitCode = await wp.exited;
      expect(exitCode).toBe(0);
    });

    it('kill() is callable without throwing (no-op for completed process)', async () => {
      const backends = [makeBackend('claude')];
      const { spawner } = makeSpawner([
        { stdout: 'ok', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      // Runner calls kill() on cancellation — must not throw
      expect(() => wp.kill()).not.toThrow();
      // Multiple calls must also be safe
      expect(() => wp.kill()).not.toThrow();
    });

    it('handles empty stdout and stderr gracefully', async () => {
      const backends = [makeBackend('claude')];
      const { spawner } = makeSpawner([
        { stdout: '', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      // Empty streams should drain immediately without error
      const stdoutReader = wp.stdout.getReader();
      const { done: stdoutDone } = await stdoutReader.read();
      expect(stdoutDone).toBe(true);

      const stderrReader = wp.stderr.getReader();
      const { done: stderrDone } = await stderrReader.read();
      expect(stderrDone).toBe(true);

      expect(await wp.exited).toBe(0);
    });

    it('stdout and stderr can be drained concurrently with exited', async () => {
      const backends = [makeBackend('claude')];
      const { spawner } = makeSpawner([
        { stdout: 'concurrent-test', stderr: 'concurrent-err', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      // Mimics runner.ts: Promise.all([drainStream(stdout), drainStream(stderr), proc.exited])
      const drainFull = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
        const reader = stream.getReader();
        const parts: string[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(new TextDecoder().decode(value));
        }
        return parts.join('');
      };

      const [stdout, stderr, exitCode] = await Promise.all([
        drainFull(wp.stdout),
        drainFull(wp.stderr),
        wp.exited,
      ]);

      expect(stdout).toBe('concurrent-test');
      expect(stderr).toBe('concurrent-err');
      expect(exitCode).toBe(0);
    });
  });

  describe('event emission', () => {
    function collectingSink(): { sink: FallbackEventSink; events: FallbackEvent[] } {
      const events: FallbackEvent[] = [];
      return { sink: { emit: (e) => events.push(e) }, events };
    }

    it('emits backend_selected and chain_success on first-try success', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const { spawner } = makeSpawner([
        { stdout: 'ok', stderr: '', exitCode: 0 },
      ]);
      const { sink, events } = collectingSink();

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
        sink,
      );

      await client.exec('prompt', '/tmp');

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('backend_selected');
      if (events[0].type === 'backend_selected') {
        expect(events[0].backendName).toBe('claude');
        expect(events[0].attempt).toBe(1);
      }
      expect(events[1].type).toBe('chain_success');
      if (events[1].type === 'chain_success') {
        expect(events[1].backendName).toBe('claude');
        expect(events[1].attempt).toBe(1);
        expect(events[1].durationMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('emits backend_selected, backend_failed, backend_fallback, then success on fallback', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini', { outputFormat: 'text' })];
      const { spawner } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: 'ok', stderr: '', exitCode: 0 },
      ]);
      const { sink, events } = collectingSink();

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker({ failureThreshold: 1 }),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
        sink,
      );

      await client.exec('prompt', '/tmp');

      const types = events.map((e) => e.type);
      expect(types).toEqual([
        'backend_selected',
        'backend_failed',
        'backend_fallback',
        'backend_selected',
        'chain_success',
      ]);

      // Verify fallback event details
      const fallback = events.find((e) => e.type === 'backend_fallback');
      if (fallback?.type === 'backend_fallback') {
        expect(fallback.failedBackend).toBe('claude');
        expect(fallback.nextBackend).toBe('gemini');
        expect(fallback.errorClass).toBe('rate_limit');
      }

      // Success should reference gemini
      const success = events.find((e) => e.type === 'chain_success');
      if (success?.type === 'chain_success') {
        expect(success.backendName).toBe('gemini');
        expect(success.attempt).toBe(2);
      }
    });

    it('emits chain_exhausted when all circuits are open before an attempt', async () => {
      // Pre-open gemini and codex circuits; only claude is eligible.
      // After claude fails, the retry finds all circuits open → chain_exhausted.
      const backends = [
        makeBackend('claude'),
        makeBackend('gemini', { outputFormat: 'text' }),
        makeBackend('codex', { outputFormat: 'text' }),
      ];
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      cb.recordFailure('gemini');
      cb.recordFailure('codex');

      const { spawner } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
      ]);
      const { sink, events } = collectingSink();

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        cb,
        makeDetector(['claude', 'gemini', 'codex']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
        sink,
      );

      await expect(client.exec('prompt', '/tmp')).rejects.toThrow();

      const types = events.map((e) => e.type);
      expect(types).toContain('chain_exhausted');

      const exhausted = events.find((e) => e.type === 'chain_exhausted');
      if (exhausted?.type === 'chain_exhausted') {
        expect(exhausted.lastBackend).toBe('claude');
        expect(exhausted.lastErrorClass).toBe('rate_limit');
        expect(exhausted.totalAttempts).toBe(1);
      }
    });

    it('emits backend_failed but no backend_fallback on auth_failure', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini')];
      const { spawner } = makeSpawner([
        { stdout: '', stderr: 'auth 401 unauthorized', exitCode: 41 },
      ]);
      const { sink, events } = collectingSink();

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
        sink,
      );

      await expect(client.exec('prompt', '/tmp')).rejects.toThrow(ClassifiedError);

      const types = events.map((e) => e.type);
      expect(types).toEqual(['backend_selected', 'backend_failed']);
      expect(types).not.toContain('backend_fallback');
      expect(types).not.toContain('chain_exhausted');

      const failed = events.find((e) => e.type === 'backend_failed');
      if (failed?.type === 'backend_failed') {
        expect(failed.errorClass).toBe('auth_failure');
        expect(failed.backendName).toBe('claude');
      }
    });

    it('emits correct attempt numbers across a three-backend chain', async () => {
      const backends = [
        makeBackend('claude'),
        makeBackend('gemini', { outputFormat: 'text' }),
        makeBackend('codex', { outputFormat: 'text' }),
      ];
      const { spawner } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: 'codex ok', stderr: '', exitCode: 0 },
      ]);
      const { sink, events } = collectingSink();

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker({ failureThreshold: 1 }),
        makeDetector(['claude', 'gemini', 'codex']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
        sink,
      );

      await client.exec('prompt', '/tmp');

      const selected = events.filter((e) => e.type === 'backend_selected');
      expect(selected).toHaveLength(3);
      expect(selected.map((e) => (e as { attempt: number }).attempt)).toEqual([1, 2, 3]);

      const success = events.find((e) => e.type === 'chain_success');
      if (success?.type === 'chain_success') {
        expect(success.backendName).toBe('codex');
        expect(success.attempt).toBe(3);
      }
    });

    it('emits backend_failed with correct exitCode for each failure', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini', { outputFormat: 'text' })];
      const { spawner } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: '', stderr: 'quota exceeded', exitCode: 2 },
      ]);
      const { sink, events } = collectingSink();

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker({ failureThreshold: 1 }),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
        sink,
      );

      await expect(client.exec('prompt', '/tmp')).rejects.toThrow(ClassifiedError);

      const failures = events.filter((e) => e.type === 'backend_failed');
      expect(failures).toHaveLength(2);
      if (failures[0].type === 'backend_failed') {
        expect(failures[0].backendName).toBe('claude');
        expect(failures[0].exitCode).toBe(1);
      }
      if (failures[1].type === 'backend_failed') {
        expect(failures[1].backendName).toBe('gemini');
        expect(failures[1].exitCode).toBe(2);
      }
    });
  });

  describe('stream parser integration', () => {
    it('normalizes stream-json output by extracting text from NDJSON events', async () => {
      const ndjson = [
        '{"type":"assistant","content_block":{"type":"text","text":"Hello "}}',
        '{"type":"assistant","content_block":{"type":"text","text":"world"}}',
        '{"type":"result","result":"done","duration_ms":50}',
      ].join('\n');

      const backends = [makeBackend('claude', { outputFormat: 'stream-json' })];
      const { spawner } = makeSpawner([
        { stdout: ndjson, stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      const reader = wp.stdout.getReader();
      const chunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new TextDecoder().decode(value));
      }

      // NDJSON is parsed and text blocks are extracted
      expect(chunks.join('')).toBe('Hello worlddone');
    });

    it('passes text output through unchanged for text backends', async () => {
      const plainOutput = 'This is plain text from Gemini.';

      const backends = [makeBackend('gemini', { outputFormat: 'text' })];
      const { spawner } = makeSpawner([
        { stdout: plainOutput, stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      const reader = wp.stdout.getReader();
      const chunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new TextDecoder().decode(value));
      }

      expect(chunks.join('')).toBe(plainOutput);
    });

    it('falls back to raw output when stream-json contains no text events', async () => {
      const ndjson = '{"type":"system","subtype":"init","message":"ready"}';

      const backends = [makeBackend('claude', { outputFormat: 'stream-json' })];
      const { spawner } = makeSpawner([
        { stdout: ndjson, stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      const reader = wp.stdout.getReader();
      const chunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new TextDecoder().decode(value));
      }

      // No text events extracted -> falls back to raw NDJSON
      expect(chunks.join('')).toBe(ndjson);
    });

    it('normalizes output from fallback backend after primary fails', async () => {
      const backends = [
        makeBackend('claude', { outputFormat: 'stream-json' }),
        makeBackend('gemini', { outputFormat: 'text' }),
      ];

      const { spawner } = makeSpawner([
        { stdout: '', stderr: '429 rate limit exceeded', exitCode: 1 },
        { stdout: 'gemini response', stderr: '', exitCode: 0 },
      ]);

      // Threshold 1 so claude's circuit opens after first failure
      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker({ failureThreshold: 1 }),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      const reader = wp.stdout.getReader();
      const chunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new TextDecoder().decode(value));
      }

      // Gemini is text format — passes through unchanged
      expect(chunks.join('')).toBe('gemini response');
      expect(client.activeBackend()).toBe('gemini');
    });

    it('handles empty stdout for stream-json without error', async () => {
      const backends = [makeBackend('claude', { outputFormat: 'stream-json' })];
      const { spawner } = makeSpawner([
        { stdout: '', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp');

      const reader = wp.stdout.getReader();
      const { done } = await reader.read();
      expect(done).toBe(true);
    });
  });

  describe('per-hat backend override via ExecOptions', () => {
    it('uses the named override backend first when provided', async () => {
      const backends = [makeBackend('claude'), makeBackend('codex', { outputFormat: 'text' })];
      const { spawner, calls } = makeSpawner([
        { stdout: 'gemini response', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini', 'codex']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      await client.exec('prompt', '/tmp', { backendOverride: 'gemini' });

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toBe('gemini');
    });

    it('falls back from override backend to configured chain on rate_limit', async () => {
      const backends = [makeBackend('claude'), makeBackend('codex', { outputFormat: 'text' })];
      const { spawner, calls } = makeSpawner([
        { stdout: '', stderr: '429 rate limit', exitCode: 1 },
        { stdout: 'claude response', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker({ failureThreshold: 1 }),
        makeDetector(['claude', 'gemini', 'codex']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      const wp = await client.exec('prompt', '/tmp', { backendOverride: 'gemini' });

      expect(calls).toHaveLength(2);
      expect(calls[0].command).toBe('gemini');
      expect(calls[1].command).toBe('claude');
      expect(await wp.exited).toBe(0);
    });

    it('deduplicates override that matches an existing backend in the chain', async () => {
      const backends = [
        makeBackend('claude'),
        makeBackend('gemini', { outputFormat: 'text' }),
        makeBackend('codex', { outputFormat: 'text' }),
      ];
      const { spawner, calls } = makeSpawner([
        { stdout: 'gemini first', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini', 'codex']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      // Override with 'gemini' which already exists — should be moved to front, not duplicated
      await client.exec('prompt', '/tmp', { backendOverride: 'gemini' });

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toBe('gemini');
    });

    it('accepts a full BackendDescriptor as override', async () => {
      const backends = [makeBackend('claude')];
      const customBackend: BackendDescriptor = {
        name: 'custom-llm',
        command: 'my-llm',
        args: ['--fast'],
        promptMode: 'positional',
        outputFormat: 'text',
        envVars: {},
      };
      const { spawner, calls } = makeSpawner([
        { stdout: 'custom response', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'my-llm']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      await client.exec('prompt', '/tmp', { backendOverride: customBackend });

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toBe('my-llm');
      // Positional prompt mode: prompt is the last arg
      expect(calls[0].args[calls[0].args.length - 1]).toBe('prompt');
    });

    it('uses configured chain when no override is provided', async () => {
      const backends = [makeBackend('claude'), makeBackend('gemini', { outputFormat: 'text' })];
      const { spawner, calls } = makeSpawner([
        { stdout: 'claude response', stderr: '', exitCode: 0 },
        { stdout: 'claude response', stderr: '', exitCode: 0 },
        { stdout: 'claude response', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      // No override — should use default chain starting with claude
      await client.exec('prompt', '/tmp');
      await client.exec('prompt', '/tmp', {});
      await client.exec('prompt', '/tmp', { backendOverride: undefined });

      expect(calls).toHaveLength(3);
      expect(calls.every((c) => c.command === 'claude')).toBe(true);
    });

    it('override does not mutate the configured backend chain', async () => {
      const backends = [makeBackend('claude'), makeBackend('codex', { outputFormat: 'text' })];
      const { spawner, calls } = makeSpawner([
        { stdout: 'gemini response', stderr: '', exitCode: 0 },
        { stdout: 'claude response', stderr: '', exitCode: 0 },
      ]);

      const client = new FallbackChainWorkerClient(
        'w1',
        backends,
        new CircuitBreaker(),
        makeDetector(['claude', 'gemini', 'codex']),
        spawner,
        { baseDelayMs: 0, factor: 1, jitter: 0 },
      );

      // First call with override
      await client.exec('prompt', '/tmp', { backendOverride: 'gemini' });
      // Second call without override — should revert to configured chain
      await client.exec('prompt', '/tmp');

      expect(calls[0].command).toBe('gemini');
      expect(calls[1].command).toBe('claude');
    });
  });
});
