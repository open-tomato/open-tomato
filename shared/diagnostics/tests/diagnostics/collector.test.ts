import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import { DiagnosticsCollector } from '../../src/diagnostics/collector.js';

describe('DiagnosticsCollector', () => {
  let tmpDir: string;
  const originalEnv = process.env['RALPH_DIAGNOSTICS'];

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'collector-test-'));
    DiagnosticsCollector._reset();
  });

  afterEach(async () => {
    DiagnosticsCollector._reset();
    if (originalEnv === undefined) {
      delete process.env['RALPH_DIAGNOSTICS'];
    } else {
      process.env['RALPH_DIAGNOSTICS'] = originalEnv;
    }
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('isEnabled()', () => {
    it('returns false when env var is absent', () => {
      delete process.env['RALPH_DIAGNOSTICS'];
      expect(DiagnosticsCollector.isEnabled()).toBe(false);
    });

    it('returns false when env var is not "1"', () => {
      process.env['RALPH_DIAGNOSTICS'] = '0';
      expect(DiagnosticsCollector.isEnabled()).toBe(false);
    });

    it('returns true when env var is "1"', () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      expect(DiagnosticsCollector.isEnabled()).toBe(true);
    });
  });

  describe('getInstance()', () => {
    it('returns null when diagnostics are disabled', () => {
      delete process.env['RALPH_DIAGNOSTICS'];
      expect(DiagnosticsCollector.getInstance()).toBeNull();
    });

    it('returns an instance when diagnostics are enabled', () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const instance = DiagnosticsCollector.getInstance();
      expect(instance).toBeInstanceOf(DiagnosticsCollector);
    });

    it('returns the same instance on repeated calls (singleton)', () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const a = DiagnosticsCollector.getInstance();
      const b = DiagnosticsCollector.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('init()', () => {
    it('creates a session directory', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      await collector.init(tmpDir);
      expect(collector.currentSessionDir).not.toBeNull();
      expect(collector.currentSessionDir!.startsWith(tmpDir)).toBe(true);
    });

    it('is idempotent — second call does not change sessionDir', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      await collector.init(tmpDir);
      const firstDir = collector.currentSessionDir;
      await collector.init(tmpDir);
      expect(collector.currentSessionDir).toBe(firstDir);
    });
  });

  describe('recordOrchestration()', () => {
    it('writes correct event shape to orchestration.jsonl', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      await collector.init(tmpDir);

      await collector.recordOrchestration({
        event: 'HatSelected',
        hat: 'planner',
        iterationId: 'iter-1',
        ts: '',
        sessionId: '',
      });

      const filePath = join(collector.currentSessionDir!, 'orchestration.jsonl');
      const content = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(content.trim()) as Record<string, unknown>;

      expect(parsed['event']).toBe('HatSelected');
      expect(parsed['hat']).toBe('planner');
      expect(parsed['iterationId']).toBe('iter-1');
      expect(typeof parsed['ts']).toBe('string');
    });

    it('is a no-op before init()', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      // do NOT call init()
      await expect(
        collector.recordOrchestration({
          event: 'LoopTerminated',
          reason: 'done',
          exitCode: 0,
          ts: '',
          sessionId: '',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('recordError()', () => {
    it('writes correct event shape to errors.jsonl', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      await collector.init(tmpDir);

      await collector.recordError({
        event: 'ParseError',
        message: 'unexpected token',
        raw: '{ bad json',
        ts: '',
        sessionId: '',
      });

      const filePath = join(collector.currentSessionDir!, 'errors.jsonl');
      const content = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(content.trim()) as Record<string, unknown>;

      expect(parsed['event']).toBe('ParseError');
      expect(parsed['message']).toBe('unexpected token');
      expect(parsed['raw']).toBe('{ bad json');
    });

    it('is a no-op before init()', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      await expect(
        collector.recordError({
          event: 'Timeout',
          message: 'timed out',
          ts: '',
          sessionId: '',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('write error suppression', () => {
    const badWriter = { append: async () => { throw new Error('disk full'); } };

    it('recordOrchestration does not throw when writer fails', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      await collector.init(tmpDir);
      (collector as unknown as Record<string, unknown>)['orchestrationWriter'] = badWriter;

      await expect(
        collector.recordOrchestration({
          event: 'IterationStarted',
          iterationId: 'x',
          ts: '',
          sessionId: '',
        }),
      ).resolves.toBeUndefined();
    });

    it('recordAgentOutput does not throw when writer fails', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      await collector.init(tmpDir);
      (collector as unknown as Record<string, unknown>)['agentOutputWriter'] = badWriter;

      await expect(
        collector.recordAgentOutput({
          event: 'Text',
          content: 'hello',
          ts: '',
          sessionId: '',
        }),
      ).resolves.toBeUndefined();
    });

    it('recordPerformance does not throw when writer fails', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      await collector.init(tmpDir);
      (collector as unknown as Record<string, unknown>)['performanceWriter'] = badWriter;

      await expect(
        collector.recordPerformance({
          event: 'IterationDuration',
          ms: 100,
          iterationId: 'x',
          ts: '',
          sessionId: '',
        }),
      ).resolves.toBeUndefined();
    });

    it('recordError does not throw when writer fails', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      await collector.init(tmpDir);
      (collector as unknown as Record<string, unknown>)['errorsWriter'] = badWriter;

      await expect(
        collector.recordError({
          event: 'BackendError',
          message: 'service unavailable',
          ts: '',
          sessionId: '',
        }),
      ).resolves.toBeUndefined();
    });

    it('recordHookRun does not throw when writer fails', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      await collector.init(tmpDir);
      (collector as unknown as Record<string, unknown>)['hookRunsWriter'] = badWriter;

      await expect(
        collector.recordHookRun({
          event: 'HookRun',
          hookName: 'post-save',
          durationMs: 50,
          exitCode: 0,
          disposition: 'success',
          retryCount: 0,
          finalAttempt: true,
          ts: '',
          sessionId: '',
        }),
      ).resolves.toBeUndefined();
    });

    it('recordPrompt does not throw when writer fails', async () => {
      process.env['RALPH_DIAGNOSTICS'] = '1';
      const collector = DiagnosticsCollector.getInstance()!;
      await collector.init(tmpDir);
      (collector as unknown as Record<string, unknown>)['promptLogWriter'] = {
        append: async () => { throw new Error('disk full'); },
      };

      await expect(
        collector.recordPrompt('planner', 'iter-1', 'some prompt text'),
      ).resolves.toBeUndefined();
    });
  });
});
