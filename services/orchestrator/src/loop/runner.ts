/**
 * @packageDocumentation
 * Core task-loop runner — the headless, event-driven adaptation of `scripts/ralph/start.ts`.
 *
 * `runLoop` is the main entry point. It is called by `dependency.ts` in a background
 * promise after workspace preparation and prerequisite checks succeed.
 *
 * Task rows are created directly in the executor's own DB (no longer via
 * notifications event side-effect). The task ID handshake is eliminated.
 */

import type { Db } from '../db/index.js';
import type { HookEngine, HookFireResult } from '../hooks/engine.js';
import type { HookPhase, HookPayload } from '../hooks/types.js';
import type { NotificationClient } from '../notifications/client.js';
import type { RpcEventBus } from '../rpc/event-bus.js';
import type {
  HatChangedEvent,
  IterationEndEvent,
  IterationStartEvent,
  LoopStartedEvent,
  LoopTerminatedEvent,
  TaskCountsUpdatedEvent,
  TaskStatusChangedEvent,
} from '../rpc/types/events.js';
import type { JobParams, JobState } from '../types.js';
import type { WorkerClient, WorkerProcess } from '../workers/client.js';
import type { StreamHandler } from '../workers/stream-handler.js';

import fs from 'fs';
import path from 'path';

import { RpcStreamHandler } from '../rpc/rpc-stream-handler.js';
import { updateJobStatus, updateJobTaskCounts } from '../store/jobs.js';
import { countJobTasks, findNextPendingTask, updateTaskStatus } from '../store/tasks.js';
import { parseClaudeStream } from '../workers/parsers/claude-stream-parser.js';

import { buildPrompt } from './plan.js';

/**
 * Context injected into the loop runner by the dependency wrapper.
 * Provides control callbacks, the notification sink, and the database handle.
 */
export interface RunnerContext {
  jobId: string;
  nodeId: string;
  params: JobParams;
  /** Absolute path to the repo on this node (after branch checkout). */
  workDir: string;
  notify: NotificationClient;
  /** Drizzle database instance for persisting job/task state. */
  db: Db;
  /** Worker client used to execute claude invocations. */
  workerClient: WorkerClient;
  /** Number of prerequisite tasks (from PREREQUISITES.md). */
  prereqTasksCount: number;
  /** Returns true when the loop should pause between tasks. */
  isPaused(): boolean;
  /** Returns true when the loop should abort immediately. */
  isCancelled(): boolean;
  /** Resolves when the pause flag is cleared (resume() was called). */
  waitForResume(): Promise<void>;
  /** Called with the active worker process so dependency.onStop() can kill it. */
  onChildSpawned(proc: WorkerProcess | null): void;
  /** Merges a partial update into the shared JobState. */
  onStateUpdate(patch: Partial<JobState>): void;
  /**
   * Optional hook engine for firing lifecycle hooks at each orchestration phase.
   * When absent, all lifecycle points are no-ops and the loop runs without hooks.
   */
  hookEngine?: HookEngine;
  /**
   * Optional RPC event bus for publishing lifecycle events to external consumers.
   * When absent, no RPC events are emitted and the loop runs without RPC integration.
   */
  rpcBus?: RpcEventBus;
}

// ---------------------------------------------------------------------------
// Stdout/stderr drain — reads all lines from a ReadableStream and emits them
// ---------------------------------------------------------------------------

async function drainStream(
  stream: ReadableStream<Uint8Array>,
  streamName: 'stdout' | 'stderr',
  ctx: RunnerContext,
  rpcHandler?: StreamHandler,
): Promise<void> {
  const decoder = new TextDecoder();
  // Buffer partial lines across chunks
  let buffer = '';

  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last (potentially incomplete) segment in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        await ctx.notify.emitEvent(ctx.jobId, ctx.nodeId, {
          type: 'log',
          stream: streamName,
          line,
        });
        if (rpcHandler) {
          parseClaudeStream(line, rpcHandler);
        }
      }
    }
    // Flush any remaining content
    if (buffer.length > 0) {
      await ctx.notify.emitEvent(ctx.jobId, ctx.nodeId, {
        type: 'log',
        stream: streamName,
        line: buffer,
      });
      if (rpcHandler) {
        parseClaudeStream(buffer, rpcHandler);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Hook utilities
// ---------------------------------------------------------------------------

/**
 * Fires a lifecycle phase via the hook engine with a constructed payload.
 * Returns an immediate `continue` result when no engine is configured.
 *
 * @param engine - The hook engine, or undefined when hooks are not configured.
 * @param phase - Lifecycle phase to fire.
 * @param iteration - Current task index (0 for loop-level phases).
 * @param hat - Active agent context identifier (planId).
 * @param metadata - Accumulated metadata from prior phases in this session.
 */
async function firePhase(
  engine: HookEngine | undefined,
  phase: HookPhase,
  iteration: number,
  hat: string,
  metadata: Record<string, unknown>,
): Promise<HookFireResult> {
  if (!engine) {
    return { metadata, disposition: 'continue' };
  }
  const payload: HookPayload = {
    iteration,
    hat,
    events: [],
    metadata: { ...metadata },
  };
  return engine.fire(phase, payload);
}

// ---------------------------------------------------------------------------
// RPC orchestration-event helpers
// ---------------------------------------------------------------------------

/**
 * Publishes a `task_status_changed` event through the RPC bus.
 *
 * @param bus - The RPC event bus (may be undefined when RPC is inactive).
 * @param taskId - Identifier of the task whose status changed.
 * @param previousStatus - The status the task had before the transition.
 * @param newStatus - The status the task transitioned to.
 */
function publishTaskStatusChanged(
  bus: RpcEventBus | undefined,
  taskId: string,
  previousStatus: string,
  newStatus: string,
): void {
  if (!bus) return;
  const evt: TaskStatusChangedEvent = {
    event: 'task_status_changed',
    data: {
      taskId,
      previousStatus,
      newStatus,
      timestamp: new Date().toISOString(),
    },
  };
  bus.publish(evt);
}

/**
 * Publishes a `task_counts_updated` event through the RPC bus.
 *
 * @param bus - The RPC event bus (may be undefined when RPC is inactive).
 * @param counts - Current aggregate task counts.
 */
function publishTaskCountsUpdated(
  bus: RpcEventBus | undefined,
  counts: { pending: number; inProgress: number; completed: number; failed: number },
): void {
  if (!bus) return;
  const evt: TaskCountsUpdatedEvent = {
    event: 'task_counts_updated',
    data: {
      ...counts,
      timestamp: new Date().toISOString(),
    },
  };
  bus.publish(evt);
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

/**
 * Runs the ralph task loop, headless and event-driven.
 *
 * Adapted from `scripts/ralph/start.ts` with the following changes:
 * - stdout/stderr are piped and emitted as `log` events (not inherited)
 * - pause/cancel flags are checked between tasks (never mid-task)
 * - events are emitted via `NotificationClient` instead of console
 * - task rows are created directly in the executor DB (task ID handshake eliminated)
 * - job status transitions are persisted to the executor DB
 * - `pushAndCreatePR()` is omitted — the PROMPT.md handles git push
 * - hook lifecycle phases are fired at each of the 12 orchestration points
 */
export async function runLoop(ctx: RunnerContext): Promise<void> {
  const { params, workDir, notify, jobId, nodeId, db } = ctx;

  // ── Resolve plan and prompt content ──────────────────────────────────────
  // Plan-based dispatch (from schedulus): tasks are already in DB, plan/prompt
  // content is optional context. Branch-based dispatch: files must exist on disk.
  const isPlanDispatch = !!params.plan;

  let planContent = '';
  let promptContent = '';

  if (isPlanDispatch) {
    // Plan-based: read plan/prompt files if available (for prompt context), but
    // don't fail if missing — the task list is already in DB.
    const planPath = path.join(workDir, 'PLAN.md');
    if (fs.existsSync(planPath)) {
      planContent = fs.readFileSync(planPath, 'utf8');
    }
    const rootPromptPath = path.join(workDir, 'PROMPT.md');
    const fallbackPromptPath = path.join(workDir, 'scripts', 'ralph', 'PROMPT.md');
    if (fs.existsSync(rootPromptPath)) {
      promptContent = fs.readFileSync(rootPromptPath, 'utf8');
    } else if (fs.existsSync(fallbackPromptPath)) {
      promptContent = fs.readFileSync(fallbackPromptPath, 'utf8');
    }
  } else {
    // Branch-based: files are required
    const planPath = path.join(workDir, 'PLAN.md');
    const rootPromptPath = path.join(workDir, 'PROMPT.md');
    const fallbackPromptPath = path.join(workDir, 'scripts', 'ralph', 'PROMPT.md');
    const promptPath = fs.existsSync(rootPromptPath)
      ? rootPromptPath
      : fallbackPromptPath;

    if (!fs.existsSync(planPath)) {
      await notify.emitEvent(jobId, nodeId, {
        type: 'loop.cancelled',
        reason: `PLAN.md not found at ${planPath}`,
      });
      ctx.onStateUpdate({ status: 'failed' });
      await updateJobStatus(db, jobId, 'failed');
      return;
    }

    if (!fs.existsSync(promptPath)) {
      await notify.emitEvent(jobId, nodeId, {
        type: 'loop.cancelled',
        reason: `PROMPT.md not found (tried ${rootPromptPath} and ${fallbackPromptPath})`,
      });
      ctx.onStateUpdate({ status: 'failed' });
      await updateJobStatus(db, jobId, 'failed');
      return;
    }

    planContent = fs.readFileSync(planPath, 'utf8');
    promptContent = fs.readFileSync(promptPath, 'utf8');
  }

  // ── Suspend recovery ─────────────────────────────────────────────────────
  // Restore accumulated metadata from a prior suspended run when available.
  // The loop starts fresh from the beginning regardless — only the metadata
  // carried by the suspended payload is restored.
  let accumulatedMetadata: Record<string, unknown> = {};
  if (ctx.hookEngine) {
    const suspendState = await ctx.hookEngine.recoverFromSuspend();
    if (suspendState !== null) {
      accumulatedMetadata = { ...suspendState.payload.metadata };
    }
  }

  // The planId serves as the "hat" — the stable agent context identifier for
  // all hook payloads emitted during this session.
  const hat = params.planId;

  // ── Inner hook-outcome helper ─────────────────────────────────────────────
  // Applies a HookFireResult to session state and returns whether to continue.
  // On block: emits loop.cancelled, sets status to blocked, returns false.
  // On suspend: emits loop.paused, sets status to paused, returns false.
  // On continue: merges returned metadata into accumulatedMetadata, returns true.
  async function applyHookResult(result: HookFireResult, phase: HookPhase): Promise<boolean> {
    if (result.disposition === 'block') {
      await notify.emitEvent(jobId, nodeId, {
        type: 'loop.cancelled',
        reason: `hook blocked at phase "${phase}"`,
      });
      ctx.onStateUpdate({ status: 'blocked', completedAt: new Date() });
      await updateJobStatus(db, jobId, 'blocked', { completed_at: new Date() });
      return false;
    }
    if (result.disposition === 'suspend') {
      await notify.emitEvent(jobId, nodeId, { type: 'loop.paused' });
      ctx.onStateUpdate({ status: 'paused' });
      await updateJobStatus(db, jobId, 'paused');
      return false;
    }
    accumulatedMetadata = { ...accumulatedMetadata, ...result.metadata };
    return true;
  }

  const tasksTotal = await countJobTasks(db, jobId);
  ctx.onStateUpdate({ status: 'running', startedAt: new Date(), tasksTotal });
  await updateJobStatus(db, jobId, 'running', { started_at: new Date() });
  await updateJobTaskCounts(db, jobId, tasksTotal, ctx.prereqTasksCount);

  // ── pre.loop.start ────────────────────────────────────────────────────────
  {
    const result = await firePhase(ctx.hookEngine, 'pre.loop.start', 0, hat, accumulatedMetadata);
    if (!(await applyHookResult(result, 'pre.loop.start'))) return;
  }

  await notify.emitEvent(jobId, nodeId, {
    type: 'loop.started',
    branch: params.branch,
    planChecksum: params.planChecksum,
    planTasksCount: tasksTotal,
    prereqTasksCount: ctx.prereqTasksCount,
  });

  // ── RPC: loop_started ────────────────────────────────────────────────────
  if (ctx.rpcBus) {
    const evt: LoopStartedEvent = {
      event: 'loop_started',
      data: {
        timestamp: new Date().toISOString(),
        prompt: params.planId,
        hatId: hat,
        maxIterations: tasksTotal,
      },
    };
    ctx.rpcBus.publish(evt);
  }

  // ── RPC: hat_changed (initial hat assignment) ───────────────────────────
  if (ctx.rpcBus) {
    const evt: HatChangedEvent = {
      event: 'hat_changed',
      data: {
        newHatId: hat,
        timestamp: new Date().toISOString(),
      },
    };
    ctx.rpcBus.publish(evt);
  }

  // ── RPC: task_counts_updated (initial counts) ──────────────────────────
  publishTaskCountsUpdated(ctx.rpcBus, {
    pending: tasksTotal,
    inProgress: 0,
    completed: 0,
    failed: 0,
  });

  // ── post.loop.start ───────────────────────────────────────────────────────
  {
    const result = await firePhase(ctx.hookEngine, 'post.loop.start', 0, hat, accumulatedMetadata);
    if (!(await applyHookResult(result, 'post.loop.start'))) return;
  }

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
      await updateJobStatus(db, jobId, 'cancelled', { completed_at: new Date() });

      // ── RPC: loop_terminated (cancelled) ─────────────────────────────────
      if (ctx.rpcBus) {
        const evt: LoopTerminatedEvent = {
          event: 'loop_terminated',
          data: {
            timestamp: new Date().toISOString(),
            reason: 'aborted',
            totalIterations: tasksCompleted + tasksFailed,
            message: 'cancelled by operator',
          },
        };
        ctx.rpcBus.publish(evt);
      }

      return;
    }

    // ── Pause check ─────────────────────────────────────────────────────────
    if (ctx.isPaused()) {
      // ── pre.human.interact ────────────────────────────────────────────────
      {
        const result = await firePhase(
          ctx.hookEngine,
          'pre.human.interact',
          taskIndex,
          hat,
          accumulatedMetadata,
        );
        if (!(await applyHookResult(result, 'pre.human.interact'))) return;
      }

      ctx.onStateUpdate({ status: 'paused' });
      await updateJobStatus(db, jobId, 'paused');
      await notify.emitEvent(jobId, nodeId, { type: 'loop.paused' });
      await ctx.waitForResume();
      ctx.onStateUpdate({ status: 'running' });
      await updateJobStatus(db, jobId, 'running');
      await notify.emitEvent(jobId, nodeId, { type: 'loop.resumed' });

      // ── post.human.interact ───────────────────────────────────────────────
      {
        const result = await firePhase(
          ctx.hookEngine,
          'post.human.interact',
          taskIndex,
          hat,
          accumulatedMetadata,
        );
        if (!(await applyHookResult(result, 'post.human.interact'))) return;
      }
    }

    // ── Find next task (DB-driven) ────────────────────────────────────────
    const nextTask = await findNextPendingTask(db, jobId);

    if (!nextTask) {
      // ── pre.loop.complete ─────────────────────────────────────────────────
      {
        const result = await firePhase(
          ctx.hookEngine,
          'pre.loop.complete',
          taskIndex,
          hat,
          accumulatedMetadata,
        );
        if (!(await applyHookResult(result, 'pre.loop.complete'))) return;
      }

      await notify.emitEvent(jobId, nodeId, {
        type: 'loop.done',
        tasksCompleted,
        tasksFailed,
      });
      ctx.onStateUpdate({ status: 'completed', completedAt: new Date() });
      await updateJobStatus(db, jobId, 'completed', { completed_at: new Date() });

      // ── RPC: loop_terminated (completed) ─────────────────────────────────
      if (ctx.rpcBus) {
        const evt: LoopTerminatedEvent = {
          event: 'loop_terminated',
          data: {
            timestamp: new Date().toISOString(),
            reason: 'completed',
            totalIterations: tasksCompleted + tasksFailed,
          },
        };
        ctx.rpcBus.publish(evt);
      }

      // ── post.loop.complete ────────────────────────────────────────────────
      // Fire as a final notification; block/suspend are ignored since the loop
      // is already at its terminal completion point.
      {
        const result = await firePhase(
          ctx.hookEngine,
          'post.loop.complete',
          taskIndex,
          hat,
          accumulatedMetadata,
        );
        accumulatedMetadata = { ...accumulatedMetadata, ...result.metadata };
      }

      return;
    }

    taskIndex++;
    const taskText = nextTask.task_text;
    const taskId = nextTask.id;

    ctx.onStateUpdate({
      currentTask: taskText,
      taskIndex,
      tasksCompleted,
      tasksFailed,
    });

    // ── pre.iteration.start ───────────────────────────────────────────────
    {
      const result = await firePhase(
        ctx.hookEngine,
        'pre.iteration.start',
        taskIndex,
        hat,
        accumulatedMetadata,
      );
      if (!(await applyHookResult(result, 'pre.iteration.start'))) return;
    }

    // Mark the pre-existing task row as running
    await updateTaskStatus(db, taskId, 'running');

    // ── RPC: task_status_changed (pending → running) ──────────────────────
    publishTaskStatusChanged(ctx.rpcBus, taskId, 'pending', 'running');
    publishTaskCountsUpdated(ctx.rpcBus, {
      pending: tasksTotal - tasksCompleted - tasksFailed - 1,
      inProgress: 1,
      completed: tasksCompleted,
      failed: tasksFailed,
    });

    // Emit task.started to notifications for SSE fan-out
    await notify.emitEvent(jobId, nodeId, {
      type: 'task.started',
      taskIndex,
      taskText,
    });

    // ── RPC: iteration_start ─────────────────────────────────────────────────
    if (ctx.rpcBus) {
      const evt: IterationStartEvent = {
        event: 'iteration_start',
        data: {
          index: taskIndex - 1, // zero-based
          timestamp: new Date().toISOString(),
          hatId: hat,
        },
      };
      ctx.rpcBus.publish(evt);
    }

    // ── pre.plan.created ──────────────────────────────────────────────────
    {
      const result = await firePhase(
        ctx.hookEngine,
        'pre.plan.created',
        taskIndex,
        hat,
        accumulatedMetadata,
      );
      if (!(await applyHookResult(result, 'pre.plan.created'))) return;
    }

    // ── Invoke claude via worker client ────────────────────────────────────
    const prompt = buildPrompt(taskText, promptContent, planContent);

    // ── post.plan.created ─────────────────────────────────────────────────
    {
      const result = await firePhase(
        ctx.hookEngine,
        'post.plan.created',
        taskIndex,
        hat,
        accumulatedMetadata,
      );
      if (!(await applyHookResult(result, 'post.plan.created'))) return;
    }

    const taskStartMs = Date.now();

    const proc = await ctx.workerClient.exec(prompt, workDir);

    ctx.onChildSpawned(proc);

    // Create an RPC stream handler when the bus is available so that
    // streaming events (text_delta, tool_call_start, tool_call_end) are
    // published as stdout is drained line-by-line.
    const rpcHandler = ctx.rpcBus
      ? new RpcStreamHandler({ bus: ctx.rpcBus, iterationIndex: taskIndex - 1 })
      : undefined;

    // Drain stdout and stderr concurrently while waiting for exit
    await Promise.all([
      drainStream(proc.stdout, 'stdout', ctx, rpcHandler),
      drainStream(proc.stderr, 'stderr', ctx),
      proc.exited,
    ]);

    const exitCode = await proc.exited;
    ctx.onChildSpawned(null); // clear ref

    // ── Post-task handling ──────────────────────────────────────────────────
    if (ctx.isCancelled()) {
      await updateTaskStatus(db, taskId, 'blocked');

      // ── RPC: task_status_changed (running → blocked) ────────────────────
      publishTaskStatusChanged(ctx.rpcBus, taskId, 'running', 'blocked');
      publishTaskCountsUpdated(ctx.rpcBus, {
        pending: tasksTotal - tasksCompleted - tasksFailed - 1,
        inProgress: 0,
        completed: tasksCompleted,
        failed: tasksFailed + 1,
      });

      await notify.emitEvent(jobId, nodeId, {
        type: 'task.blocked',
        taskIndex,
        taskId,
      });
      await notify.emitEvent(jobId, nodeId, {
        type: 'loop.cancelled',
        reason: 'cancelled by operator during task',
      });
      ctx.onStateUpdate({ status: 'cancelled', completedAt: new Date() });
      await updateJobStatus(db, jobId, 'cancelled', { completed_at: new Date() });

      // ── RPC: loop_terminated (cancelled during task) ─────────────────────
      if (ctx.rpcBus) {
        const evt: LoopTerminatedEvent = {
          event: 'loop_terminated',
          data: {
            timestamp: new Date().toISOString(),
            reason: 'aborted',
            totalIterations: tasksCompleted + tasksFailed,
            message: 'cancelled by operator during task',
          },
        };
        ctx.rpcBus.publish(evt);
      }

      return;
    }

    if (exitCode !== 0) {
      // ── pre.loop.error ──────────────────────────────────────────────────
      // Fires before error-handling cleanup; a block/suspend here terminates
      // the loop before the tracker and task status are updated.
      {
        const result = await firePhase(
          ctx.hookEngine,
          'pre.loop.error',
          taskIndex,
          hat,
          accumulatedMetadata,
        );
        if (!(await applyHookResult(result, 'pre.loop.error'))) return;
      }

      tasksFailed++;
      ctx.onStateUpdate({ tasksFailed });

      const durationMs = Date.now() - taskStartMs;
      await updateTaskStatus(db, taskId, 'failed', {
        completedAt: new Date(),
        durationMs,
        exitCode: exitCode ?? 1,
      });

      // ── RPC: task_status_changed (running → failed) ─────────────────────
      publishTaskStatusChanged(ctx.rpcBus, taskId, 'running', 'failed');
      publishTaskCountsUpdated(ctx.rpcBus, {
        pending: tasksTotal - tasksCompleted - tasksFailed,
        inProgress: 0,
        completed: tasksCompleted,
        failed: tasksFailed,
      });

      await notify.emitEvent(jobId, nodeId, {
        type: 'task.failed',
        taskIndex,
        exitCode: exitCode ?? 1,
        taskId,
      });

      // ── RPC: iteration_end (failure) ─────────────────────────────────────
      if (ctx.rpcBus) {
        const evt: IterationEndEvent = {
          event: 'iteration_end',
          data: {
            index: taskIndex - 1, // zero-based
            timestamp: new Date().toISOString(),
            durationMs,
          },
        };
        ctx.rpcBus.publish(evt);
      }

      await notify.emitEvent(jobId, nodeId, {
        type: 'loop.cancelled',
        reason: `task failed with exit code ${exitCode ?? 1}`,
      });
      ctx.onStateUpdate({ status: 'blocked', completedAt: new Date() });
      await updateJobStatus(db, jobId, 'blocked', { completed_at: new Date() });

      // ── RPC: loop_terminated (task failure) ──────────────────────────────
      if (ctx.rpcBus) {
        const evt: LoopTerminatedEvent = {
          event: 'loop_terminated',
          data: {
            timestamp: new Date().toISOString(),
            reason: 'error',
            totalIterations: tasksCompleted + tasksFailed,
            message: `task failed with exit code ${exitCode ?? 1}`,
          },
        };
        ctx.rpcBus.publish(evt);
      }

      // ── post.loop.error ─────────────────────────────────────────────────
      // Fire as a final notification; block/suspend are ignored since the loop
      // is already at its terminal error point.
      {
        const result = await firePhase(
          ctx.hookEngine,
          'post.loop.error',
          taskIndex,
          hat,
          accumulatedMetadata,
        );
        accumulatedMetadata = { ...accumulatedMetadata, ...result.metadata };
      }

      return;
    }

    // ── post.iteration.start ──────────────────────────────────────────────
    // Fires after a successful task exit, before the tracker is updated.
    // A block/suspend here terminates the loop without marking the task done.
    {
      const result = await firePhase(
        ctx.hookEngine,
        'post.iteration.start',
        taskIndex,
        hat,
        accumulatedMetadata,
      );
      if (!(await applyHookResult(result, 'post.iteration.start'))) return;
    }

    tasksCompleted++;
    ctx.onStateUpdate({ tasksCompleted });

    const durationMs = Date.now() - taskStartMs;
    await updateTaskStatus(db, taskId, 'done', {
      completedAt: new Date(),
      durationMs,
    });

    // ── RPC: task_status_changed (running → done) ─────────────────────────
    publishTaskStatusChanged(ctx.rpcBus, taskId, 'running', 'done');
    publishTaskCountsUpdated(ctx.rpcBus, {
      pending: tasksTotal - tasksCompleted - tasksFailed,
      inProgress: 0,
      completed: tasksCompleted,
      failed: tasksFailed,
    });

    await notify.emitEvent(jobId, nodeId, {
      type: 'task.done',
      taskIndex,
      durationMs,
      taskId,
    });

    // ── RPC: iteration_end (success) ─────────────────────────────────────────
    if (ctx.rpcBus) {
      const evt: IterationEndEvent = {
        event: 'iteration_end',
        data: {
          index: taskIndex - 1, // zero-based
          timestamp: new Date().toISOString(),
          durationMs,
        },
      };
      ctx.rpcBus.publish(evt);
    }
  }
}
