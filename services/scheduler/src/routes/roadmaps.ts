/**
 * @packageDocumentation
 * Express router for roadmap management — CRUD, execution, cancellation.
 */

import type { Db } from '../db/index.js';
import type { ExecutorClient } from '../executor/client.js';
import type { Request, Response } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { topologicalSort } from '../store/dependencies.js';
import { getPlan } from '../store/plans.js';
import {
  addPlansToRoadmap,
  createRoadmap,
  getRoadmap,
  listRoadmapPlans,
  listRoadmaps,
  updateRoadmap,
} from '../store/roadmaps.js';
import { createLog } from '../store/logs.js';
import {
  cancelRoadmapRun,
  executeRoadmap,
  isRoadmapRunning,
} from '../scheduling/roadmap-runner.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoadmapsRouterDeps {
  db: Db;
  executor: ExecutorClient;
  notificationUrl: string | undefined;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid();

const createRoadmapSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  planIds: z.array(z.string().uuid()).min(1),
});

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function roadmapsRouter({ db, executor, notificationUrl }: RoadmapsRouterDeps): Router {
  const router = Router();

  // GET / — list roadmaps
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const roadmaps = await listRoadmaps(db);
      res.json({ success: true, data: roadmaps });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // GET /:id — get roadmap details with plans
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const parsed = uuidSchema.safeParse(req.params['id']);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid roadmap ID format' });
        return;
      }

      const roadmap = await getRoadmap(db, parsed.data);
      if (!roadmap) {
        res.status(404).json({ success: false, error: 'Roadmap not found' });
        return;
      }

      const entries = await listRoadmapPlans(db, roadmap.id);

      // Enrich with plan details
      const plans = await Promise.all(
        entries.map(async (entry) => {
          const plan = await getPlan(db, entry.plan_id);
          return {
            ...entry,
            plan: plan ?? null,
          };
        }),
      );

      res.json({ success: true, data: { ...roadmap, plans } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // POST / — create roadmap with auto-sorted plans
  router.post('/', async (req: Request, res: Response) => {
    try {
      const body = createRoadmapSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ success: false, error: 'Invalid request', issues: body.error.issues });
        return;
      }

      // Verify all plan IDs exist
      for (const planId of body.data.planIds) {
        const plan = await getPlan(db, planId);
        if (!plan) {
          res.status(404).json({ success: false, error: `Plan ${planId} not found` });
          return;
        }
      }

      // Auto-sort by dependencies (topological sort)
      let sortedPlanIds: string[];
      try {
        sortedPlanIds = await topologicalSort(db, body.data.planIds);
      } catch (cycleError) {
        res.status(409).json({
          success: false,
          error: cycleError instanceof Error
            ? cycleError.message
            : 'Dependency cycle detected',
        });
        return;
      }

      // Create roadmap + junction entries
      const roadmap = await createRoadmap(db, {
        name: body.data.name,
        description: body.data.description,
      });

      const entries = await addPlansToRoadmap(db, roadmap.id, sortedPlanIds);

      await createLog(db, {
        roadmap_id: roadmap.id,
        event_type: 'roadmap.created',
        status_message: `Created with ${sortedPlanIds.length} plan(s)`,
        metadata: { plan_order: sortedPlanIds },
      });

      res.status(201).json({
        success: true,
        data: { ...roadmap, plans: entries },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // POST /:id/execute — execute roadmap (sequential plan dispatch)
  router.post('/:id/execute', async (req: Request, res: Response) => {
    try {
      const parsed = uuidSchema.safeParse(req.params['id']);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid roadmap ID format' });
        return;
      }

      const roadmap = await getRoadmap(db, parsed.data);
      if (!roadmap) {
        res.status(404).json({ success: false, error: 'Roadmap not found' });
        return;
      }

      if (isRoadmapRunning(roadmap.id)) {
        res.status(409).json({ success: false, error: 'Roadmap is already running' });
        return;
      }

      if (roadmap.status === 'running') {
        res.status(409).json({ success: false, error: 'Roadmap is already running' });
        return;
      }

      const entries = await listRoadmapPlans(db, roadmap.id);
      const pendingEntries = entries.filter((e) => e.status === 'pending');
      if (pendingEntries.length === 0) {
        res.status(400).json({ success: false, error: 'No pending plans in this roadmap' });
        return;
      }

      // Fire-and-forget — runs in the background
      void executeRoadmap(db, roadmap.id, executor, notificationUrl).catch((err: unknown) => {
        console.error(`[schedulus] roadmap ${roadmap.id} runner crashed:`, err);
      });

      res.status(202).json({
        success: true,
        data: { roadmapId: roadmap.id, status: 'running', pendingPlans: pendingEntries.length },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // POST /:id/cancel — cancel roadmap execution
  router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const parsed = uuidSchema.safeParse(req.params['id']);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid roadmap ID format' });
        return;
      }

      const roadmap = await getRoadmap(db, parsed.data);
      if (!roadmap) {
        res.status(404).json({ success: false, error: 'Roadmap not found' });
        return;
      }

      if (!isRoadmapRunning(roadmap.id)) {
        res.status(409).json({ success: false, error: 'Roadmap is not running' });
        return;
      }

      cancelRoadmapRun(roadmap.id);

      res.json({
        success: true,
        data: { roadmapId: roadmap.id, status: 'cancelling' },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // DELETE /:id — soft-delete roadmap
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const parsed = uuidSchema.safeParse(req.params['id']);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid roadmap ID format' });
        return;
      }

      const roadmap = await getRoadmap(db, parsed.data);
      if (!roadmap) {
        res.status(404).json({ success: false, error: 'Roadmap not found' });
        return;
      }

      if (isRoadmapRunning(roadmap.id)) {
        res.status(409).json({ success: false, error: 'Cannot delete a running roadmap' });
        return;
      }

      await updateRoadmap(db, roadmap.id, { status: 'deleted' });
      res.json({ success: true, data: { id: roadmap.id, status: 'deleted' } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  return router;
}
