/**
 * Integration tests for the simulator loop dependency.
 *
 * Each test suite uses `vi.isolateModules` to import the simulator with
 * specific `SIMULATOR_*` env vars, since those constants are evaluated at
 * module load time.  `SIMULATOR_TASK_INTERVAL_MS=1` keeps the suite fast.
 */

import type { ExecutorEvent } from '../types.js';

import fs from 'fs';
import process from 'node:process';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal in-memory notification client that records all emitted events. */
function makeNotify() {
  const events: ExecutorEvent[] = [];
  return {
    events,
    async emitEvent(_jobId: string, _nodeId: string, event: ExecutorEvent) {
      events.push(event);
      return {};
    },
    async requestApproval() {
      return { decision: 'granted' as const };
    },
  };
}

/** Minimal JobParams for testing. */
function makeParams(overrides: Record<string, unknown> = {}) {
  return {
    jobId: 'test-job-id',
    branch: 'feature/test',
    planId: 'TEST-1',
    ...overrides,
  };
}

/** Creates a temp working directory with a PLAN.md. */
function makeTmpWorkDir(planContent: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-test-'));
  fs.writeFileSync(path.join(dir, 'PLAN.md'), planContent, 'utf8');
  // PROMPT.md is required by runner but not by simulator — skip it
  return dir;
}

function removeTmpDir(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Waits until `predicate()` returns true, polling every 10 ms (max 3 s). */
async function waitUntil(predicate: () => boolean, maxMs = 3_000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > maxMs) throw new Error('waitUntil timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

// ---------------------------------------------------------------------------
// Import helper — re-imports simulator with given env vars set
// ---------------------------------------------------------------------------

async function importSimulator(env: Record<string, string> = {}) {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  // Reset module cache so simulator re-evaluates its module-level constants
  vi.resetModules();
  const mod = await import('./simulator.js');
  for (const k of Object.keys(env)) delete process.env[k];
  return mod;
}

// ---------------------------------------------------------------------------
// Suite: happy path — all tasks complete
// ---------------------------------------------------------------------------

describe('simulator — happy path', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = makeTmpWorkDir(
      '- [ ] Task one\n- [ ] Task two\n- [ ] Task three\n',
    );
  });

  afterEach(() => removeTmpDir(workDir));

  it('completes all tasks and emits loop.done', async () => {
    const { createLoopDependency } = await importSimulator({
      SIMULATOR_TASK_INTERVAL_MS: '1',
    });

    const notify = makeNotify();
    const dep = createLoopDependency(makeParams(), workDir, notify, 'node-1');

    await dep.dependency.start();
    await waitUntil(() => dep.getState().status === 'completed');

    const types = notify.events.map((e) => e.type);
    expect(types).toContain('loop.started');
    expect(types).toContain('task.started');
    expect(types).toContain('task.done');
    expect(types).toContain('loop.done');

    const state = dep.getState();
    expect(state.tasksCompleted).toBe(3);
    expect(state.tasksFailed).toBe(0);
    expect(state.completedAt).not.toBeNull();
  });

  it('marks tasks done in PLAN_TRACKER.md', async () => {
    const { createLoopDependency } = await importSimulator({
      SIMULATOR_TASK_INTERVAL_MS: '1',
    });

    const notify = makeNotify();
    const dep = createLoopDependency(makeParams(), workDir, notify, 'node-1');

    await dep.dependency.start();
    await waitUntil(() => dep.getState().status === 'completed');

    const tracker = fs.readFileSync(path.join(workDir, 'PLAN_TRACKER.md'), 'utf8');
    expect(tracker).not.toContain('- [ ]');
    expect(tracker.match(/- \[x\]/g)?.length).toBe(3);
  });

  it('emits task.started and task.done for each task', async () => {
    const { createLoopDependency } = await importSimulator({
      SIMULATOR_TASK_INTERVAL_MS: '1',
    });

    const notify = makeNotify();
    const dep = createLoopDependency(makeParams(), workDir, notify, 'node-1');

    await dep.dependency.start();
    await waitUntil(() => dep.getState().status === 'completed');

    const started = notify.events.filter((e) => e.type === 'task.started');
    const done = notify.events.filter((e) => e.type === 'task.done');
    expect(started).toHaveLength(3);
    expect(done).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Suite: cancel
// ---------------------------------------------------------------------------

describe('simulator — cancel', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = makeTmpWorkDir('- [ ] Task one\n- [ ] Task two\n');
  });

  afterEach(() => removeTmpDir(workDir));

  it('transitions to cancelled after stop()', async () => {
    const { createLoopDependency } = await importSimulator({
      SIMULATOR_TASK_INTERVAL_MS: '500', // long enough to cancel mid-run
    });

    const notify = makeNotify();
    const dep = createLoopDependency(makeParams(), workDir, notify, 'node-1');

    await dep.dependency.start();
    // Cancel quickly before the first task finishes
    await dep.dependency.stop();

    await waitUntil(() => dep.getState().status === 'cancelled');

    expect(dep.getState().status).toBe('cancelled');
    const types = notify.events.map((e) => e.type);
    expect(types).toContain('loop.cancelled');
  });
});

// ---------------------------------------------------------------------------
// Suite: pause / resume
// ---------------------------------------------------------------------------

describe('simulator — pause and resume', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = makeTmpWorkDir('- [ ] Task one\n- [ ] Task two\n');
  });

  afterEach(() => removeTmpDir(workDir));

  it('pauses between tasks and resumes to completion', async () => {
    const { createLoopDependency } = await importSimulator({
      SIMULATOR_TASK_INTERVAL_MS: '10',
    });

    const notify = makeNotify();
    const dep = createLoopDependency(makeParams(), workDir, notify, 'node-1');

    await dep.dependency.start();

    // Wait for the first task to complete then pause
    await waitUntil(() => dep.getState().tasksCompleted >= 1);
    await dep.dependency.pause?.();
    // The loop checks the pause flag between tasks — wait for it to take effect
    await waitUntil(() => dep.getState().status === 'paused');
    expect(dep.getState().status).toBe('paused');

    // Resume and wait for full completion
    await dep.dependency.resume?.();
    await waitUntil(() => dep.getState().status === 'completed');

    expect(dep.getState().tasksCompleted).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Suite: FAIL_AFTER — task-exit failure injection
// ---------------------------------------------------------------------------

describe('simulator — FAIL_AFTER', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = makeTmpWorkDir(
      '- [ ] Task one\n- [ ] Task two\n- [ ] Task three\n',
    );
  });

  afterEach(() => removeTmpDir(workDir));

  it('fails after the configured number of completed tasks', async () => {
    const { createLoopDependency } = await importSimulator({
      SIMULATOR_TASK_INTERVAL_MS: '1',
      SIMULATOR_FAIL_AFTER: '1',
      SIMULATOR_FAIL_REASON: 'task-exit',
    });

    const notify = makeNotify();
    const dep = createLoopDependency(makeParams(), workDir, notify, 'node-1');

    await dep.dependency.start();
    await waitUntil(() => dep.getState().status === 'blocked');

    const state = dep.getState();
    expect(state.status).toBe('blocked');
    expect(state.tasksCompleted).toBe(1);
    expect(state.tasksFailed).toBe(1);

    const types = notify.events.map((e) => e.type);
    expect(types).toContain('task.failed');
    expect(types).toContain('loop.cancelled');
  });
});

// ---------------------------------------------------------------------------
// Suite: FAIL_REASON=workspace
// ---------------------------------------------------------------------------

describe('simulator — FAIL_REASON=workspace', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = makeTmpWorkDir('- [ ] Task one\n');
  });

  afterEach(() => removeTmpDir(workDir));

  it('rejects onStart and emits loop.cancelled', async () => {
    const { createLoopDependency } = await importSimulator({
      SIMULATOR_TASK_INTERVAL_MS: '1',
      SIMULATOR_FAIL_REASON: 'workspace',
    });

    const notify = makeNotify();
    const dep = createLoopDependency(makeParams(), workDir, notify, 'node-1');

    await expect(dep.dependency.start()).rejects.toThrow('workspace');

    const types = notify.events.map((e) => e.type);
    expect(types).toContain('loop.cancelled');
    expect(dep.getState().status).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// Suite: PLAN.md missing
// ---------------------------------------------------------------------------

describe('simulator — missing PLAN.md', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-noplan-'));
    // intentionally no PLAN.md
  });

  afterEach(() => removeTmpDir(workDir));

  it('transitions to failed and emits loop.cancelled', async () => {
    const { createLoopDependency } = await importSimulator({
      SIMULATOR_TASK_INTERVAL_MS: '1',
    });

    const notify = makeNotify();
    const dep = createLoopDependency(makeParams(), workDir, notify, 'node-1');

    await dep.dependency.start();
    await waitUntil(() => dep.getState().status === 'failed');

    const types = notify.events.map((e) => e.type);
    expect(types).toContain('loop.cancelled');
  });
});
