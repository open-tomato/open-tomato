/**
 * @packageDocumentation
 * Unit tests for failure mode handlers: handleWarn, handleBlock, handleSuspend.
 */

import type { Logger } from './executor.js';
import type { SuspendStatePersister, SuspendStrategyMap } from './failure-modes.js';
import type { HookResult, SuspendState } from './types.js';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handleWarn, handleBlock, handleSuspend } from './failure-modes.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<HookResult> = {}): HookResult {
  return {
    hookName: 'test-hook',
    phase: 'pre.loop.start',
    exitCode: 1,
    stdout: '',
    stderr: 'something went wrong',
    durationMs: 42,
    disposition: 'warn',
    ...overrides,
  };
}

function makeSuspendState(overrides: Partial<SuspendState> = {}): SuspendState {
  return {
    phase: 'pre.loop.start',
    hookName: 'test-hook',
    payload: { iteration: 1, hat: 'default', events: [], metadata: {} },
    suspendMode: 'WaitForResume',
    suspendedAt: '2026-01-01T00:00:00.000Z',
    retryCount: 0,
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

function makeStore(): SuspendStatePersister {
  return {
    persist: vi.fn().mockResolvedValue(undefined),
  };
}

function makeStrategies(): SuspendStrategyMap {
  return {
    WaitForResume: vi.fn().mockResolvedValue(undefined),
    RetryBackoff: vi.fn().mockResolvedValue(undefined),
    WaitThenRetry: vi.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// handleWarn
// ---------------------------------------------------------------------------

describe('handleWarn', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = makeLogger();
  });

  it('returns { action: "continue" }', () => {
    const result = handleWarn(makeResult(), logger);
    expect(result).toEqual({ action: 'continue' });
  });

  it('logs a warning containing hook name, phase, exit code, and stderr excerpt', () => {
    const result = makeResult({
      hookName: 'my-hook',
      phase: 'post.loop.start',
      exitCode: 2,
      stderr: 'fatal: something broke',
    });

    handleWarn(result, logger);

    expect(logger.warn).toHaveBeenCalledOnce();
    const msg = (logger.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg).toContain('my-hook');
    expect(msg).toContain('post.loop.start');
    expect(msg).toContain('2');
    expect(msg).toContain('fatal: something broke');
  });

  it('truncates stderr excerpt at 200 characters', () => {
    const longStderr = 'x'.repeat(300);
    handleWarn(makeResult({ stderr: longStderr }), logger);

    const msg = (logger.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // The excerpt in the message should be at most 200 chars of the stderr content
    const excerptMatch = msg.match(/stderr="([^"]*)"/);
    expect(excerptMatch).not.toBeNull();
    expect(excerptMatch![1].length).toBeLessThanOrEqual(200);
  });

  it('handles null exit code without throwing', () => {
    expect(() => handleWarn(makeResult({ exitCode: null }), logger)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// handleBlock
// ---------------------------------------------------------------------------

describe('handleBlock', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = makeLogger();
  });

  it('returns { action: "block" }', () => {
    const result = handleBlock(makeResult(), logger);
    expect(result).toEqual({ action: 'block' });
  });

  it('logs an error containing hook name, phase, exit code, duration, stderr, and stdout', () => {
    const result = makeResult({
      hookName: 'blocker',
      phase: 'pre.iteration.start',
      exitCode: 3,
      durationMs: 100,
      stderr: 'disk full',
      stdout: 'partial output',
    });

    handleBlock(result, logger);

    expect(logger.error).toHaveBeenCalledOnce();
    const msg = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg).toContain('blocker');
    expect(msg).toContain('pre.iteration.start');
    expect(msg).toContain('3');
    expect(msg).toContain('100');
    expect(msg).toContain('disk full');
    expect(msg).toContain('partial output');
  });

  it('handles null exit code without throwing', () => {
    expect(() => handleBlock(makeResult({ exitCode: null }), logger)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// handleSuspend
// ---------------------------------------------------------------------------

describe('handleSuspend', () => {
  let logger: Logger;
  let store: SuspendStatePersister;
  let strategies: SuspendStrategyMap;

  beforeEach(() => {
    logger = makeLogger();
    store = makeStore();
    strategies = makeStrategies();
  });

  it('returns { action: "suspend" }', async () => {
    const response = await handleSuspend(makeResult(), store, makeSuspendState(), strategies, logger);
    expect(response).toEqual({ action: 'suspend' });
  });

  it('calls store.persist with the provided state', async () => {
    const state = makeSuspendState({ hookName: 'suspender', retryCount: 2 });
    await handleSuspend(makeResult(), store, state, strategies, logger);

    expect(store.persist).toHaveBeenCalledOnce();
    expect(store.persist).toHaveBeenCalledWith(state);
  });

  it('dispatches WaitForResume strategy when suspendMode is WaitForResume', async () => {
    const state = makeSuspendState({ suspendMode: 'WaitForResume' });
    await handleSuspend(makeResult(), store, state, strategies, logger);

    // Allow the fire-and-forget microtask to settle
    await Promise.resolve();

    expect(strategies.WaitForResume).toHaveBeenCalledOnce();
    expect(strategies.WaitForResume).toHaveBeenCalledWith(state);
    expect(strategies.RetryBackoff).not.toHaveBeenCalled();
    expect(strategies.WaitThenRetry).not.toHaveBeenCalled();
  });

  it('dispatches RetryBackoff strategy when suspendMode is RetryBackoff', async () => {
    const state = makeSuspendState({ suspendMode: 'RetryBackoff' });
    await handleSuspend(makeResult(), store, state, strategies, logger);

    await Promise.resolve();

    expect(strategies.RetryBackoff).toHaveBeenCalledOnce();
    expect(strategies.RetryBackoff).toHaveBeenCalledWith(state);
    expect(strategies.WaitForResume).not.toHaveBeenCalled();
    expect(strategies.WaitThenRetry).not.toHaveBeenCalled();
  });

  it('dispatches WaitThenRetry strategy when suspendMode is WaitThenRetry', async () => {
    const state = makeSuspendState({ suspendMode: 'WaitThenRetry' });
    await handleSuspend(makeResult(), store, state, strategies, logger);

    await Promise.resolve();

    expect(strategies.WaitThenRetry).toHaveBeenCalledOnce();
    expect(strategies.WaitThenRetry).toHaveBeenCalledWith(state);
    expect(strategies.WaitForResume).not.toHaveBeenCalled();
    expect(strategies.RetryBackoff).not.toHaveBeenCalled();
  });

  it('logs a warning containing hook name, phase, exit code, suspend mode, and retry count', async () => {
    const state = makeSuspendState({ suspendMode: 'RetryBackoff', retryCount: 3 });
    const result = makeResult({ hookName: 'my-hook', phase: 'pre.plan.created', exitCode: 1 });

    await handleSuspend(result, store, state, strategies, logger);

    expect(logger.warn).toHaveBeenCalledOnce();
    const msg = (logger.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg).toContain('my-hook');
    expect(msg).toContain('pre.plan.created');
    expect(msg).toContain('1');
    expect(msg).toContain('RetryBackoff');
    expect(msg).toContain('3');
  });

  it('logs an error if the dispatched strategy rejects', async () => {
    const state = makeSuspendState({ suspendMode: 'WaitForResume' });
    (strategies.WaitForResume as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('poll failed'));

    await handleSuspend(makeResult(), store, state, strategies, logger);

    // Let the rejected promise propagate through the void handler
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(logger.error).toHaveBeenCalledOnce();
    const msg = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg).toContain('WaitForResume');
    expect(msg).toContain('poll failed');
  });

  it('persists state before dispatching strategy', async () => {
    const callOrder: string[] = [];

    (store.persist as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push('persist');
    });
    (strategies.WaitForResume as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push('strategy');
    });

    const state = makeSuspendState({ suspendMode: 'WaitForResume' });
    await handleSuspend(makeResult(), store, state, strategies, logger);
    await Promise.resolve();

    expect(callOrder[0]).toBe('persist');
  });
});
