import type { CliContext, CliOutput } from '@open-tomato/cli-core';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./root.js', () => ({
  resolveRepoRoot: vi.fn(),
}));

import { runLegacyCommand } from './legacyShim.js';
import { resolveRepoRoot } from './root.js';

const mockResolveRepoRoot = vi.mocked(resolveRepoRoot);

const noopOutput: CliOutput = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  emit: () => {},
  result: () => {},
};

function makeCtx(args: readonly string[] = []): CliContext {
  return {
    args,
    flags: {},
    outputMode: 'text',
    verbosity: 0,
    output: noopOutput,
    signal: new AbortController().signal,
    env: {},
  };
}

describe('runLegacyCommand', () => {
  beforeEach(() => {
    mockResolveRepoRoot.mockReset();
  });

  it('passes ctx.args through to the legacy default export', async () => {
    mockResolveRepoRoot.mockReturnValue('/repo');
    const defaultFn = vi.fn();
    const ctx = makeCtx(['linear', 'next', '--id=123']);

    await runLegacyCommand(ctx, { default: defaultFn });

    expect(defaultFn).toHaveBeenCalledTimes(1);
    expect(defaultFn.mock.calls[0]?.[0]).toBe(ctx.args);
  });

  it('passes the resolved repoRoot on the adapter context', async () => {
    mockResolveRepoRoot.mockReturnValue('/some/repo');
    const defaultFn = vi.fn();

    await runLegacyCommand(makeCtx(), { default: defaultFn });

    expect(mockResolveRepoRoot).toHaveBeenCalledTimes(1);
    expect(defaultFn.mock.calls[0]?.[1]).toEqual({ repoRoot: '/some/repo' });
  });

  it('passes repoRoot=null when no marker is found', async () => {
    mockResolveRepoRoot.mockReturnValue(null);
    const defaultFn = vi.fn();

    await runLegacyCommand(makeCtx(), { default: defaultFn });

    expect(defaultFn.mock.calls[0]?.[1]).toEqual({ repoRoot: null });
  });

  it('rejects when the legacy command throws synchronously', async () => {
    mockResolveRepoRoot.mockReturnValue('/repo');
    const defaultFn = (): never => {
      throw new Error('boom');
    };

    await expect(
      runLegacyCommand(makeCtx(), { default: defaultFn }),
    ).rejects.toThrow('boom');
  });

  it('rejects when the legacy command returns a rejected promise', async () => {
    mockResolveRepoRoot.mockReturnValue('/repo');
    const defaultFn = (): Promise<never> => Promise.reject(new Error('async failure'));

    await expect(
      runLegacyCommand(makeCtx(), { default: defaultFn }),
    ).rejects.toThrow('async failure');
  });
});
