/**
 * @packageDocumentation
 * Production loop dependency — wraps `runLoop` as a `createDependency` lifecycle object.
 *
 * Handles workspace preparation (git fetch/checkout/pull), prerequisite checking,
 * optional human confirmation, and fires the loop in a background promise.
 */

import type { Db } from '../db/index.js';
import type { NotificationClient } from '../notifications/client.js';
import type { RpcEventBus } from '../rpc/event-bus.js';
import type { JobParams, JobState } from '../types.js';
import type { WorkerClient, WorkerProcess } from '../workers/client.js';
import type { Dependency } from '@open-tomato/service-core';

import fs from 'fs';
import path from 'path';

import { createDependency } from '@open-tomato/service-core';

import { HookEngine } from '../hooks/engine.js';
import { HookExecutor } from '../hooks/executor.js';
import { hookPhaseSchema, hookSpecSchema } from '../hooks/schema.js';
import { SuspendStateStore } from '../hooks/suspend-state-store.js';
import { HookTelemetry } from '../hooks/telemetry.js';
import { checkPrerequisites } from '../prerequisites/checker.js';
import { parsePrerequisites } from '../prerequisites/parser.js';
import { updateJobStatus } from '../store/jobs.js';
import { bulkCreateTasks } from '../store/tasks.js';

import { runLoop } from './runner.js';

export interface LoopDependency {
  dependency: Dependency;
  getState(): JobState;
}

/**
 * Signature shared by `createLoopDependency` (production) and the simulator.
 * Injected into the jobs router so the route layer stays decoupled from the
 * choice of real vs. simulated execution.
 *
 * @param params - Job dispatch parameters.
 * @param workDir - Absolute path to the local repo checkout.
 * @param notify - Notification sink for events and approval requests.
 * @param nodeId - Identifier of this executor node.
 * @param db - Drizzle database instance for persisting job/task state.
 * @param workerClient - Worker backend used to execute claude invocations.
 * @returns A {@link LoopDependency} ready to be started.
 */
export type LoopDependencyFactory = (
  params: JobParams,
  workDir: string,
  notify: NotificationClient,
  nodeId: string,
  db: Db,
  workerClient: WorkerClient,
  rpcBus?: RpcEventBus,
) => LoopDependency;

/**
 * Wraps the ralph loop as a `createDependency` lifecycle object.
 *
 * Lifecycle mapping:
 * - `start()` → git fetch/checkout/pull, prerequisites check, then fire runLoop() in background
 * - `stop()`  → set cancelled flag, kill active claude child process
 * - `pause()` → set paused flag (takes effect after current task completes — never mid-task)
 * - `resume()` → clear paused flag, resolve the resume signal
 * - `healthDetail()` → current JobState
 */
export function createLoopDependency(
  params: JobParams,

  _workDir: string,
  notify: NotificationClient,
  nodeId: string,
  db: Db,
  workerClient: WorkerClient,
  rpcBus?: RpcEventBus,
): LoopDependency {
  // ── Shared mutable state ──────────────────────────────────────────────────

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
  let currentChild: WorkerProcess | null = null;

  // Resume signal: resolved when resume() is called while paused
  let resolveResume: (() => void) | null = null;

  function waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      resolveResume = resolve;
    });
  }

  // ── Workspace preparation ─────────────────────────────────────────────────

  async function prepareWorkspace(): Promise<string> {
    return workerClient.prepareWorkspace(params.branch);
  }

  // ── Dependency object ─────────────────────────────────────────────────────

  const dependency = createDependency({
    name: `ralph-loop:${params.jobId}`,

    async onStart(): Promise<void> {
      const isPlanDispatch = !!params.plan;
      let resolvedWorkDir: string;

      if (isPlanDispatch) {
        // Plan-based dispatch: no git checkout needed.
        resolvedWorkDir = _workDir;
      } else {
        // Branch-based dispatch: prepare workspace via git clone/checkout.
        try {
          resolvedWorkDir = await prepareWorkspace();
        } catch (err) {
          const msg = err instanceof Error
            ? err.message
            : String(err);
          await notify.emitEvent(params.jobId, nodeId, {
            type: 'loop.cancelled',
            reason: `workspace preparation failed: ${msg}`,
          });
          state = { ...state, status: 'failed' };
          await updateJobStatus(db, params.jobId, 'failed');
          throw err;
        }

        // For branch-based dispatch, seed tasks from PLAN.md on disk.
        const planPath = path.join(resolvedWorkDir, 'PLAN.md');
        if (fs.existsSync(planPath)) {
          const planContent = fs.readFileSync(planPath, 'utf8');
          const taskLines: Array<{ index: number; text: string }> = [];
          const lines = planContent.split('\n');
          let idx = 0;
          for (const line of lines) {
            const match = /^- \[[ xX]\] (.+)|^- \[BLOCKED\] (.+)/.exec(line);
            if (match) {
              const text = (match[1] ?? match[2] ?? '').trim();
              taskLines.push({ index: idx, text });
              idx++;
            }
          }
          if (taskLines.length > 0) {
            await bulkCreateTasks(db, params.jobId, taskLines);
          }
        }
      }

      // 2. Check prerequisites (if PREREQUISITES.md exists)
      const prereqPath = path.join(resolvedWorkDir, 'PREREQUISITES.md');
      let prereqTasksCount = 0;
      if (fs.existsSync(prereqPath)) {
        const prereqContent = fs.readFileSync(prereqPath, 'utf8');
        const items = parsePrerequisites(prereqContent);
        prereqTasksCount = items.length;

        if (items.length > 0) {
          const allPassed = await checkPrerequisites(
            items,
            params.jobId,
            nodeId,
            resolvedWorkDir,
            notify,
          );

          if (!allPassed) {
            await notify.emitEvent(params.jobId, nodeId, {
              type: 'loop.cancelled',
              reason: 'prerequisites not met — one or more items were denied',
            });
            state = { ...state, status: 'failed' };
            await updateJobStatus(db, params.jobId, 'failed');
            throw new Error('prerequisites not met');
          }
        }
      }

      // 3. Optional confirmBeforeStart gate
      if (params.confirmBeforeStart) {
        const decision = await notify.requestApproval(params.jobId, nodeId, {
          requestId: crypto.randomUUID(),
          type: 'human-loop',
          description: `Ready to start loop for branch "${params.branch}" (plan: ${params.planId}). Confirm to proceed.`,
        });

        if (decision.decision === 'denied') {
          await notify.emitEvent(params.jobId, nodeId, {
            type: 'loop.cancelled',
            reason: 'start confirmation denied by operator',
          });
          state = { ...state, status: 'cancelled' };
          await updateJobStatus(db, params.jobId, 'cancelled');
          throw new Error('start denied by operator');
        }
      }

      // 4. Build the HookEngine from params.hooks if hook specs are provided.
      //    The state dir lives under resolvedWorkDir/.ralph so persist/recover
      //    operations stay co-located with the workspace.
      //    Phase keys and hook specs are validated with Zod schemas at startup so
      //    invalid configurations are rejected before the loop begins.
      let hookEngine: HookEngine | undefined;
      if (params.hooks && Object.keys(params.hooks).length > 0) {
        try {
          const stateDir = path.join(resolvedWorkDir, '.ralph');
          const suspendStore = new SuspendStateStore(stateDir);
          const telemetry = new HookTelemetry(stateDir);
          const executor = new HookExecutor([], console);
          hookEngine = new HookEngine(executor, suspendStore, telemetry, console);

          for (const [rawPhase, specs] of Object.entries(params.hooks)) {
            if (!specs || specs.length === 0) continue;
            const phase = hookPhaseSchema.parse(rawPhase);
            const validated = specs.map((s) => hookSpecSchema.parse(s));
            hookEngine.registerHooks(phase, validated);
          }
        } catch (err) {
          const msg = err instanceof Error
            ? err.message
            : String(err);
          await notify.emitEvent(params.jobId, nodeId, {
            type: 'loop.cancelled',
            reason: `hook configuration invalid: ${msg}`,
          });
          state = { ...state, status: 'failed' };
          await updateJobStatus(db, params.jobId, 'failed');
          throw err;
        }
      }

      // 5. Fire the loop in the background — do NOT await here.
      //    createService's onStart must resolve quickly.
      void runLoop({
        jobId: params.jobId,
        nodeId,
        params,
        workDir: resolvedWorkDir,
        notify,
        db,
        workerClient,
        prereqTasksCount,
        isPaused: () => paused,
        isCancelled: () => cancelled,
        waitForResume,
        onChildSpawned: (proc) => {
          currentChild = proc;
        },
        onStateUpdate: (patch) => {
          state = { ...state, ...patch };
        },
        hookEngine,
        rpcBus,
      }).catch((err: unknown) => {
        const reason = err instanceof Error
          ? err.message
          : String(err);
        void notify.emitEvent(params.jobId, nodeId, {
          type: 'loop.cancelled',
          reason: `runner crashed: ${reason}`,
        }).catch(() => undefined);
        void updateJobStatus(db, params.jobId, 'failed').catch(() => undefined);
      });
    },

    async onStop(): Promise<void> {
      cancelled = true;
      // If paused, unblock the loop so it can observe the cancel flag
      if (resolveResume) {
        resolveResume();
        resolveResume = null;
      }
      currentChild?.kill();
      currentChild = null;
    },

    async onPause(): Promise<void> {
      // Flag is checked by the runner between tasks.
      // The currently running claude invocation is NOT interrupted.
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
