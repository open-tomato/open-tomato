/**
 * @packageDocumentation
 * Unit tests for HookTelemetry.
 */

import type { HookResult } from './types.js';

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, it, expect, beforeEach } from 'vitest';

import { HookTelemetry } from './telemetry.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<HookResult> = {}): HookResult {
  return {
    hookName: 'test-hook',
    phase: 'pre.loop.start',
    exitCode: 0,
    stdout: '',
    stderr: '',
    durationMs: 42,
    disposition: 'continue',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HookTelemetry', () => {
  let tmpDir: string;
  let telemetry: HookTelemetry;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'hook-telemetry-test-'));
    telemetry = new HookTelemetry(tmpDir);
  });

  async function cleanUp() {
    await rm(tmpDir, { recursive: true, force: true });
  }

  describe('logRun', () => {
    it('appends a JSONL record with required fields', async () => {
      const result = makeResult();
      await telemetry.logRun(result);

      const raw = await readFile(path.join(tmpDir, 'hook-runs.jsonl'), 'utf8');
      const record = JSON.parse(raw.trim());

      expect(record.hookName).toBe('test-hook');
      expect(record.phase).toBe('pre.loop.start');
      expect(record.exitCode).toBe(0);
      expect(record.durationMs).toBe(42);
      expect(record.disposition).toBe('continue');
      expect(typeof record.timestamp).toBe('string');
      expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      await cleanUp();
    });

    it('truncates stderr to 512 characters', async () => {
      const longStderr = 'x'.repeat(1000);
      const result = makeResult({ stderr: longStderr });
      await telemetry.logRun(result);

      const raw = await readFile(path.join(tmpDir, 'hook-runs.jsonl'), 'utf8');
      const record = JSON.parse(raw.trim());

      expect(record.stderr).toHaveLength(512);
      expect(record.stderr).toBe('x'.repeat(512));

      await cleanUp();
    });

    it('preserves short stderr without modification', async () => {
      const result = makeResult({ stderr: 'short error' });
      await telemetry.logRun(result);

      const raw = await readFile(path.join(tmpDir, 'hook-runs.jsonl'), 'utf8');
      const record = JSON.parse(raw.trim());

      expect(record.stderr).toBe('short error');

      await cleanUp();
    });

    it('appends multiple records as separate JSONL lines', async () => {
      await telemetry.logRun(makeResult({ hookName: 'hook-a' }));
      await telemetry.logRun(makeResult({ hookName: 'hook-b' }));

      const raw = await readFile(path.join(tmpDir, 'hook-runs.jsonl'), 'utf8');
      const lines = raw.trim().split('\n');

      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).hookName).toBe('hook-a');
      expect(JSON.parse(lines[1]).hookName).toBe('hook-b');

      await cleanUp();
    });

    it('creates the log directory if it does not exist', async () => {
      const nestedDir = path.join(tmpDir, 'nested', 'logs');
      const nestedTelemetry = new HookTelemetry(nestedDir);

      await nestedTelemetry.logRun(makeResult());

      const raw = await readFile(path.join(nestedDir, 'hook-runs.jsonl'), 'utf8');
      expect(raw.trim().length).toBeGreaterThan(0);

      await cleanUp();
    });
  });

  describe('readRuns', () => {
    it('returns empty array when log file does not exist', async () => {
      const runs = await telemetry.readRuns();
      expect(runs).toEqual([]);
      await cleanUp();
    });

    it('returns all logged runs in chronological order', async () => {
      await telemetry.logRun(makeResult({ hookName: 'first' }));
      await telemetry.logRun(makeResult({ hookName: 'second' }));

      const runs = await telemetry.readRuns();

      expect(runs).toHaveLength(2);
      expect(runs[0].hookName).toBe('first');
      expect(runs[1].hookName).toBe('second');

      await cleanUp();
    });

    it('returns only the last N records when limit is specified', async () => {
      await telemetry.logRun(makeResult({ hookName: 'a' }));
      await telemetry.logRun(makeResult({ hookName: 'b' }));
      await telemetry.logRun(makeResult({ hookName: 'c' }));

      const runs = await telemetry.readRuns(2);

      expect(runs).toHaveLength(2);
      expect(runs[0].hookName).toBe('b');
      expect(runs[1].hookName).toBe('c');

      await cleanUp();
    });

    it('returns all records when limit exceeds total count', async () => {
      await telemetry.logRun(makeResult({ hookName: 'only' }));

      const runs = await telemetry.readRuns(100);

      expect(runs).toHaveLength(1);
      expect(runs[0].hookName).toBe('only');

      await cleanUp();
    });
  });
});
