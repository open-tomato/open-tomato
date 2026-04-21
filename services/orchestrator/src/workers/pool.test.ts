import type { BackendDescriptor } from './backend-descriptor.js';
import type { SubprocessRunner } from './backend-detector.js';
import type { WorkerClient, WorkerProcess } from './client.js';

import { describe, expect, it, vi } from 'vitest';

// Mock the store before importing pool
vi.mock('../store/workers.js', () => ({
  upsertWorker: vi.fn(),
  deleteWorker: vi.fn(),
  setWorkerStatus: vi.fn(),
}));

import { BackendDetector } from './backend-detector.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { FallbackChainWorkerClient } from './fallback-chain-worker-client.js';
import { WorkerPool } from './pool.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockDb(): never {
  // The pool passes db through to store functions which are mocked
  return {} as never;
}

function createMockClient(workerId: string): WorkerClient {
  return {
    workerId,
    prepareWorkspace: vi.fn().mockResolvedValue('/workspace'),
    exec: vi.fn().mockResolvedValue({
      stdout: new ReadableStream(),
      stderr: new ReadableStream(),
      exited: Promise.resolve(0),
      kill: vi.fn(),
    } satisfies WorkerProcess),
    cleanWorkspace: vi.fn().mockResolvedValue(undefined),
    isHealthy: vi.fn().mockResolvedValue(true),
  };
}

function createTestBackend(name: string): BackendDescriptor {
  return {
    name,
    command: name,
    args: [],
    promptMode: 'flag',
    outputFormat: 'text',
    envVars: {},
  };
}

function createNoopRunner(): SubprocessRunner {
  return {
    run: vi.fn().mockResolvedValue({ exitCode: 0 }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkerPool', () => {
  it('starts empty', () => {
    const pool = new WorkerPool(mockDb());
    expect(pool.size).toBe(0);
    expect(pool.idleCount).toBe(0);
  });

  it('register adds a worker to the pool', async () => {
    const pool = new WorkerPool(mockDb());
    const client = createMockClient('w1');

    await pool.register(client, 'addr-1');

    expect(pool.size).toBe(1);
    expect(pool.idleCount).toBe(1);
    expect(pool.has('w1')).toBe(true);
    expect(pool.get('w1')).toBe(client);
  });

  it('unregister removes a worker', async () => {
    const pool = new WorkerPool(mockDb());
    const client = createMockClient('w1');

    await pool.register(client, 'addr-1');
    await pool.unregister('w1');

    expect(pool.size).toBe(0);
    expect(pool.has('w1')).toBe(false);
    expect(pool.get('w1')).toBeUndefined();
  });

  it('claimIdle returns an idle worker and marks it busy', async () => {
    const pool = new WorkerPool(mockDb());
    const client = createMockClient('w1');

    await pool.register(client, 'addr-1');
    expect(pool.idleCount).toBe(1);

    const claimed = await pool.claimIdle();
    expect(claimed).toBe(client);
    expect(pool.idleCount).toBe(0);
  });

  it('claimIdle returns null when all workers are busy', async () => {
    const pool = new WorkerPool(mockDb());
    const client = createMockClient('w1');

    await pool.register(client, 'addr-1');
    await pool.claimIdle(); // claim the only worker

    const result = await pool.claimIdle();
    expect(result).toBeNull();
  });

  it('release returns a worker to idle', async () => {
    const pool = new WorkerPool(mockDb());
    const client = createMockClient('w1');

    await pool.register(client, 'addr-1');
    await pool.claimIdle();
    expect(pool.idleCount).toBe(0);

    await pool.release('w1');
    expect(pool.idleCount).toBe(1);
  });

  it('healthCheckAll marks unhealthy workers as error', async () => {
    const { setWorkerStatus } = await import('../store/workers.js');
    const pool = new WorkerPool(mockDb());

    const healthy = createMockClient('w1');
    const unhealthy = createMockClient('w2');
    (unhealthy.isHealthy as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await pool.register(healthy, 'addr-1');
    await pool.register(unhealthy, 'addr-2');

    await pool.healthCheckAll();

    expect(setWorkerStatus).not.toHaveBeenCalledWith(expect.anything(), 'w1', 'error');
    expect(setWorkerStatus).toHaveBeenCalledWith(expect.anything(), 'w2', 'error');
  });

  it('multiple workers: claims return different idle workers', async () => {
    const pool = new WorkerPool(mockDb());
    const c1 = createMockClient('w1');
    const c2 = createMockClient('w2');

    await pool.register(c1, 'addr-1');
    await pool.register(c2, 'addr-2');

    expect(pool.idleCount).toBe(2);

    const first = await pool.claimIdle();
    const second = await pool.claimIdle();

    expect(first).not.toBe(second);
    expect(pool.idleCount).toBe(0);
  });

  it('accepts a FallbackChainWorkerClient in place of a single WorkerClient', async () => {
    const pool = new WorkerPool(mockDb());
    const backends = [createTestBackend('claude'), createTestBackend('gemini')];
    const circuitBreaker = new CircuitBreaker();
    const detector = new BackendDetector({}, createNoopRunner());

    const fallbackClient = new FallbackChainWorkerClient(
      'fallback-w1',
      backends,
      circuitBreaker,
      detector,
    );

    await pool.register(fallbackClient, '/repo');

    expect(pool.size).toBe(1);
    expect(pool.has('fallback-w1')).toBe(true);

    const claimed = await pool.claimIdle();
    expect(claimed).toBe(fallbackClient);
    expect(pool.idleCount).toBe(0);

    await pool.release('fallback-w1');
    expect(pool.idleCount).toBe(1);
  });

  it('FallbackChainWorkerClient health check integrates with pool', async () => {
    const { setWorkerStatus } = await import('../store/workers.js');
    const pool = new WorkerPool(mockDb());

    // Runner that reports all backends as unavailable
    const unavailableRunner: SubprocessRunner = {
      run: vi.fn().mockRejectedValue(new Error('not found')),
    };
    const detector = new BackendDetector({}, unavailableRunner);
    const backends = [createTestBackend('claude')];
    const circuitBreaker = new CircuitBreaker();

    const fallbackClient = new FallbackChainWorkerClient(
      'fallback-w2',
      backends,
      circuitBreaker,
      detector,
    );

    await pool.register(fallbackClient, '/repo');
    await pool.healthCheckAll();

    // isHealthy returns false when no backends are available
    expect(setWorkerStatus).toHaveBeenCalledWith(expect.anything(), 'fallback-w2', 'error');
  });
});
