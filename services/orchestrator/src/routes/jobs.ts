/**
 * @packageDocumentation
 * Express router for job dispatch and lifecycle control.
 *
 * Jobs are persisted to the executor's own PostgreSQL database. The in-memory
 * loop reference (`activeLoopDep`) is kept for the currently running job so
 * that pause/resume/cancel can be forwarded to the loop dependency.
 *
 * The loop factory is injected at construction time so the router works
 * with both the production implementation and the simulator.
 */

import type { Db } from '../db/index.js';
import type { LoopDependencyFactory } from '../loop/dependency.js';
import type { NotificationClient } from '../notifications/client.js';
import type { RpcEventBus } from '../rpc/event-bus.js';
import type { JobParams, JobState } from '../types.js';
import type { WorkerPool } from '../workers/pool.js';
import type { Request, Response } from 'express';

import { randomUUID } from 'crypto';

import { Router } from 'express';
import { z } from 'zod';

import { hookPhaseSchema, hookSpecSchema } from '../hooks/schema.js';
import { createJob, getJob, listJobs } from '../store/jobs.js';
import { bulkCreateTasks, getCurrentTask, listJobTasks } from '../store/tasks.js';

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const PlanPayloadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  checksum: z.string().optional(),
  tasks: z.array(z.object({
    index: z.number().int()
      .nonnegative(),
    text: z.string().min(1),
  })).min(1),
});

const DispatchJobSchema = z.object({
  jobId: z.string().uuid()
    .optional(),
  /** Required for branch-based dispatch, optional for plan-based dispatch. */
  branch: z.string().min(1)
    .optional(),
  planId: z.string().min(1),
  planChecksum: z.string().optional(),
  confirmBeforeStart: z.boolean().optional(),
  /** Pre-parsed plan payload. When provided, tasks are seeded from this instead of PLAN.md. */
  plan: PlanPayloadSchema.optional(),
  /**
   * Optional hook specifications keyed by lifecycle phase.
   * Each phase maps to an ordered list of hook specs validated with HookSpec Zod schema.
   */
  hooks: z.record(hookPhaseSchema, z.array(hookSpecSchema)).optional(),
}).refine(
  (data) => data.branch !== undefined || data.plan !== undefined,
  { message: 'Either "branch" or "plan" must be provided' },
);

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

interface JobsRouterOpts {
  notify: NotificationClient;
  nodeId: string;
  repoPath: string;
  /** Factory used to create the loop dependency for each dispatched job. */
  loopFactory: LoopDependencyFactory;
  /** Drizzle database instance for job/task/worker state persistence. */
  db: Db;
  /** Worker pool for claiming/releasing workers. */
  pool: WorkerPool;
  /** Optional RPC event bus for publishing lifecycle events to external consumers. */
  rpcBus?: RpcEventBus;
}

/**
 * Mounts job dispatch and lifecycle control routes.
 *
 * @param opts - Router configuration including the loop factory to use.
 * @returns Configured Express Router.
 *
 * @remarks
 * **Endpoints**
 * - `POST   /`                   — dispatch a new job; `409` if the node is already busy
 * - `GET    /`                   — list jobs (optionally filtered by `?status=running,paused`)
 * - `GET    /:jobId`             — return job from DB (or in-memory state if active)
 * - `GET    /:jobId/current-task`— return the currently running task for a job
 * - `POST   /:jobId/pause`      — pause the loop between tasks
 * - `POST   /:jobId/resume`     — resume a paused loop
 * - `POST   /:jobId/cancel`     — cancel the loop (kills the active child process)
 */
export function jobsRouter(opts: JobsRouterOpts): Router {
  const { notify, nodeId, repoPath, loopFactory, db, pool, rpcBus } = opts;

  // Per-node singleton: one active job at a time (in-memory loop handle)
  let activeLoopDep: ReturnType<typeof loopFactory> | null = null;
  let activeJobId: string | null = null;

  const router = Router();

  // ── GET / — list jobs ────────────────────────────────────────────────────

  router.get('/', async (req: Request, res: Response) => {
    const statusParam = req.query['status'];
    const statuses = typeof statusParam === 'string' && statusParam.length > 0
      ? statusParam.split(',')
      : undefined;

    try {
      const jobs = await listJobs(db, statuses
        ? { statuses }
        : undefined);
      res.json(jobs);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'failed to list jobs';
      res.status(500).json({ error: message });
    }
  });

  // ── POST / — dispatch ─────────────────────────────────────────────────────

  router.post('/', async (req: Request, res: Response) => {
    if (activeLoopDep !== null) {
      res.status(409).json({
        error: 'Node is busy',
        jobId: activeJobId,
        status: activeLoopDep.getState().status,
      });
      return;
    }

    const parsed = DispatchJobSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', issues: parsed.error.issues });
      return;
    }

    const data = parsed.data;
    const jobId = data.jobId ?? randomUUID();
    const branch = data.branch ?? '(plan-dispatch)';

    const params: JobParams = {
      jobId,
      branch,
      planId: data.planId,
      planChecksum: data.planChecksum ?? data.plan?.checksum,
      confirmBeforeStart: data.confirmBeforeStart,
      plan: data.plan,
      hooks: data.hooks,
    };

    // Claim an idle worker from the pool
    const worker = await pool.claimIdle();
    if (!worker) {
      res.status(503).json({ error: 'No idle workers available' });
      return;
    }

    // Persist the job row in the executor's own DB
    try {
      await createJob(db, {
        id: jobId,
        source_id: params.planId,
        branch,
        plan_checksum: params.planChecksum ?? null,
        status: 'pending',
        worker_id: worker.workerId,
        metadata: data.plan
          ? { planName: data.plan.name, planDescription: data.plan.description }
          : null,
      });
    } catch (err) {
      // Release the worker if job creation fails
      await pool.release(worker.workerId);
      const message = err instanceof Error
        ? err.message
        : 'failed to create job';
      res.status(500).json({ error: message });
      return;
    }

    // Seed tasks to DB — from plan payload or will be seeded by dependency after branch checkout
    if (data.plan) {
      try {
        await bulkCreateTasks(db, jobId, data.plan.tasks);
      } catch (err) {
        await pool.release(worker.workerId);
        const message = err instanceof Error
          ? err.message
          : 'failed to create tasks';
        res.status(500).json({ error: message });
        return;
      }
    }

    const loopDep = loopFactory(params, repoPath, notify, nodeId, db, worker, rpcBus);
    activeLoopDep = loopDep;
    activeJobId = jobId;

    try {
      await loopDep.dependency.start();
    } catch (err) {
      // onStart threw (prerequisites failed, workspace error, etc.)
      activeLoopDep = null;
      activeJobId = null;
      // Release worker back to pool on startup failure
      try {
        await worker.cleanWorkspace();
      } catch { /* best-effort cleanup */ }
      await pool.release(worker.workerId);
      // DB status is already updated by the dependency/runner
      const message = err instanceof Error
        ? err.message
        : 'job startup failed';
      res.status(422).json({ error: message });
      return;
    }

    // When the loop finishes (background promise), free the slot and release the worker
    void (async () => {
      const terminal: JobState['status'][] = [
        'completed',
        'failed',
        'cancelled',
        'blocked',
      ];
      while (true) {
        const st = loopDep.getState().status;
        if (terminal.includes(st)) break;
        await new Promise((r) => setTimeout(r, 1_000));
      }
      // Clean up worker workspace and release back to pool
      try {
        await worker.cleanWorkspace();
      } catch { /* best-effort cleanup */ }
      await pool.release(worker.workerId);
      if (activeJobId === jobId) {
        activeLoopDep = null;
        activeJobId = null;
      }
    })();

    res.status(202).json({
      jobId,
      status: loopDep.getState().status,
      nodeId,
    });
  });

  // ── GET /:jobId ───────────────────────────────────────────────────────────

  router.get('/:jobId', async (req: Request, res: Response) => {
    const jobId = req.params['jobId']!;

    // If this is the active job, return live in-memory state
    if (activeLoopDep && jobId === activeJobId) {
      res.json(activeLoopDep.getState());
      return;
    }

    // Otherwise, look up from the DB (historical or foreign jobs)
    try {
      const job = await getJob(db, jobId);
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      res.json(job);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'failed to get job';
      res.status(500).json({ error: message });
    }
  });

  // ── GET /:jobId/tasks ─────────────────────────────────────────────────────

  router.get('/:jobId/tasks', async (req: Request, res: Response) => {
    const jobId = req.params['jobId']!;

    try {
      const tasks = await listJobTasks(db, jobId);
      res.json({ tasks });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'failed to list tasks';
      res.status(500).json({ error: message });
    }
  });

  // ── GET /:jobId/current-task ──────────────────────────────────────────────

  router.get('/:jobId/current-task', async (req: Request, res: Response) => {
    const jobId = req.params['jobId']!;

    try {
      const task = await getCurrentTask(db, jobId);
      res.json({ task: task ?? null });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'failed to get current task';
      res.status(500).json({ error: message });
    }
  });

  // ── POST /:jobId/pause ────────────────────────────────────────────────────

  router.post('/:jobId/pause', async (req: Request, res: Response) => {
    if (!activeLoopDep || req.params['jobId'] !== activeJobId) {
      res.status(404).json({ error: 'Job not found or not active on this node' });
      return;
    }
    try {
      await activeLoopDep.dependency.pause?.();
      res.json({ jobId: activeJobId, status: activeLoopDep.getState().status });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'pause failed';
      res.status(409).json({ error: message });
    }
  });

  // ── POST /:jobId/resume ───────────────────────────────────────────────────

  router.post('/:jobId/resume', async (req: Request, res: Response) => {
    if (!activeLoopDep || req.params['jobId'] !== activeJobId) {
      res.status(404).json({ error: 'Job not found or not active on this node' });
      return;
    }
    try {
      await activeLoopDep.dependency.resume?.();
      res.json({ jobId: activeJobId, status: activeLoopDep.getState().status });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'resume failed';
      res.status(409).json({ error: message });
    }
  });

  // ── POST /:jobId/cancel ───────────────────────────────────────────────────

  router.post('/:jobId/cancel', async (req: Request, res: Response) => {
    if (!activeLoopDep || req.params['jobId'] !== activeJobId) {
      res.status(404).json({ error: 'Job not found or not active on this node' });
      return;
    }
    const dep = activeLoopDep;
    const jid = activeJobId;
    activeLoopDep = null;
    activeJobId = null;

    await dep.dependency.stop();
    res.json({ jobId: jid, status: dep.getState().status });
  });

  return router;
}
