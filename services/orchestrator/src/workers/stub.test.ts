import { describe, expect, it } from 'vitest';

import { StubWorkerClient } from './stub.js';

describe('StubWorkerClient', () => {
  it('prepareWorkspace returns cwd', async () => {
    const stub = new StubWorkerClient('stub-1');
    const dir = await stub.prepareWorkspace('main');
    expect(typeof dir).toBe('string');
    expect(dir.length).toBeGreaterThan(0);
  });

  it('exec returns a process that exits with 0', async () => {
    const stub = new StubWorkerClient('stub-1');
    const proc = await stub.exec('test prompt', '/tmp');

    const code = await proc.exited;
    expect(code).toBe(0);
  });

  it('exec stdout/stderr are readable and close immediately', async () => {
    const stub = new StubWorkerClient('stub-1');
    const proc = await stub.exec('test', '/tmp');

    const reader = proc.stdout.getReader();
    const { done } = await reader.read();
    expect(done).toBe(true);
  });

  it('cleanWorkspace is a no-op', async () => {
    const stub = new StubWorkerClient('stub-1');
    await expect(stub.cleanWorkspace()).resolves.toBeUndefined();
  });

  it('isHealthy returns true', async () => {
    const stub = new StubWorkerClient('stub-1');
    expect(await stub.isHealthy()).toBe(true);
  });
});
