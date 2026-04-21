import type { SubprocessRunner } from './backend-detector.js';

import { describe, expect, it, vi } from 'vitest';

import { BackendDetector } from './backend-detector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stubRunner(
  results: Record<string, { exitCode: number } | Error>,
): SubprocessRunner {
  return {
    async run(command) {
      const result = results[command];
      if (result instanceof Error) throw result;
      if (result !== undefined) return result;
      throw new Error(`spawn ENOENT: ${command}`);
    },
  };
}

// ---------------------------------------------------------------------------
// isAvailable
// ---------------------------------------------------------------------------

describe('BackendDetector.isAvailable', () => {
  it('returns true when --version exits with code 0', async () => {
    const runner = stubRunner({ claude: { exitCode: 0 } });
    const detector = new BackendDetector({}, runner);

    expect(await detector.isAvailable('claude')).toBe(true);
  });

  it('returns false when --version exits with non-zero code', async () => {
    const runner = stubRunner({ claude: { exitCode: 1 } });
    const detector = new BackendDetector({}, runner);

    expect(await detector.isAvailable('claude')).toBe(false);
  });

  it('returns false when the command is not found (spawn error)', async () => {
    const runner = stubRunner({});
    const detector = new BackendDetector({}, runner);

    expect(await detector.isAvailable('nonexistent')).toBe(false);
  });

  it('returns false when the runner throws a generic error', async () => {
    const runner = stubRunner({ broken: new Error('permission denied') });
    const detector = new BackendDetector({}, runner);

    expect(await detector.isAvailable('broken')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detect
// ---------------------------------------------------------------------------

describe('BackendDetector.detect', () => {
  it('returns only available candidates', async () => {
    const runner = stubRunner({
      claude: { exitCode: 0 },
      gemini: { exitCode: 1 },
      codex: { exitCode: 0 },
    });
    const detector = new BackendDetector({}, runner);

    const available = await detector.detect(['claude', 'gemini', 'codex']);

    expect(available).toEqual(['claude', 'codex']);
  });

  it('returns an empty array when no candidates are available', async () => {
    const runner = stubRunner({});
    const detector = new BackendDetector({}, runner);

    expect(await detector.detect(['a', 'b'])).toEqual([]);
  });

  it('preserves candidate order in the result', async () => {
    const runner = stubRunner({
      codex: { exitCode: 0 },
      claude: { exitCode: 0 },
    });
    const detector = new BackendDetector({}, runner);

    expect(await detector.detect(['codex', 'claude'])).toEqual([
      'codex',
      'claude',
    ]);
  });
});

// ---------------------------------------------------------------------------
// TTL cache
// ---------------------------------------------------------------------------

describe('BackendDetector caching', () => {
  it('does not re-probe within the TTL window', async () => {
    const runSpy = vi.fn().mockResolvedValue({ exitCode: 0 });
    const runner: SubprocessRunner = { run: runSpy };
    const detector = new BackendDetector({ cacheTtlMs: 60_000 }, runner);

    await detector.isAvailable('claude');
    await detector.isAvailable('claude');
    await detector.isAvailable('claude');

    expect(runSpy).toHaveBeenCalledTimes(1);
  });

  it('re-probes after the TTL expires', async () => {
    const runSpy = vi.fn().mockResolvedValue({ exitCode: 0 });
    const runner: SubprocessRunner = { run: runSpy };
    const detector = new BackendDetector({ cacheTtlMs: 50 }, runner);

    await detector.isAvailable('claude');
    expect(runSpy).toHaveBeenCalledTimes(1);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    await detector.isAvailable('claude');
    expect(runSpy).toHaveBeenCalledTimes(2);
  });

  it('caches negative results too', async () => {
    const runSpy = vi.fn().mockRejectedValue(new Error('ENOENT'));
    const runner: SubprocessRunner = { run: runSpy };
    const detector = new BackendDetector({ cacheTtlMs: 60_000 }, runner);

    await detector.isAvailable('missing');
    await detector.isAvailable('missing');

    expect(runSpy).toHaveBeenCalledTimes(1);
  });

  it('clearCache forces a re-probe on next call', async () => {
    const runSpy = vi.fn().mockResolvedValue({ exitCode: 0 });
    const runner: SubprocessRunner = { run: runSpy };
    const detector = new BackendDetector({ cacheTtlMs: 60_000 }, runner);

    await detector.isAvailable('claude');
    detector.clearCache();
    await detector.isAvailable('claude');

    expect(runSpy).toHaveBeenCalledTimes(2);
  });

  it('caches results per command independently', async () => {
    const runSpy = vi.fn().mockResolvedValue({ exitCode: 0 });
    const runner: SubprocessRunner = { run: runSpy };
    const detector = new BackendDetector({ cacheTtlMs: 60_000 }, runner);

    await detector.isAvailable('claude');
    await detector.isAvailable('gemini');

    expect(runSpy).toHaveBeenCalledTimes(2);
    expect(runSpy).toHaveBeenCalledWith('claude', ['--version']);
    expect(runSpy).toHaveBeenCalledWith('gemini', ['--version']);
  });
});
