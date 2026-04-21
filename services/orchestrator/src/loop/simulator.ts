/**
 * @packageDocumentation
 * Simulation-mode loop dependency — identical external interface to `dependency.ts`
 * but iterates plan tasks with configurable timing and no `claude` invocation.
 *
 * Enabled at service startup via `--dry-run` flag or `DRY_RUN=true` env var.
 * Timing and failure injection are controlled by `SIMULATOR_*` env vars.
 */

import type { LoopDependency } from './dependency.js';
import type { Db } from '../db/index.js';
import type { NotificationClient } from '../notifications/client.js';
import type { RpcEventBus } from '../rpc/event-bus.js';
import type { JobParams, JobState } from '../types.js';
import type { WorkerClient } from '../workers/client.js';

import fs from 'fs';
import process from 'node:process';
import path from 'path';

import { createDependency } from '@open-tomato/service-core';

import { parsePrerequisites } from '../prerequisites/parser.js';

import { countTasks, findNextTask, updateTrackerLine } from './plan.js';

// ---------------------------------------------------------------------------
// Simulator config (read once at module load)
// ---------------------------------------------------------------------------

/**
 * Fixed time to wait between tasks (ms).
 * If SIMULATOR_TOTAL_MS is also set, SIMULATOR_TOTAL_MS takes precedence
 * and the per-task interval is derived from the plan's task count.
 */
const TASK_INTERVAL_MS = Number(process.env['SIMULATOR_TASK_INTERVAL_MS'] ?? 3_000);

/**
 * Total simulated run-time (ms) to divide equally among all tasks.
 * Overrides SIMULATOR_TASK_INTERVAL_MS when set.
 */
const TOTAL_MS = process.env['SIMULATOR_TOTAL_MS']
  ? Number(process.env['SIMULATOR_TOTAL_MS'])
  : null;

/**
 * Number of tasks that complete successfully before a failure is injected.
 * 0 (default) means no failure is ever injected.
 */
const FAIL_AFTER = Number(process.env['SIMULATOR_FAIL_AFTER'] ?? 0);

/**
 * Which failure scenario to simulate.
 *
 *   task-exit    — task emits task.failed with exitCode=1 then loop.cancelled
 *                  (fires after FAIL_AFTER successful tasks)
 *   workspace    — workspace preparation throws during onStart (FAIL_AFTER ignored)
 *   prerequisites — prerequisites check fails during onStart (FAIL_AFTER ignored)
 */
type FailReason = 'task-exit' | 'workspace' | 'prerequisites';
const FAIL_REASON = (process.env['SIMULATOR_FAIL_REASON'] ?? 'task-exit') as FailReason;

// ---------------------------------------------------------------------------
// Internal sim loop
// ---------------------------------------------------------------------------

interface SimContext {
  jobId: string;
  nodeId: string;
  params: JobParams;
  workDir: string;
  notify: NotificationClient;
  /** Resolved ms to wait per task for this run. */
  taskIntervalMs: number;
  prereqTasksCount: number;
  isPaused(): boolean;
  isCancelled(): boolean;
  waitForResume(): Promise<void>;
  onStateUpdate(patch: Partial<JobState>): void;
}

async function runSimulatedLoop(ctx: SimContext): Promise<void> {
  const { params, workDir, notify, jobId, nodeId, taskIntervalMs } = ctx;

  const planPath = path.join(workDir, 'PLAN.md');
  const trackerPath = path.join(workDir, 'PLAN_TRACKER.md');

  if (!fs.existsSync(planPath)) {
    await notify.emitEvent(jobId, nodeId, {
      type: 'loop.cancelled',
      reason: `[sim] PLAN.md not found at ${planPath}`,
    });
    ctx.onStateUpdate({ status: 'failed' });
    return;
  }

  const planContent = fs.readFileSync(planPath, 'utf8');

  // Initialise tracker from PLAN.md if it doesn't exist yet
  if (!fs.existsSync(trackerPath)) {
    fs.copyFileSync(planPath, trackerPath);
  }

  const tasksTotal = countTasks(planContent);
  ctx.onStateUpdate({ status: 'running', startedAt: new Date(), tasksTotal });

  await notify.emitEvent(jobId, nodeId, {
    type: 'loop.started',
    branch: params.branch,
    planChecksum: params.planChecksum,
    planTasksCount: tasksTotal,
    prereqTasksCount: ctx.prereqTasksCount,
  });

  let tasksCompleted = 0;
  let tasksFailed = 0;
  let taskIndex = 0;

  while (true) {
    // ── Cancellation check ──────────────────────────────────────────────────
    if (ctx.isCancelled()) {
      await notify.emitEvent(jobId, nodeId, {
        type: 'loop.cancelled',
        reason: 'cancelled by operator',
      });
      ctx.onStateUpdate({ status: 'cancelled', completedAt: new Date() });
      return;
    }

    // ── Pause check ─────────────────────────────────────────────────────────
    if (ctx.isPaused()) {
      ctx.onStateUpdate({ status: 'paused' });
      await notify.emitEvent(jobId, nodeId, { type: 'loop.paused' });
      await ctx.waitForResume();
      ctx.onStateUpdate({ status: 'running' });
      await notify.emitEvent(jobId, nodeId, { type: 'loop.resumed' });
    }

    // ── Find next task ──────────────────────────────────────────────────────
    const trackerContent = fs.readFileSync(trackerPath, 'utf8');
    const taskInfo = findNextTask(trackerContent);

    if (!taskInfo) {
      await notify.emitEvent(jobId, nodeId, {
        type: 'loop.done',
        tasksCompleted,
        tasksFailed,
      });
      ctx.onStateUpdate({ status: 'completed', completedAt: new Date() });
      return;
    }

    taskIndex++;
    ctx.onStateUpdate({ currentTask: taskInfo.task, taskIndex, tasksCompleted, tasksFailed });

    const { taskId = '' } = await notify.emitEvent(jobId, nodeId, {
      type: 'task.started',
      taskIndex,
      taskText: taskInfo.task,
    });

    const taskStartMs = Date.now();

    // ── Simulate work: emit log lines spread over the interval ──────────────
    const LOG_STEPS = 4;
    for (let step = 0; step < LOG_STEPS; step++) {
      if (ctx.isCancelled()) break;
      await new Promise<void>((r) => setTimeout(r, taskIntervalMs / LOG_STEPS));
      await notify.emitEvent(jobId, nodeId, {
        type: 'log',
        stream: 'stdout',
        line: `[sim] task ${taskIndex}/${tasksTotal} · step ${step + 1}/${LOG_STEPS}: ${taskInfo.task}`,
      });
    }

    // ── Post-task cancellation check ────────────────────────────────────────
    if (ctx.isCancelled()) {
      updateTrackerLine(trackerPath, taskInfo.lineNum, 'blocked');
      await notify.emitEvent(jobId, nodeId, { type: 'task.blocked', taskIndex, taskId });
      await notify.emitEvent(jobId, nodeId, {
        type: 'loop.cancelled',
        reason: 'cancelled by operator during task',
      });
      ctx.onStateUpdate({ status: 'cancelled', completedAt: new Date() });
      return;
    }

    // ── Failure injection (task-exit mode) ──────────────────────────────────
    // Fail when the count of successfully completed tasks reaches FAIL_AFTER
    if (FAIL_REASON === 'task-exit' && FAIL_AFTER > 0 && tasksCompleted >= FAIL_AFTER) {
      const exitCode = 1;
      updateTrackerLine(trackerPath, taskInfo.lineNum, 'blocked');
      tasksFailed++;
      ctx.onStateUpdate({ tasksFailed });
      await notify.emitEvent(jobId, nodeId, { type: 'task.failed', taskIndex, exitCode, taskId });
      await notify.emitEvent(jobId, nodeId, {
        type: 'loop.cancelled',
        reason: `[sim] task failed with exit code ${exitCode} (SIMULATOR_FAIL_AFTER=${FAIL_AFTER})`,
      });
      ctx.onStateUpdate({ status: 'blocked', completedAt: new Date() });
      return;
    }

    // ── Task succeeded ──────────────────────────────────────────────────────
    updateTrackerLine(trackerPath, taskInfo.lineNum, 'done');
    tasksCompleted++;
    ctx.onStateUpdate({ tasksCompleted });

    await notify.emitEvent(jobId, nodeId, {
      type: 'task.done',
      taskIndex,
      durationMs: Date.now() - taskStartMs,
      taskId,
    });
  }
}

// ---------------------------------------------------------------------------
// Public factory — same signature as dependency.ts createLoopDependency
// ---------------------------------------------------------------------------

export function createLoopDependency(
  params: JobParams,
  workDir: string,
  notify: NotificationClient,
  nodeId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _db: Db,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _workerClient: WorkerClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _rpcBus?: RpcEventBus,
): LoopDependency {
  let state: JobState = {
    jobId: params.jobId,
    branch: params.branch,
    status: 'pending',
    currentTask: null,
    taskIndex: 0,
    tasksTotal: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    startedAt: null,
    completedAt: null,
  };

  let paused = false;
  let cancelled = false;
  let resolveResume: (() => void) | null = null;

  function waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      resolveResume = resolve;
    });
  }

  const dependency = createDependency({
    name: `ralph-loop-sim:${params.jobId}`,

    async onStart(): Promise<void> {
      // ── Workspace failure injection ───────────────────────────────────────
      if (FAIL_REASON === 'workspace') {
        const reason = '[sim] workspace preparation failed (SIMULATOR_FAIL_REASON=workspace)';
        await notify.emitEvent(params.jobId, nodeId, { type: 'loop.cancelled', reason });
        state = { ...state, status: 'failed' };
        throw new Error(reason);
      }

      // ── Simulate prerequisite checks ──────────────────────────────────────
      const prereqPath = path.join(workDir, 'PREREQUISITES.md');
      if (fs.existsSync(prereqPath)) {
        const prereqContent = fs.readFileSync(prereqPath, 'utf8');
        const items = parsePrerequisites(prereqContent);

        for (const item of items) {
          await notify.emitEvent(params.jobId, nodeId, {
            type: 'prerequisite.check',
            item: item.description,
            tag: item.tag,
            result: 'pending',
          });
        }

        if (FAIL_REASON === 'prerequisites' && items.length > 0) {
          const failed = items[0]!;
          await notify.emitEvent(params.jobId, nodeId, {
            type: 'prerequisite.check',
            item: failed.description,
            tag: failed.tag,
            result: 'fail',
          });
          const reason = '[sim] prerequisites not met (SIMULATOR_FAIL_REASON=prerequisites)';
          await notify.emitEvent(params.jobId, nodeId, { type: 'loop.cancelled', reason });
          state = { ...state, status: 'failed' };
          throw new Error(reason);
        }

        for (const item of items) {
          await notify.emitEvent(params.jobId, nodeId, {
            type: 'prerequisite.check',
            item: item.description,
            tag: item.tag,
            result: 'pass',
          });
        }
      }

      // ── Resolve per-task interval ─────────────────────────────────────────
      let taskIntervalMs = TASK_INTERVAL_MS;
      if (TOTAL_MS !== null) {
        const planPath = path.join(workDir, 'PLAN.md');
        if (fs.existsSync(planPath)) {
          const planContent = fs.readFileSync(planPath, 'utf8');
          const total = countTasks(planContent);
          taskIntervalMs = total > 0
            ? Math.floor(TOTAL_MS / total)
            : TASK_INTERVAL_MS;
        }
      }

      // ── Fire the simulated loop in the background ─────────────────────────
      void runSimulatedLoop({
        jobId: params.jobId,
        nodeId,
        params,
        workDir,
        notify,
        taskIntervalMs,
        prereqTasksCount: 0,
        isPaused: () => paused,
        isCancelled: () => cancelled,
        waitForResume,
        onStateUpdate: (patch) => {
          state = { ...state, ...patch };
        },
      });
    },

    async onStop(): Promise<void> {
      cancelled = true;
      // Unblock the loop if it is waiting on a resume so it can observe the cancel flag
      if (resolveResume) {
        resolveResume();
        resolveResume = null;
      }
    },

    async onPause(): Promise<void> {
      paused = true;
    },

    async onResume(): Promise<void> {
      paused = false;
      resolveResume?.();
      resolveResume = null;
    },

    healthDetail(): Record<string, unknown> {
      return { ...state } as Record<string, unknown>;
    },
  });

  return {
    dependency,
    getState: () => ({ ...state }),
  };
}
