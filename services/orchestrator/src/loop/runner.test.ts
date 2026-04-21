/**
 * @packageDocumentation
 * Tests for runLoop — covers hook block behavior, metadata accumulation,
 * and RPC lifecycle event publishing through RpcEventBus.
 */

import type { Db } from '../db/index.js';
import type { HookFireResult } from '../hooks/engine.js';
import type { RpcEvent } from '../rpc/types/index.js';
import type { ExecutorEvent, JobState } from '../types.js';
import type { RunnerContext } from './runner.js';
import type { WorkerClient, WorkerProcess } from '../workers/client.js';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RpcEventBus } from '../rpc/event-bus.js';
import { updateJobStatus } from '../store/jobs.js';

import { runLoop } from './runner.js';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../store/jobs.js', () => ({
  updateJobStatus: vi.fn().mockResolvedValue(undefined),
  updateJobTaskCounts: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../store/tasks.js', () => ({
  createTask: vi.fn().mockResolvedValue({ id: 'task-id-1' }),
  updateTask: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal notification client that records emitted events. */
function makeNotify() {
  const events: ExecutorEvent[] = [];
  return {
    events,
    async emitEvent(_jobId: string, _nodeId: string, event: ExecutorEvent) {
      events.push(event);
    },
    async requestApproval() {
      return { decision: 'granted' as const };
    },
  };
}

/** Creates a temp directory with PLAN.md and PROMPT.md. */
function makeWorkDir(planContent: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-block-test-'));
  fs.writeFileSync(path.join(dir, 'PLAN.md'), planContent, 'utf8');
  fs.writeFileSync(path.join(dir, 'PROMPT.md'), '# Prompt\nDo the task.', 'utf8');
  return dir;
}

/**
 * Makes a minimal HookEngine mock.
 * By default returns 'continue' for all phases; override `fireFn` to customise.
 */
function makeHookEngine(
  fireFn?: (phase: string, payload: unknown) => Promise<HookFireResult>,
) {
  return {
    fire: vi.fn().mockImplementation(
      fireFn ?? (async () => ({ metadata: {}, disposition: 'continue' as const })),
    ),
    recoverFromSuspend: vi.fn().mockResolvedValue(null),
    registerHooks: vi.fn(),
  };
}

/**
 * Builds a minimal RunnerContext for testing.
 * Returns the context and a reference to the stateUpdates array so tests can
 * assert on what was passed to onStateUpdate.
 */
function makeContext(
  workDir: string,
  notify: ReturnType<typeof makeNotify>,
  hookEngine?: ReturnType<typeof makeHookEngine>,
): { ctx: RunnerContext; stateUpdates: Array<Partial<JobState>> } {
  const stateUpdates: Array<Partial<JobState>> = [];

  const workerClient: WorkerClient = {
    workerId: 'test-worker',
    exec: vi.fn(),
    prepareWorkspace: vi.fn(),
    cleanWorkspace: vi.fn(),
    isHealthy: vi.fn().mockResolvedValue(true),
  };

  const ctx: RunnerContext = {
    jobId: 'test-job-id',
    nodeId: 'test-node-id',
    params: {
      jobId: 'test-job-id',
      branch: 'feature/test',
      planId: 'PLAN-1',
    },
    workDir,
    notify,
    db: {} as unknown as Db,
    workerClient,
    prereqTasksCount: 0,
    isPaused: () => false,
    isCancelled: () => false,
    waitForResume: () => new Promise(() => { /* never resolves in tests */ }),
    onChildSpawned: vi.fn(),
    onStateUpdate: (patch) => {
      stateUpdates.push(patch);
    },
    hookEngine: hookEngine as unknown as RunnerContext['hookEngine'],
  };

  return { ctx, stateUpdates };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const PLAN_WITH_ONE_TASK = '- [ ] Do something important\n';

describe('runLoop — disposition:block terminates with non-zero (blocked) status', () => {
  let workDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('terminates and sets status:blocked when pre.loop.start fires block', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const hookEngine = makeHookEngine(async (phase) => phase === 'pre.loop.start'
      ? { metadata: {}, disposition: 'block' }
      : { metadata: {}, disposition: 'continue' });
    const { ctx, stateUpdates } = makeContext(workDir, notify, hookEngine);

    await runLoop(ctx);

    // Loop resolved (terminated cleanly)
    expect(stateUpdates).toContainEqual(expect.objectContaining({ status: 'blocked' }));
    expect(notify.events).toContainEqual(
      expect.objectContaining({
        type: 'loop.cancelled',
        reason: expect.stringContaining('pre.loop.start'),
      }),
    );
    // Worker was never invoked — loop exited before any task execution
    expect(ctx.workerClient.exec).not.toHaveBeenCalled();
  });

  it('terminates and sets status:blocked when post.loop.start fires block', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const hookEngine = makeHookEngine(async (phase) => phase === 'post.loop.start'
      ? { metadata: {}, disposition: 'block' }
      : { metadata: {}, disposition: 'continue' });
    const { ctx, stateUpdates } = makeContext(workDir, notify, hookEngine);

    await runLoop(ctx);

    expect(stateUpdates).toContainEqual(expect.objectContaining({ status: 'blocked' }));
    expect(notify.events).toContainEqual(
      expect.objectContaining({
        type: 'loop.cancelled',
        reason: expect.stringContaining('post.loop.start'),
      }),
    );
    // loop.started was emitted because pre.loop.start passed
    expect(notify.events).toContainEqual(expect.objectContaining({ type: 'loop.started' }));
    expect(ctx.workerClient.exec).not.toHaveBeenCalled();
  });

  it('terminates and sets status:blocked when pre.iteration.start fires block', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const hookEngine = makeHookEngine(async (phase) => phase === 'pre.iteration.start'
      ? { metadata: {}, disposition: 'block' }
      : { metadata: {}, disposition: 'continue' });
    const { ctx, stateUpdates } = makeContext(workDir, notify, hookEngine);

    await runLoop(ctx);

    expect(stateUpdates).toContainEqual(expect.objectContaining({ status: 'blocked' }));
    expect(notify.events).toContainEqual(
      expect.objectContaining({
        type: 'loop.cancelled',
        reason: expect.stringContaining('pre.iteration.start'),
      }),
    );
    // Worker never executes — block fires before workerClient.exec
    expect(ctx.workerClient.exec).not.toHaveBeenCalled();
  });

  it('terminates and sets status:blocked when pre.plan.created fires block', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const hookEngine = makeHookEngine(async (phase) => phase === 'pre.plan.created'
      ? { metadata: {}, disposition: 'block' }
      : { metadata: {}, disposition: 'continue' });
    const { ctx, stateUpdates } = makeContext(workDir, notify, hookEngine);

    await runLoop(ctx);

    expect(stateUpdates).toContainEqual(expect.objectContaining({ status: 'blocked' }));
    expect(notify.events).toContainEqual(
      expect.objectContaining({
        type: 'loop.cancelled',
        reason: expect.stringContaining('pre.plan.created'),
      }),
    );
    expect(ctx.workerClient.exec).not.toHaveBeenCalled();
  });

  it('persists blocked status to the database on hook block', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const hookEngine = makeHookEngine(async (phase) => phase === 'pre.loop.start'
      ? { metadata: {}, disposition: 'block' }
      : { metadata: {}, disposition: 'continue' });
    const { ctx } = makeContext(workDir, notify, hookEngine);

    await runLoop(ctx);

    expect(updateJobStatus).toHaveBeenCalledWith(
      expect.anything(),
      'test-job-id',
      'blocked',
      expect.anything(),
    );
  });

  it('does not run any tasks after a block at loop startup', async () => {
    workDir = makeWorkDir('- [ ] Task A\n- [ ] Task B\n- [ ] Task C\n');
    const notify = makeNotify();
    const hookEngine = makeHookEngine(async (phase) => phase === 'pre.loop.start'
      ? { metadata: {}, disposition: 'block' }
      : { metadata: {}, disposition: 'continue' });
    const { ctx } = makeContext(workDir, notify, hookEngine);

    await runLoop(ctx);

    // No task.started events emitted — loop exited before iterating
    expect(notify.events.filter((e) => e.type === 'task.started')).toHaveLength(0);
    expect(ctx.workerClient.exec).not.toHaveBeenCalled();
  });

  it('emits exactly one loop.cancelled event on block', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const hookEngine = makeHookEngine(async (phase) => phase === 'pre.loop.start'
      ? { metadata: {}, disposition: 'block' }
      : { metadata: {}, disposition: 'continue' });
    const { ctx } = makeContext(workDir, notify, hookEngine);

    await runLoop(ctx);

    const cancelledEvents = notify.events.filter((e) => e.type === 'loop.cancelled');
    expect(cancelledEvents).toHaveLength(1);
  });
});

describe('runLoop — accumulated metadata is threaded through HookPayload', () => {
  let workDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('carries metadata returned by pre.loop.start into the post.loop.start payload', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();

    // Capture each payload as fire() is called so we can assert on them.
    const capturedPayloads: Array<{ phase: string; metadata: Record<string, unknown> }> = [];

    const hookEngine = makeHookEngine(async (phase, payload) => {
      const meta = (payload as { metadata: Record<string, unknown> }).metadata;
      capturedPayloads.push({ phase: phase as string, metadata: { ...meta } });

      if (phase === 'pre.loop.start') {
        // Return metadata that should be visible in all subsequent payloads.
        return { metadata: { seeded: true, source: 'pre.loop.start' }, disposition: 'continue' as const };
      }
      return { metadata: {}, disposition: 'continue' as const };
    });

    // Block at post.loop.start so the loop stops early — we only need to inspect
    // the two loop-start payloads to verify accumulation.
    const blockingEngine = {
      ...hookEngine,
      fire: vi.fn().mockImplementation(async (phase: string, payload: unknown) => {
        const meta = (payload as { metadata: Record<string, unknown> }).metadata;
        capturedPayloads.push({ phase, metadata: { ...meta } });

        if (phase === 'pre.loop.start') {
          return { metadata: { seeded: true, source: 'pre.loop.start' }, disposition: 'continue' as const };
        }
        if (phase === 'post.loop.start') {
          // Block here — the key assertion is that this payload already contains
          // the metadata returned by pre.loop.start.
          return { metadata: {}, disposition: 'block' as const };
        }
        return { metadata: {}, disposition: 'continue' as const };
      }),
    };

    const { ctx } = makeContext(workDir, notify, blockingEngine as unknown as ReturnType<typeof makeHookEngine>);
    await runLoop(ctx);

    const postLoopStartEntry = capturedPayloads.find((e) => e.phase === 'post.loop.start');
    expect(postLoopStartEntry).toBeDefined();
    // The payload for post.loop.start must include the metadata seeded by pre.loop.start.
    expect(postLoopStartEntry?.metadata).toMatchObject({ seeded: true, source: 'pre.loop.start' });
  });

  it('accumulates metadata across multiple phases and passes it to pre.iteration.start', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();

    const capturedPayloads: Array<{ phase: string; metadata: Record<string, unknown> }> = [];

    const engine = {
      recoverFromSuspend: vi.fn().mockResolvedValue(null),
      registerHooks: vi.fn(),
      fire: vi.fn().mockImplementation(async (phase: string, payload: unknown) => {
        const meta = (payload as { metadata: Record<string, unknown> }).metadata;
        capturedPayloads.push({ phase, metadata: { ...meta } });

        if (phase === 'pre.loop.start') {
          return { metadata: { step1: true }, disposition: 'continue' as const };
        }
        if (phase === 'post.loop.start') {
          return { metadata: { step2: true }, disposition: 'continue' as const };
        }
        if (phase === 'pre.iteration.start') {
          // Block so the test terminates cleanly after inspecting this payload.
          return { metadata: {}, disposition: 'block' as const };
        }
        return { metadata: {}, disposition: 'continue' as const };
      }),
    };

    const { ctx } = makeContext(workDir, notify, engine as unknown as ReturnType<typeof makeHookEngine>);
    await runLoop(ctx);

    const iterEntry = capturedPayloads.find((e) => e.phase === 'pre.iteration.start');
    expect(iterEntry).toBeDefined();
    // Metadata from both pre.loop.start and post.loop.start must be present.
    expect(iterEntry?.metadata).toMatchObject({ step1: true, step2: true });
  });

  it('uses recovered suspend-state metadata as the initial accumulated metadata', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();

    const capturedPayloads: Array<{ phase: string; metadata: Record<string, unknown> }> = [];

    const engine = {
      recoverFromSuspend: vi.fn().mockResolvedValue({
        phase: 'pre.iteration.start',
        hookName: 'test-hook',
        payload: { iteration: 1, hat: 'PLAN-1', events: [], metadata: { recovered: true, checkpoint: 42 } },
        suspendMode: 'WaitForResume',
        suspendedAt: new Date().toISOString(),
        retryCount: 1,
      }),
      registerHooks: vi.fn(),
      fire: vi.fn().mockImplementation(async (phase: string, payload: unknown) => {
        const meta = (payload as { metadata: Record<string, unknown> }).metadata;
        capturedPayloads.push({ phase, metadata: { ...meta } });

        if (phase === 'pre.loop.start') {
          return { metadata: {}, disposition: 'block' as const };
        }
        return { metadata: {}, disposition: 'continue' as const };
      }),
    };

    const { ctx } = makeContext(workDir, notify, engine as unknown as ReturnType<typeof makeHookEngine>);
    await runLoop(ctx);

    const preLoopEntry = capturedPayloads.find((e) => e.phase === 'pre.loop.start');
    expect(preLoopEntry).toBeDefined();
    // The recovered suspend-state metadata must be visible in the first phase payload.
    expect(preLoopEntry?.metadata).toMatchObject({ recovered: true, checkpoint: 42 });
  });
});

// ---------------------------------------------------------------------------
// RPC lifecycle event publishing
// ---------------------------------------------------------------------------

/**
 * Creates a mock WorkerProcess that completes with the given exit code.
 * stdout/stderr are empty readable streams that close immediately.
 */
function makeWorkerProcess(exitCode: number): WorkerProcess {
  return {
    stdout: new ReadableStream({ start(ctrl) { ctrl.close(); } }),
    stderr: new ReadableStream({ start(ctrl) { ctrl.close(); } }),
    exited: Promise.resolve(exitCode),
    kill: vi.fn(),
  };
}

/**
 * Builds a RunnerContext that includes an RpcEventBus and records published events.
 * Returns the context, state updates, and the collected RPC events.
 */
function makeContextWithBus(
  workDir: string,
  notify: ReturnType<typeof makeNotify>,
  opts?: {
    isCancelled?: () => boolean;
    workerExitCode?: number;
  },
): { ctx: RunnerContext; stateUpdates: Array<Partial<JobState>>; rpcEvents: RpcEvent[] } {
  const stateUpdates: Array<Partial<JobState>> = [];
  const rpcEvents: RpcEvent[] = [];
  const rpcBus = new RpcEventBus();
  rpcBus.subscribe((event) => rpcEvents.push(event));

  const exitCode = opts?.workerExitCode ?? 0;

  const workerClient: WorkerClient = {
    workerId: 'test-worker',
    exec: vi.fn().mockResolvedValue(makeWorkerProcess(exitCode)),
    prepareWorkspace: vi.fn(),
    cleanWorkspace: vi.fn(),
    isHealthy: vi.fn().mockResolvedValue(true),
  };

  const ctx: RunnerContext = {
    jobId: 'test-job-id',
    nodeId: 'test-node-id',
    params: {
      jobId: 'test-job-id',
      branch: 'feature/test',
      planId: 'PLAN-1',
    },
    workDir,
    notify,
    db: {} as unknown as Db,
    workerClient,
    prereqTasksCount: 0,
    isPaused: () => false,
    isCancelled: opts?.isCancelled ?? (() => false),
    waitForResume: () => new Promise(() => { /* never resolves */ }),
    onChildSpawned: vi.fn(),
    onStateUpdate: (patch) => { stateUpdates.push(patch); },
    rpcBus,
  };

  return { ctx, stateUpdates, rpcEvents };
}

describe('runLoop — RPC lifecycle events through RpcEventBus', () => {
  let workDir: string;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { if (workDir) fs.rmSync(workDir, { recursive: true, force: true }); });

  it('publishes loop_started when the loop begins', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify);

    await runLoop(ctx);

    const started = rpcEvents.find((e) => e.event === 'loop_started');
    expect(started).toBeDefined();
    expect(started!.data).toMatchObject({
      prompt: 'PLAN-1',
      hatId: 'PLAN-1',
      maxIterations: 1,
    });
    expect(started!.data).toHaveProperty('timestamp');
  });

  it('publishes iteration_start and iteration_end for a successful task', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify);

    await runLoop(ctx);

    const iterStart = rpcEvents.find((e) => e.event === 'iteration_start');
    expect(iterStart).toBeDefined();
    expect(iterStart!.data).toMatchObject({ index: 0, hatId: 'PLAN-1' });

    const iterEnd = rpcEvents.find((e) => e.event === 'iteration_end');
    expect(iterEnd).toBeDefined();
    expect(iterEnd!.data).toMatchObject({ index: 0 });
    expect(iterEnd!.data).toHaveProperty('durationMs');
  });

  it('publishes loop_terminated with reason "completed" on normal completion', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify);

    await runLoop(ctx);

    const terminated = rpcEvents.find((e) => e.event === 'loop_terminated');
    expect(terminated).toBeDefined();
    expect(terminated!.data).toMatchObject({
      reason: 'completed',
      totalIterations: 1,
    });
  });

  it('publishes loop_terminated with reason "cancelled" when cancelled between tasks', async () => {
    let callCount = 0;
    workDir = makeWorkDir('- [ ] Task A\n- [ ] Task B\n');
    const notify = makeNotify();
    // Cancel after the first task completes (on second check)
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify, {
      isCancelled: () => {
        callCount++;
        // First call: not cancelled (enters loop). Second call: still not (post-task check).
        // Third call: cancelled (top of next iteration).
        return callCount >= 3;
      },
    });

    await runLoop(ctx);

    const terminated = rpcEvents.find((e) => e.event === 'loop_terminated');
    expect(terminated).toBeDefined();
    expect(terminated!.data).toMatchObject({ reason: 'aborted' });
    expect(terminated!.data).toHaveProperty('message');
  });

  it('publishes iteration_end and loop_terminated with reason "error" on task failure', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify, {
      workerExitCode: 1,
    });

    await runLoop(ctx);

    const iterEnd = rpcEvents.find((e) => e.event === 'iteration_end');
    expect(iterEnd).toBeDefined();
    expect(iterEnd!.data).toMatchObject({ index: 0 });

    const terminated = rpcEvents.find((e) => e.event === 'loop_terminated');
    expect(terminated).toBeDefined();
    expect(terminated!.data).toMatchObject({
      reason: 'error',
      totalIterations: 1,
    });
    expect(terminated!.data).toHaveProperty('message');
  });

  it('publishes correct event sequence for a multi-task successful run', async () => {
    workDir = makeWorkDir('- [ ] Task A\n- [ ] Task B\n');
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify);

    await runLoop(ctx);

    const eventNames = rpcEvents.map((e) => e.event);
    expect(eventNames).toEqual([
      'loop_started',
      'hat_changed',
      'task_counts_updated',     // initial counts
      'task_status_changed',     // task A: pending → running
      'task_counts_updated',     // task A started
      'iteration_start',         // iteration 0
      'task_status_changed',     // task A: running → done
      'task_counts_updated',     // task A done
      'iteration_end',           // iteration 0
      'task_status_changed',     // task B: pending → running
      'task_counts_updated',     // task B started
      'iteration_start',         // iteration 1
      'task_status_changed',     // task B: running → done
      'task_counts_updated',     // task B done
      'iteration_end',           // iteration 1
      'loop_terminated',
    ]);
  });

  it('does not throw when rpcBus is undefined', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    // Use the original makeContext (no rpcBus) but provide a working exec mock
    const { ctx } = makeContext(workDir, notify);
    (ctx.workerClient.exec as ReturnType<typeof vi.fn>).mockResolvedValue(makeWorkerProcess(0));

    // Should complete without error — no rpcBus means no-op
    await expect(runLoop(ctx)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// RPC orchestration events (hat_changed, task_status_changed, task_counts_updated)
// ---------------------------------------------------------------------------

describe('runLoop — RPC orchestration events', () => {
  let workDir: string;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { if (workDir) fs.rmSync(workDir, { recursive: true, force: true }); });

  it('publishes hat_changed with the initial hat at loop start', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify);

    await runLoop(ctx);

    const hatChanged = rpcEvents.find((e) => e.event === 'hat_changed');
    expect(hatChanged).toBeDefined();
    expect(hatChanged!.data).toMatchObject({ newHatId: 'PLAN-1' });
    expect(hatChanged!.data).toHaveProperty('timestamp');
    // previousHatId should be absent for the initial assignment
    expect((hatChanged!.data as Record<string, unknown>).previousHatId).toBeUndefined();
  });

  it('publishes task_counts_updated with initial counts at loop start', async () => {
    workDir = makeWorkDir('- [ ] Task A\n- [ ] Task B\n');
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify);

    await runLoop(ctx);

    const countEvents = rpcEvents.filter((e) => e.event === 'task_counts_updated');
    // First counts event should reflect all tasks pending
    expect(countEvents[0]!.data).toMatchObject({
      pending: 2,
      inProgress: 0,
      completed: 0,
      failed: 0,
    });
  });

  it('publishes task_status_changed when a task starts (pending → running)', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify);

    await runLoop(ctx);

    const statusEvents = rpcEvents.filter((e) => e.event === 'task_status_changed');
    // First status change: pending → running
    expect(statusEvents[0]!.data).toMatchObject({
      taskId: 'task-id-1',
      previousStatus: 'pending',
      newStatus: 'running',
    });
  });

  it('publishes task_status_changed when a task succeeds (running → done)', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify);

    await runLoop(ctx);

    const statusEvents = rpcEvents.filter((e) => e.event === 'task_status_changed');
    // Second status change: running → done
    expect(statusEvents[1]!.data).toMatchObject({
      taskId: 'task-id-1',
      previousStatus: 'running',
      newStatus: 'done',
    });
  });

  it('publishes task_status_changed when a task fails (running → failed)', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify, {
      workerExitCode: 1,
    });

    await runLoop(ctx);

    const statusEvents = rpcEvents.filter((e) => e.event === 'task_status_changed');
    expect(statusEvents[1]!.data).toMatchObject({
      taskId: 'task-id-1',
      previousStatus: 'running',
      newStatus: 'failed',
    });
  });

  it('publishes task_counts_updated with correct counts after task completion', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify);

    await runLoop(ctx);

    const countEvents = rpcEvents.filter((e) => e.event === 'task_counts_updated');
    // Initial: pending=1, inProgress=0
    expect(countEvents[0]!.data).toMatchObject({ pending: 1, inProgress: 0, completed: 0, failed: 0 });
    // Task started: pending=0, inProgress=1
    expect(countEvents[1]!.data).toMatchObject({ pending: 0, inProgress: 1, completed: 0, failed: 0 });
    // Task done: pending=0, inProgress=0, completed=1
    expect(countEvents[2]!.data).toMatchObject({ pending: 0, inProgress: 0, completed: 1, failed: 0 });
  });

  it('publishes task_counts_updated with correct counts after task failure', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify, {
      workerExitCode: 1,
    });

    await runLoop(ctx);

    const countEvents = rpcEvents.filter((e) => e.event === 'task_counts_updated');
    // After failure: pending=0, inProgress=0, failed=1
    expect(countEvents[2]!.data).toMatchObject({ pending: 0, inProgress: 0, completed: 0, failed: 1 });
  });

  it('publishes task_status_changed (running → blocked) when cancelled during task', async () => {
    workDir = makeWorkDir(PLAN_WITH_ONE_TASK);
    const notify = makeNotify();
    // Cancel after the task finishes (post-task check)
    let checkCount = 0;
    const { ctx, rpcEvents } = makeContextWithBus(workDir, notify, {
      isCancelled: () => {
        checkCount++;
        // First check: not cancelled (enters loop). Second check (post-task): cancelled.
        return checkCount >= 2;
      },
    });

    await runLoop(ctx);

    const statusEvents = rpcEvents.filter((e) => e.event === 'task_status_changed');
    // First: pending → running, Second: running → blocked
    expect(statusEvents).toHaveLength(2);
    expect(statusEvents[1]!.data).toMatchObject({
      previousStatus: 'running',
      newStatus: 'blocked',
    });
  });
});
