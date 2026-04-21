/**
 * @packageDocumentation
 * Express router for worker pool management.
 *
 * Exposes endpoints for registering, listing, and removing workers from the
 * executor's worker pool. Worker state is synced to the `workersTable`.
 */

import type { Db } from '../db/index.js';
import type { WorkerPool } from '../workers/pool.js';
import type { Request, Response } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { listWorkers } from '../store/workers.js';
import { DockerExecWorkerClient } from '../workers/docker-exec.js';
import { HttpWorkerClient } from '../workers/http.js';
import { LocalSpawnWorkerClient } from '../workers/local-spawn.js';
import { TaskWorkerHttpClient } from '../workers/task-worker-http-client.js';

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const RegisterWorkerSchema = z.object({
  /** Worker type: `local`, `docker`, `http` (deprecated), or `task-worker`. */
  type: z.enum(['local', 'docker', 'http', 'task-worker']),
  /** Address or container ID, depending on type. */
  address: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

interface WorkersRouterOpts {
  pool: WorkerPool;
  db: Db;
}

/**
 * Mounts worker management routes.
 *
 * @param opts - Router configuration.
 * @returns Configured Express Router.
 *
 * @remarks
 * **Endpoints**
 * - `GET    /`            — list all registered workers with their status
 * - `PUT    /:workerId`   — register a new worker (or update an existing one)
 * - `DELETE /:workerId`   — unregister a worker from the pool
 */
export function workersRouter(opts: WorkersRouterOpts): Router {
  const { pool, db } = opts;

  const router = Router();

  // ── GET / — list workers ─────────────────────────────────────────────────

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const workers = await listWorkers(db);
      res.json({
        total: pool.size,
        idle: pool.idleCount,
        workers,
      });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'failed to list workers';
      res.status(500).json({ error: message });
    }
  });

  // ── PUT /:workerId — register worker ─────────────────────────────────────

  router.put('/:workerId', async (req: Request, res: Response) => {
    const workerId = req.params['workerId']!;
    const parsed = RegisterWorkerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', issues: parsed.error.issues });
      return;
    }

    const { type, address } = parsed.data;

    let client;
    switch (type) {
      case 'local':
        client = new LocalSpawnWorkerClient(workerId, address);
        break;
      case 'docker':
        client = new DockerExecWorkerClient(workerId, address);
        break;
      case 'http':
        client = new HttpWorkerClient(workerId, address);
        break;
      case 'task-worker':
        client = new TaskWorkerHttpClient(workerId, address);
        break;
    }

    try {
      await pool.register(client, address);
      res.json({ workerId, type, address, status: 'idle' });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'failed to register worker';
      res.status(500).json({ error: message });
    }
  });

  // ── DELETE /:workerId — unregister worker ────────────────────────────────

  router.delete('/:workerId', async (req: Request, res: Response) => {
    const workerId = req.params['workerId']!;

    if (!pool.has(workerId)) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }

    try {
      await pool.unregister(workerId);
      res.json({ workerId, status: 'removed' });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'failed to unregister worker';
      res.status(500).json({ error: message });
    }
  });

  return router;
}
