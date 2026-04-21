/**
 * @packageDocumentation
 * Unit tests for HookExecutor — spawnHook and runPhase.
 */

import type { HookPayload, HookPhase, HookResult, HookSpec } from './types.js';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { HookExecutor, type Logger } from './executor.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpec(overrides: Partial<HookSpec> = {}): HookSpec {
  return {
    name: 'test-hook',
    command: 'echo',
    timeoutMs: 5000,
    on_error: 'warn',
    ...overrides,
  };
}

function makePayload(overrides: Partial<HookPayload> = {}): HookPayload {
  return {
    iteration: 1,
    hat: 'default',
    events: [],
    metadata: {},
    ...overrides,
  };
}

function makeResult(overrides: Partial<HookResult> = {}): HookResult {
  return {
    hookName: 'test-hook',
    phase: 'pre.loop.start',
    exitCode: 0,
    stdout: '',
    stderr: '',
    durationMs: 10,
    disposition: 'continue',
    ...overrides,
  };
}

function makeLogger(): Logger {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// spawnHook helpers
// ---------------------------------------------------------------------------

function makeTextStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (text.length > 0) {
        controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });
}

interface MockProc {
  stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number | null>;
  kill: ReturnType<typeof vi.fn>;
}

function makeMockProc(opts: {
  stdoutText?: string;
  stderrText?: string;
  exitCode?: number | null;
}): MockProc {
  return {
    stdin: { write: vi.fn(), end: vi.fn() },
    stdout: makeTextStream(opts.stdoutText ?? ''),
    stderr: makeTextStream(opts.stderrText ?? ''),
    exited: Promise.resolve(opts.exitCode !== undefined
      ? opts.exitCode
      : 0),
    kill: vi.fn(),
  };
}

type SpawnHookFn = (
  spec: HookSpec,
  payload: HookPayload,
) => Promise<{ exitCode: number | null; stdout: string; stderr: string; timedOut: boolean }>;

// ---------------------------------------------------------------------------
// Tests — HookExecutor.spawnHook
// ---------------------------------------------------------------------------

describe('HookExecutor.spawnHook', () => {
  let logger: Logger;
  let executor: HookExecutor;

  beforeEach(() => {
    logger = makeLogger();
    executor = new HookExecutor([], logger);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function stubBunSpawn(proc: MockProc): ReturnType<typeof vi.fn> {
    const spawnFn = vi.fn(() => proc);
    vi.stubGlobal('Bun', { spawn: spawnFn, env: {} });
    return spawnFn;
  }

  it('writes JSON-serialised payload to stdin', async () => {
    const proc = makeMockProc({ exitCode: 0 });
    stubBunSpawn(proc);

    const spec = makeSpec();
    const payload = makePayload({ iteration: 3, hat: 'thinker', metadata: { key: 'value' } });

    await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(spec, payload);

    expect(proc.stdin.write).toHaveBeenCalledOnce();
    const written = proc.stdin.write.mock.calls[0][0] as string;
    expect(JSON.parse(written)).toEqual(payload);
  });

  it('calls stdin.end() after writing payload', async () => {
    const proc = makeMockProc({ exitCode: 0 });
    stubBunSpawn(proc);

    await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(makeSpec(), makePayload());

    expect(proc.stdin.end).toHaveBeenCalledOnce();
  });

  it('truncates stdout to max_output_bytes', async () => {
    const longText = 'x'.repeat(200);
    const proc = makeMockProc({ stdoutText: longText, exitCode: 0 });
    stubBunSpawn(proc);

    const spec = makeSpec({ max_output_bytes: 50 });
    const result = await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(spec, makePayload());

    expect(result.stdout).toHaveLength(50);
    expect(result.stdout).toBe('x'.repeat(50));
  });

  it('truncates stderr to max_output_bytes', async () => {
    const longText = 'e'.repeat(300);
    const proc = makeMockProc({ stderrText: longText, exitCode: 1 });
    stubBunSpawn(proc);

    const spec = makeSpec({ max_output_bytes: 100 });
    const result = await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(spec, makePayload());

    expect(result.stderr).toHaveLength(100);
    expect(result.stderr).toBe('e'.repeat(100));
  });

  it('uses 65536 as default max_output_bytes when not specified', async () => {
    const longText = 'a'.repeat(70_000);
    const proc = makeMockProc({ stdoutText: longText, exitCode: 0 });
    stubBunSpawn(proc);

    const spec = makeSpec(); // no max_output_bytes
    const result = await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(spec, makePayload());

    expect(result.stdout).toHaveLength(65_536);
  });

  it('does not truncate output shorter than max_output_bytes', async () => {
    const proc = makeMockProc({ stdoutText: 'short', stderrText: 'err', exitCode: 0 });
    stubBunSpawn(proc);

    const spec = makeSpec({ max_output_bytes: 1024 });
    const result = await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(spec, makePayload());

    expect(result.stdout).toBe('short');
    expect(result.stderr).toBe('err');
  });

  it('returns exit code from the process', async () => {
    const proc = makeMockProc({ exitCode: 42 });
    stubBunSpawn(proc);

    const result = await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(makeSpec(), makePayload());

    expect(result.exitCode).toBe(42);
  });

  it('returns null exit code when process exits with null', async () => {
    const proc = makeMockProc({ exitCode: null });
    stubBunSpawn(proc);

    const result = await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(makeSpec(), makePayload());

    expect(result.exitCode).toBeNull();
  });

  it('passes command and args to Bun.spawn', async () => {
    const proc = makeMockProc({ exitCode: 0 });
    const spawnFn = stubBunSpawn(proc);

    const spec = makeSpec({ command: 'my-hook', args: ['--verbose', '--json'] });
    await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(spec, makePayload());

    expect(spawnFn).toHaveBeenCalledOnce();
    const [cmd] = spawnFn.mock.calls[0] as [string[], unknown];
    expect(cmd).toEqual(['my-hook', '--verbose', '--json']);
  });

  it('passes spec.cwd to Bun.spawn options', async () => {
    const proc = makeMockProc({ exitCode: 0 });
    const spawnFn = stubBunSpawn(proc);

    const spec = makeSpec({ cwd: '/tmp/hook-dir' });
    await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(spec, makePayload());

    const [, opts] = spawnFn.mock.calls[0] as [string[], { cwd?: string }];
    expect(opts.cwd).toBe('/tmp/hook-dir');
  });

  it('merges spec.env into process environment passed to Bun.spawn', async () => {
    const proc = makeMockProc({ exitCode: 0 });
    const spawnFn = stubBunSpawn(proc);

    const spec = makeSpec({ env: { MY_VAR: 'hello' } });
    await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(spec, makePayload());

    const [, opts] = spawnFn.mock.calls[0] as [string[], { env?: Record<string, string> }];
    expect(opts.env?.MY_VAR).toBe('hello');
  });

  // -------------------------------------------------------------------------
  // ETXTBSY retry behavior
  // -------------------------------------------------------------------------

  it('retries spawn up to 3 times on ETXTBSY and throws after all retries are exhausted', async () => {
    vi.useFakeTimers();

    const etxtbsyError = Object.assign(new Error('spawn ETXTBSY'), { code: 'ETXTBSY' });
    const spawnFn = vi.fn().mockImplementation(() => { throw etxtbsyError; });
    vi.stubGlobal('Bun', { spawn: spawnFn, env: {} });

    const promise = (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(makeSpec(), makePayload());

    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection warning
    const rejection = expect(promise).rejects.toThrow('spawn ETXTBSY');
    // 3 retries × 50 ms each; the 4th (final) attempt throws immediately with no delay
    await vi.advanceTimersByTimeAsync(150);
    await rejection;

    // initial attempt (0) + 3 retries (1, 2, 3) = 4 total calls
    expect(spawnFn).toHaveBeenCalledTimes(4);
  });

  it('resolves successfully when ETXTBSY clears before retries are exhausted', async () => {
    vi.useFakeTimers();

    const etxtbsyError = Object.assign(new Error('spawn ETXTBSY'), { code: 'ETXTBSY' });
    const successProc = makeMockProc({ exitCode: 0 });
    let callCount = 0;
    const spawnFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 4) throw etxtbsyError;
      return successProc;
    });
    vi.stubGlobal('Bun', { spawn: spawnFn, env: {} });

    const promise = (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(makeSpec(), makePayload());
    // Advance through 3 delay periods so the 4th attempt (which succeeds) runs
    await vi.advanceTimersByTimeAsync(150);
    const result = await promise;

    expect(spawnFn).toHaveBeenCalledTimes(4);
    expect(result.exitCode).toBe(0);
  });

  it('does not retry on non-ETXTBSY spawn errors', async () => {
    const otherError = Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' });
    const spawnFn = vi.fn().mockImplementation(() => { throw otherError; });
    vi.stubGlobal('Bun', { spawn: spawnFn, env: {} });

    await expect(
      (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(makeSpec(), makePayload()),
    ).rejects.toThrow('ENOENT');

    expect(spawnFn).toHaveBeenCalledTimes(1);
  });

  it('kills the process and returns timedOut=true after timeoutMs elapses', async () => {
    vi.useFakeTimers();

    let resolveExited!: (code: number | null) => void;
    const exitedPromise = new Promise<number | null>((resolve) => {
      resolveExited = resolve;
    });

    const proc = {
      stdin: { write: vi.fn(), end: vi.fn() },
      stdout: makeTextStream(''),
      stderr: makeTextStream(''),
      exited: exitedPromise,
      kill: vi.fn().mockImplementation(() => { resolveExited(null); }),
    };

    vi.stubGlobal('Bun', { spawn: vi.fn().mockReturnValue(proc), env: {} });

    const spec = makeSpec({ timeoutMs: 100 });
    const promise = (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(spec, makePayload());

    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(proc.kill).toHaveBeenCalledWith('SIGKILL');
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
  });

  it('does not kill the process when it exits before timeoutMs', async () => {
    vi.useFakeTimers();

    const proc = makeMockProc({ exitCode: 0 });
    vi.stubGlobal('Bun', { spawn: vi.fn().mockReturnValue(proc), env: {} });

    const spec = makeSpec({ timeoutMs: 1000 });
    const result = await (executor as unknown as { spawnHook: SpawnHookFn }).spawnHook(spec, makePayload());

    expect(proc.kill).not.toHaveBeenCalled();
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — HookExecutor.runHook
// ---------------------------------------------------------------------------

describe('HookExecutor.runHook', () => {
  let logger: Logger;
  let executor: HookExecutor;

  type SpawnResult = { exitCode: number | null; stdout: string; stderr: string; timedOut: boolean };
  type SpawnHookMethod = (spec: HookSpec, payload: HookPayload) => Promise<SpawnResult>;

  function stubSpawnHook(result: SpawnResult): void {
    vi.spyOn(
      executor as unknown as { spawnHook: SpawnHookMethod },
      'spawnHook',
    ).mockResolvedValue(result);
  }

  beforeEach(() => {
    logger = makeLogger();
    executor = new HookExecutor([], logger);
  });

  it('returns disposition: timeout when timedOut is true', async () => {
    stubSpawnHook({ exitCode: null, stdout: '', stderr: '', timedOut: true });

    const result = await executor.runHook(makeSpec(), 'pre.loop.start', makePayload(), {});

    expect(result.disposition).toBe('timeout');
    expect(result.exitCode).toBeNull();
  });

  it('logs a warning when process times out', async () => {
    stubSpawnHook({ exitCode: null, stdout: '', stderr: '', timedOut: true });

    await executor.runHook(
      makeSpec({ name: 'slow-hook', timeoutMs: 500 }),
      'pre.loop.start',
      makePayload(),
      {},
    );

    expect(logger.warn).toHaveBeenCalledOnce();
    const msg = (logger.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg).toContain('slow-hook');
    expect(msg).toContain('500');
  });

  it('does not apply mutation when process times out (even with valid JSON stdout)', async () => {
    stubSpawnHook({ exitCode: null, stdout: '{"injected":true}', stderr: '', timedOut: true });

    const accumulatedMetadata: Record<string, unknown> = {};
    const result = await executor.runHook(
      makeSpec({ mutate: { enabled: true } }),
      'pre.loop.start',
      makePayload(),
      accumulatedMetadata,
    );

    expect(result.disposition).toBe('timeout');
    expect(result.mutationApplied).toBeUndefined();
    expect(accumulatedMetadata).toEqual({});
  });

  it('applies mutation when exitCode is 0 and mutate.enabled is true', async () => {
    stubSpawnHook({ exitCode: 0, stdout: '{"key":"val"}', stderr: '', timedOut: false });

    const accumulatedMetadata: Record<string, unknown> = {};
    const result = await executor.runHook(
      makeSpec({ mutate: { enabled: true } }),
      'pre.loop.start',
      makePayload(),
      accumulatedMetadata,
    );

    expect(result.disposition).toBe('continue');
    expect(result.mutationApplied).toEqual({ key: 'val' });
    expect(accumulatedMetadata).toEqual({ key: 'val' });
  });

  it('applies mutation when on_error:warn hook exits non-zero and mutate.enabled is true', async () => {
    stubSpawnHook({ exitCode: 1, stdout: '{"key":"val"}', stderr: '', timedOut: false });

    const accumulatedMetadata: Record<string, unknown> = {};
    const result = await executor.runHook(
      makeSpec({ on_error: 'warn', mutate: { enabled: true } }),
      'pre.loop.start',
      makePayload(),
      accumulatedMetadata,
    );

    expect(result.disposition).toBe('warn');
    expect(result.mutationApplied).toEqual({ key: 'val' });
    expect(accumulatedMetadata).toEqual({ key: 'val' });
  });

  it('does not apply mutation when on_error:block hook exits non-zero', async () => {
    stubSpawnHook({ exitCode: 1, stdout: '{"key":"val"}', stderr: '', timedOut: false });

    const accumulatedMetadata: Record<string, unknown> = {};
    const result = await executor.runHook(
      makeSpec({ on_error: 'block', mutate: { enabled: true } }),
      'pre.loop.start',
      makePayload(),
      accumulatedMetadata,
    );

    expect(result.disposition).toBe('block');
    expect(result.mutationApplied).toBeUndefined();
    expect(accumulatedMetadata).toEqual({});
  });

  it('does not apply mutation when on_error:suspend hook exits non-zero', async () => {
    stubSpawnHook({ exitCode: 1, stdout: '{"key":"val"}', stderr: '', timedOut: false });

    const accumulatedMetadata: Record<string, unknown> = {};
    const result = await executor.runHook(
      makeSpec({ on_error: 'suspend', mutate: { enabled: true } }),
      'pre.loop.start',
      makePayload(),
      accumulatedMetadata,
    );

    expect(result.disposition).toBe('suspend');
    expect(result.mutationApplied).toBeUndefined();
    expect(accumulatedMetadata).toEqual({});
  });

  it('does not apply mutation when mutate is disabled', async () => {
    stubSpawnHook({ exitCode: 0, stdout: '{"key":"val"}', stderr: '', timedOut: false });

    const accumulatedMetadata: Record<string, unknown> = {};
    const result = await executor.runHook(
      makeSpec({ mutate: { enabled: false } }),
      'pre.loop.start',
      makePayload(),
      accumulatedMetadata,
    );

    expect(result.disposition).toBe('continue');
    expect(result.mutationApplied).toBeUndefined();
    expect(accumulatedMetadata).toEqual({});
  });

  it('does not apply mutation when stdout is invalid JSON', async () => {
    stubSpawnHook({ exitCode: 0, stdout: 'not-json', stderr: '', timedOut: false });

    const accumulatedMetadata: Record<string, unknown> = {};
    await executor.runHook(
      makeSpec({ mutate: { enabled: true } }),
      'pre.loop.start',
      makePayload(),
      accumulatedMetadata,
    );

    expect(accumulatedMetadata).toEqual({});
  });

  it('does not apply mutation when stdout is a JSON array (not an object)', async () => {
    stubSpawnHook({ exitCode: 0, stdout: '[1,2,3]', stderr: '', timedOut: false });

    const accumulatedMetadata: Record<string, unknown> = {};
    await executor.runHook(
      makeSpec({ mutate: { enabled: true } }),
      'pre.loop.start',
      makePayload(),
      accumulatedMetadata,
    );

    expect(accumulatedMetadata).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Tests — HookExecutor.runPhase
// ---------------------------------------------------------------------------

describe('HookExecutor.runPhase', () => {
  let logger: Logger;
  let executor: HookExecutor;

  beforeEach(() => {
    logger = makeLogger();
    executor = new HookExecutor([], logger);
  });

  it('returns empty metadata and no flags when hooks list is empty', async () => {
    const payload = makePayload({ metadata: { existing: 'value' } });
    const result = await executor.runPhase('pre.loop.start', [], payload);

    expect(result.blocked).toBe(false);
    expect(result.suspended).toBe(false);
    expect(result.metadata).toEqual({ existing: 'value' });
  });

  it('passes initial payload metadata through when no mutations occur', async () => {
    const spec = makeSpec();
    const payload = makePayload({ metadata: { key: 'val' } });

    vi.spyOn(executor as unknown as { runHook: () => Promise<HookResult> }, 'runHook').mockResolvedValue(
      makeResult({ disposition: 'continue' }),
    );

    const result = await executor.runPhase('pre.loop.start', [spec], payload);

    expect(result.metadata).toEqual({ key: 'val' });
    expect(result.blocked).toBe(false);
    expect(result.suspended).toBe(false);
  });

  it('merges mutation from a single hook into accumulated metadata', async () => {
    const spec = makeSpec({ mutate: { enabled: true } });
    const payload = makePayload({ metadata: { a: 1 } });

    vi.spyOn(executor as unknown as { runHook: () => Promise<HookResult> }, 'runHook').mockResolvedValue(
      makeResult({ disposition: 'continue', mutationApplied: { b: 2 } }),
    );

    // runHook mutates accumulatedMetadata in-place; simulate that side effect
    vi.spyOn(executor as unknown as { runHook: (spec: HookSpec, phase: HookPhase, payload: HookPayload, meta: Record<string, unknown>) => Promise<HookResult> }, 'runHook').mockImplementation(
      async (_spec, _phase, _payload, accumulatedMetadata) => {
        Object.assign(accumulatedMetadata, { b: 2 });
        return makeResult({ disposition: 'continue', mutationApplied: { b: 2 } });
      },
    );

    const result = await executor.runPhase('pre.loop.start', [spec], payload);

    expect(result.metadata).toEqual({ a: 1, b: 2 });
    expect(result.blocked).toBe(false);
    expect(result.suspended).toBe(false);
  });

  it('chains metadata across multiple hooks', async () => {
    const spec1 = makeSpec({ name: 'hook-1', mutate: { enabled: true } });
    const spec2 = makeSpec({ name: 'hook-2', mutate: { enabled: true } });
    const payload = makePayload({ metadata: { start: true } });

    const runHookMock = vi.fn().mockImplementation(
      async (_spec: HookSpec, _phase: HookPhase, _payload: HookPayload, meta: Record<string, unknown>) => {
        if (_spec.name === 'hook-1') {
          Object.assign(meta, { fromHook1: 'yes' });
          return makeResult({ hookName: 'hook-1', disposition: 'continue', mutationApplied: { fromHook1: 'yes' } });
        }
        // hook-2 sees metadata from hook-1
        Object.assign(meta, { fromHook2: meta['fromHook1'] === 'yes'
          ? 'confirmed'
          : 'missing' });
        return makeResult({ hookName: 'hook-2', disposition: 'continue', mutationApplied: { fromHook2: 'confirmed' } });
      },
    );

    (executor as unknown as { runHook: typeof runHookMock }).runHook = runHookMock;

    const result = await executor.runPhase('pre.loop.start', [spec1, spec2], payload);

    expect(result.metadata).toEqual({ start: true, fromHook1: 'yes', fromHook2: 'confirmed' });
    expect(result.blocked).toBe(false);
    expect(result.suspended).toBe(false);
  });

  it('halts chain on first block and returns blocked: true', async () => {
    const spec1 = makeSpec({ name: 'hook-1', on_error: 'block' });
    const spec2 = makeSpec({ name: 'hook-2' });
    const payload = makePayload();

    const runHookMock = vi.fn().mockImplementation(
      async (_spec: HookSpec) => {
        if (_spec.name === 'hook-1') {
          return makeResult({ hookName: 'hook-1', disposition: 'block', exitCode: 1 });
        }
        return makeResult({ hookName: 'hook-2', disposition: 'continue' });
      },
    );

    (executor as unknown as { runHook: typeof runHookMock }).runHook = runHookMock;

    const result = await executor.runPhase('pre.loop.start', [spec1, spec2], payload);

    expect(result.blocked).toBe(true);
    expect(result.suspended).toBe(false);
    // hook-2 must never be called
    expect(runHookMock).toHaveBeenCalledTimes(1);
    expect(runHookMock.mock.calls[0][0].name).toBe('hook-1');
  });

  it('halts chain on first suspend and returns suspended: true', async () => {
    const spec1 = makeSpec({ name: 'hook-1', on_error: 'suspend' });
    const spec2 = makeSpec({ name: 'hook-2' });
    const payload = makePayload();

    const runHookMock = vi.fn().mockImplementation(
      async (_spec: HookSpec) => {
        if (_spec.name === 'hook-1') {
          return makeResult({ hookName: 'hook-1', disposition: 'suspend', exitCode: 1 });
        }
        return makeResult({ hookName: 'hook-2', disposition: 'continue' });
      },
    );

    (executor as unknown as { runHook: typeof runHookMock }).runHook = runHookMock;

    const result = await executor.runPhase('pre.loop.start', [spec1, spec2], payload);

    expect(result.suspended).toBe(true);
    expect(result.blocked).toBe(false);
    expect(runHookMock).toHaveBeenCalledTimes(1);
  });

  it('continues chain after warn disposition', async () => {
    const spec1 = makeSpec({ name: 'hook-1', on_error: 'warn' });
    const spec2 = makeSpec({ name: 'hook-2' });
    const payload = makePayload();

    const runHookMock = vi.fn().mockImplementation(
      async (_spec: HookSpec) => {
        if (_spec.name === 'hook-1') {
          return makeResult({ hookName: 'hook-1', disposition: 'warn', exitCode: 1 });
        }
        return makeResult({ hookName: 'hook-2', disposition: 'continue' });
      },
    );

    (executor as unknown as { runHook: typeof runHookMock }).runHook = runHookMock;

    const result = await executor.runPhase('pre.loop.start', [spec1, spec2], payload);

    expect(result.blocked).toBe(false);
    expect(result.suspended).toBe(false);
    expect(runHookMock).toHaveBeenCalledTimes(2);
  });

  it('continues chain after timeout disposition', async () => {
    const spec1 = makeSpec({ name: 'hook-1' });
    const spec2 = makeSpec({ name: 'hook-2' });
    const payload = makePayload();

    const runHookMock = vi.fn().mockImplementation(
      async (_spec: HookSpec) => {
        if (_spec.name === 'hook-1') {
          return makeResult({ hookName: 'hook-1', disposition: 'timeout', exitCode: null });
        }
        return makeResult({ hookName: 'hook-2', disposition: 'continue' });
      },
    );

    (executor as unknown as { runHook: typeof runHookMock }).runHook = runHookMock;

    const result = await executor.runPhase('pre.loop.start', [spec1, spec2], payload);

    expect(result.blocked).toBe(false);
    expect(result.suspended).toBe(false);
    expect(runHookMock).toHaveBeenCalledTimes(2);
  });

  it('passes a copy of accumulated metadata as phasePayload to each hook', async () => {
    const spec = makeSpec();
    const payload = makePayload({ metadata: { initial: true } });

    const capturedPayloads: HookPayload[] = [];

    const runHookMock = vi.fn().mockImplementation(
      async (_spec: HookSpec, _phase: HookPhase, hookPayload: HookPayload) => {
        capturedPayloads.push(hookPayload);
        return makeResult({ disposition: 'continue' });
      },
    );

    (executor as unknown as { runHook: typeof runHookMock }).runHook = runHookMock;

    await executor.runPhase('pre.loop.start', [spec], payload);

    expect(capturedPayloads).toHaveLength(1);
    expect(capturedPayloads[0].metadata).toEqual({ initial: true });
  });

  it('logs error when a hook blocks', async () => {
    const spec = makeSpec({ name: 'blocker', on_error: 'block' });
    const payload = makePayload();

    const runHookMock = vi.fn().mockResolvedValue(
      makeResult({ hookName: 'blocker', disposition: 'block', exitCode: 2, stderr: 'fatal error' }),
    );

    (executor as unknown as { runHook: typeof runHookMock }).runHook = runHookMock;

    await executor.runPhase('pre.loop.start', [spec], payload);

    expect(logger.error).toHaveBeenCalledOnce();
    const errorMsg = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(errorMsg).toContain('blocker');
    expect(errorMsg).toContain('pre.loop.start');
  });

  it('logs warning when a hook suspends', async () => {
    const spec = makeSpec({ name: 'suspender', on_error: 'suspend' });
    const payload = makePayload();

    const runHookMock = vi.fn().mockResolvedValue(
      makeResult({ hookName: 'suspender', disposition: 'suspend', exitCode: 1 }),
    );

    (executor as unknown as { runHook: typeof runHookMock }).runHook = runHookMock;

    await executor.runPhase('pre.loop.start', [spec], payload);

    expect(logger.warn).toHaveBeenCalledOnce();
    const warnMsg = (logger.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(warnMsg).toContain('suspender');
  });
});
