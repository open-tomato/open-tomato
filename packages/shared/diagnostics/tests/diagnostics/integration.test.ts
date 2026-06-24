import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import { DiagnosticsCollector } from '../../src/diagnostics/collector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJsonlFile(content: string): Record<string, unknown>[] {
  return content
    .trim()
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => JSON.parse(line) as Record<string, unknown>);
}

async function readJsonl(dir: string, filename: string): Promise<Record<string, unknown>[]> {
  const content = await readFile(join(dir, filename), 'utf8');
  return parseJsonlFile(content);
}

async function readTextFile(dir: string, filename: string): Promise<string> {
  return readFile(join(dir, filename), 'utf8');
}

function assertIsoTimestamp(value: unknown): void {
  expect(typeof value).toBe('string');
  expect(() => new Date(value as string).toISOString()).not.toThrow();
}

// ---------------------------------------------------------------------------
// Minimal orchestration cycle simulation
//
// Mirrors the call sequence in OrchestrationLoop.run() for one full iteration:
//   1. IterationStarted
//   2. recordPrompt
//   3. AgentLatency
//   4. Text (agent output event)
//   5. Complete (agent output event)
//   6. IterationDuration
//   7. LoopTerminated
//
// Additionally exercises hook-runs and errors collectors to verify all five
// JSONL files are written with the correct event shapes.
// ---------------------------------------------------------------------------

async function runMinimalOrchestrationCycle(collector: DiagnosticsCollector): Promise<void> {
  const sessionId = collector.currentSessionDir ?? '';
  const iterationId = 'iter-1';
  const hat = 'planner';
  const prompt = 'You are the planner hat. Pending events: [{"topic":"task.start"}]';

  // --- iteration boundary ---
  await collector.recordOrchestration({
    event: 'IterationStarted',
    iterationId,
    ts: '',
    sessionId,
  });

  // --- prompt log ---
  await collector.recordPrompt(hat, iterationId, prompt);

  // --- agent latency ---
  await collector.recordPerformance({
    event: 'AgentLatency',
    ms: 42,
    hat,
    iterationId,
    ts: '',
    sessionId,
  });

  // --- agent output: text event ---
  await collector.recordAgentOutput({
    event: 'Text',
    content: 'task.completed',
    ts: '',
    sessionId,
  });

  // --- agent output: complete event ---
  await collector.recordAgentOutput({
    event: 'Complete',
    inputTokens: 100,
    outputTokens: 50,
    ts: '',
    sessionId,
  });

  // --- iteration duration ---
  await collector.recordPerformance({
    event: 'IterationDuration',
    ms: 123,
    iterationId,
    ts: '',
    sessionId,
  });

  // --- hook run (simulated post-iteration hook) ---
  await collector.recordHookRun({
    event: 'HookRun',
    hookName: 'post-iteration',
    durationMs: 15,
    exitCode: 0,
    disposition: 'success',
    retryCount: 0,
    finalAttempt: true,
    ts: '',
    sessionId,
  });

  // --- loop terminated ---
  await collector.recordOrchestration({
    event: 'LoopTerminated',
    reason: 'terminal-event',
    exitCode: 0,
    ts: '',
    sessionId,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DiagnosticsCollector integration — minimal orchestration cycle', () => {
  let tmpDir: string;
  const savedEnv = process.env['RALPH_DIAGNOSTICS'];

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'diag-integration-'));
    DiagnosticsCollector._reset();
    process.env['RALPH_DIAGNOSTICS'] = '1';
  });

  afterEach(async () => {
    DiagnosticsCollector._reset();
    if (savedEnv === undefined) {
      delete process.env['RALPH_DIAGNOSTICS'];
    } else {
      process.env['RALPH_DIAGNOSTICS'] = savedEnv;
    }
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates a session directory under the base dir', async () => {
    const collector = DiagnosticsCollector.getInstance()!;
    await collector.init(tmpDir);

    expect(collector.currentSessionDir).not.toBeNull();
    expect(collector.currentSessionDir!.startsWith(tmpDir)).toBe(true);
  });

  it('orchestration.jsonl contains IterationStarted followed by LoopTerminated', async () => {
    const collector = DiagnosticsCollector.getInstance()!;
    await collector.init(tmpDir);
    await runMinimalOrchestrationCycle(collector);

    const records = await readJsonl(collector.currentSessionDir!, 'orchestration.jsonl');

    expect(records.length).toBeGreaterThanOrEqual(2);

    const iterationStarted = records.find(r => r['event'] === 'IterationStarted');
    expect(iterationStarted).toBeDefined();
    expect(iterationStarted!['iterationId']).toBe('iter-1');
    assertIsoTimestamp(iterationStarted!['ts']);

    const loopTerminated = records.find(r => r['event'] === 'LoopTerminated');
    expect(loopTerminated).toBeDefined();
    expect(loopTerminated!['reason']).toBe('terminal-event');
    expect(loopTerminated!['exitCode']).toBe(0);
    assertIsoTimestamp(loopTerminated!['ts']);
  });

  it('performance.jsonl contains AgentLatency and IterationDuration events', async () => {
    const collector = DiagnosticsCollector.getInstance()!;
    await collector.init(tmpDir);
    await runMinimalOrchestrationCycle(collector);

    const records = await readJsonl(collector.currentSessionDir!, 'performance.jsonl');

    const latency = records.find(r => r['event'] === 'AgentLatency');
    expect(latency).toBeDefined();
    expect(latency!['ms']).toBe(42);
    expect(latency!['hat']).toBe('planner');
    expect(latency!['iterationId']).toBe('iter-1');
    assertIsoTimestamp(latency!['ts']);

    const duration = records.find(r => r['event'] === 'IterationDuration');
    expect(duration).toBeDefined();
    expect(duration!['ms']).toBe(123);
    expect(duration!['iterationId']).toBe('iter-1');
    assertIsoTimestamp(duration!['ts']);
  });

  it('agent-output.jsonl contains Text then Complete events', async () => {
    const collector = DiagnosticsCollector.getInstance()!;
    await collector.init(tmpDir);
    await runMinimalOrchestrationCycle(collector);

    const records = await readJsonl(collector.currentSessionDir!, 'agent-output.jsonl');

    const textEvent = records.find(r => r['event'] === 'Text');
    expect(textEvent).toBeDefined();
    expect(textEvent!['content']).toBe('task.completed');
    assertIsoTimestamp(textEvent!['ts']);

    const completeEvent = records.find(r => r['event'] === 'Complete');
    expect(completeEvent).toBeDefined();
    expect(completeEvent!['inputTokens']).toBe(100);
    expect(completeEvent!['outputTokens']).toBe(50);
    assertIsoTimestamp(completeEvent!['ts']);

    // Text must appear before Complete
    const textIndex = records.indexOf(textEvent!);
    const completeIndex = records.indexOf(completeEvent!);
    expect(textIndex).toBeLessThan(completeIndex);
  });

  it('hook-runs.jsonl contains a successful HookRun event with correct shape', async () => {
    const collector = DiagnosticsCollector.getInstance()!;
    await collector.init(tmpDir);
    await runMinimalOrchestrationCycle(collector);

    const records = await readJsonl(collector.currentSessionDir!, 'hook-runs.jsonl');

    expect(records).toHaveLength(1);
    const hookRun = records[0];
    expect(hookRun['event']).toBe('HookRun');
    expect(hookRun['hookName']).toBe('post-iteration');
    expect(hookRun['durationMs']).toBe(15);
    expect(hookRun['exitCode']).toBe(0);
    expect(hookRun['disposition']).toBe('success');
    expect(hookRun['retryCount']).toBe(0);
    expect(hookRun['finalAttempt']).toBe(true);
    assertIsoTimestamp(hookRun['ts']);
  });

  it('prompt-log.md contains the hat name and iteration ID in the header', async () => {
    const collector = DiagnosticsCollector.getInstance()!;
    await collector.init(tmpDir);
    await runMinimalOrchestrationCycle(collector);

    const content = await readTextFile(collector.currentSessionDir!, 'prompt-log.md');
    expect(content).toContain('Hat: planner');
    expect(content).toContain('Iteration: iter-1');
    expect(content).toContain('You are the planner hat');
  });

  it('all JSONL records have a ts field injected by the writer', async () => {
    const collector = DiagnosticsCollector.getInstance()!;
    await collector.init(tmpDir);
    await runMinimalOrchestrationCycle(collector);

    const sessionDir = collector.currentSessionDir!;
    const files = [
      'orchestration.jsonl',
      'performance.jsonl',
      'agent-output.jsonl',
      'hook-runs.jsonl',
    ];

    for (const file of files) {
      const records = await readJsonl(sessionDir, file);
      for (const record of records) {
        assertIsoTimestamp(record['ts']);
      }
    }
  });

  it('errors.jsonl records a BackendError with correct shape', async () => {
    const collector = DiagnosticsCollector.getInstance()!;
    await collector.init(tmpDir);

    const sessionId = collector.currentSessionDir ?? '';
    await collector.recordError({
      event: 'BackendError',
      message: 'upstream model timeout',
      raw: { status: 503 },
      ts: '',
      sessionId,
    });

    const records = await readJsonl(collector.currentSessionDir!, 'errors.jsonl');

    expect(records).toHaveLength(1);
    const err = records[0];
    expect(err['event']).toBe('BackendError');
    expect(err['message']).toBe('upstream model timeout');
    expect(err['raw']).toEqual({ status: 503 });
    assertIsoTimestamp(err['ts']);
  });

  it('errors.jsonl records a ValidationFailure with correct shape', async () => {
    const collector = DiagnosticsCollector.getInstance()!;
    await collector.init(tmpDir);

    const sessionId = collector.currentSessionDir ?? '';
    await collector.recordError({
      event: 'ValidationFailure',
      message: 'hat config missing required field: subscriptions',
      raw: { received: {} },
      ts: '',
      sessionId,
    });

    const records = await readJsonl(collector.currentSessionDir!, 'errors.jsonl');

    expect(records).toHaveLength(1);
    const err = records[0];
    expect(err['event']).toBe('ValidationFailure');
    expect(err['message']).toBe('hat config missing required field: subscriptions');
    assertIsoTimestamp(err['ts']);
  });

  it('no JSONL files are created when RALPH_DIAGNOSTICS is not set', async () => {
    delete process.env['RALPH_DIAGNOSTICS'];
    DiagnosticsCollector._reset();

    const collector = DiagnosticsCollector.getInstance();
    expect(collector).toBeNull();

    // Confirm optional chaining on null is safe — returns undefined, no throw
    const result = collector?.recordOrchestration({
      event: 'IterationStarted',
      iterationId: 'iter-1',
      ts: '',
      sessionId: '',
    });
    expect(result).toBeUndefined();
  });

  it('multiple record calls in sequence produce individual JSONL lines', async () => {
    const collector = DiagnosticsCollector.getInstance()!;
    await collector.init(tmpDir);

    const sessionId = collector.currentSessionDir ?? '';

    await collector.recordOrchestration({ event: 'IterationStarted', iterationId: 'iter-1', ts: '', sessionId });
    await collector.recordOrchestration({ event: 'IterationStarted', iterationId: 'iter-2', ts: '', sessionId });
    await collector.recordOrchestration({ event: 'LoopTerminated', reason: 'done', exitCode: 0, ts: '', sessionId });

    const records = await readJsonl(collector.currentSessionDir!, 'orchestration.jsonl');

    expect(records).toHaveLength(3);
    expect(records[0]['iterationId']).toBe('iter-1');
    expect(records[1]['iterationId']).toBe('iter-2');
    expect(records[2]['event']).toBe('LoopTerminated');
  });
});
