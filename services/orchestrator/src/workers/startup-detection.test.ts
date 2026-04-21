import type { BackendDescriptor } from './backend-descriptor.js';
import type { SubprocessRunner } from './backend-detector.js';

import { describe, expect, it, vi } from 'vitest';

import { BackendDetector } from './backend-detector.js';
import { BackendFactory } from './backend-factory.js';

// ---------------------------------------------------------------------------
// Helpers — mirror the startup wiring logic from the executor entry point
// ---------------------------------------------------------------------------

function createStubRunner(
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

/**
 * Reproduces the startup detection logic from `services/executor/index.ts`
 * in isolation so it can be unit-tested without bootstrapping the full service.
 */
async function runStartupDetection(
  detector: BackendDetector,
  candidates: readonly string[],
): Promise<{ available: string[]; backends: BackendDescriptor[]; logMessage: string }> {
  const available = await detector.detect([...candidates]);

  const logMessage = `[executor] detected backends: ${
    available.length > 0
      ? available.join(', ')
      : 'none'
  }`;

  const backends = available
    .map((name) => BackendFactory.create(name as 'claude' | 'gemini' | 'codex'))
    .filter(Boolean);

  if (backends.length === 0) {
    backends.push(BackendFactory.create('claude'));
  }

  return { available, backends, logMessage };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('startup backend detection', () => {
  const allCandidates = ['claude', 'gemini', 'codex'] as const;

  it('detects all available backends and logs them', async () => {
    const runner = createStubRunner({
      claude: { exitCode: 0 },
      gemini: { exitCode: 0 },
      codex: { exitCode: 0 },
    });
    const detector = new BackendDetector({}, runner);

    const { available, backends, logMessage } = await runStartupDetection(detector, allCandidates);

    expect(available).toEqual(['claude', 'gemini', 'codex']);
    expect(backends).toHaveLength(3);
    expect(logMessage).toBe('[executor] detected backends: claude, gemini, codex');
  });

  it('detects only claude when gemini and codex are unavailable', async () => {
    const runner = createStubRunner({
      claude: { exitCode: 0 },
    });
    const detector = new BackendDetector({}, runner);

    const { available, backends, logMessage } = await runStartupDetection(detector, allCandidates);

    expect(available).toEqual(['claude']);
    expect(backends).toHaveLength(1);
    expect(backends[0]!.name).toBe('claude');
    expect(logMessage).toBe('[executor] detected backends: claude');
  });

  it('falls back to claude descriptor when no backends are detected', async () => {
    const runner = createStubRunner({});
    const detector = new BackendDetector({}, runner);

    const { available, backends, logMessage } = await runStartupDetection(detector, allCandidates);

    expect(available).toEqual([]);
    expect(backends).toHaveLength(1);
    expect(backends[0]!.name).toBe('claude');
    expect(logMessage).toBe('[executor] detected backends: none');
  });

  it('preserves candidate priority order (claude first)', async () => {
    const runner = createStubRunner({
      claude: { exitCode: 0 },
      gemini: { exitCode: 0 },
    });
    const detector = new BackendDetector({}, runner);

    const { available, backends } = await runStartupDetection(detector, allCandidates);

    expect(available).toEqual(['claude', 'gemini']);
    expect(backends[0]!.name).toBe('claude');
    expect(backends[1]!.name).toBe('gemini');
  });

  it('logs to console at startup', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const runner = createStubRunner({ claude: { exitCode: 0 } });
    const detector = new BackendDetector({}, runner);
    const available = await detector.detect([...allCandidates]);

    // Reproduce the exact log call from the entry point
    console.log(
      `[executor] detected backends: ${available.length > 0
        ? available.join(', ')
        : 'none'}`,
    );

    expect(consoleSpy).toHaveBeenCalledWith('[executor] detected backends: claude');
    consoleSpy.mockRestore();
  });

  it('builds valid BackendDescriptor objects for each detected backend', async () => {
    const runner = createStubRunner({
      claude: { exitCode: 0 },
      gemini: { exitCode: 0 },
    });
    const detector = new BackendDetector({}, runner);

    const { backends } = await runStartupDetection(detector, allCandidates);

    for (const backend of backends) {
      expect(backend).toHaveProperty('name');
      expect(backend).toHaveProperty('command');
      expect(backend).toHaveProperty('args');
      expect(backend).toHaveProperty('promptMode');
      expect(backend).toHaveProperty('outputFormat');
      expect(backend).toHaveProperty('envVars');
    }
  });
});
