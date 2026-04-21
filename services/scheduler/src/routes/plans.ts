/**
 * @packageDocumentation
 * Express router for plan management — CRUD, generation, execution, cancellation.
 */

import type { Db } from '../db/index.js';
import type { ExecutorClient } from '../executor/client.js';
import type { Request, Response } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { subscribeToPlanEvents, unsubscribeFromPlan } from '../notifications/event-handler.js';
import { getPlan, listPlans, updatePlan } from '../store/plans.js';
import { getRequirement, updateRequirement } from '../store/requirements.js';
import { listPlanTasks } from '../store/tasks.js';
import { createLog } from '../store/logs.js';
import { generatePlanFromRequirement } from '../workflow/plan-generator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlansRouterDeps {
  db: Db;
  executor: ExecutorClient;
  notificationUrl: string | undefined;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid();

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum([
    'backlog', 'ready', 'dispatched', 'running',
    'completed', 'failed', 'cancelled', 'blocked', 'deleted',
  ]).optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function plansRouter({ db, executor, notificationUrl }: PlansRouterDeps): Router {
  const router = Router();

  // GET / — list plans
  router.get('/', async (req: Request, res: Response) => {
    try {
      const filters: { status?: string; requirementId?: string } = {};

      if (typeof req.query['status'] === 'string') {
        filters.status = req.query['status'];
      }
      if (typeof req.query['requirementId'] === 'string') {
        filters.requirementId = req.query['requirementId'];
      }

      const plans = await listPlans(db, filters);
      res.json({ success: true, data: plans });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // GET /:id — get plan details with tasks
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const parsed = uuidSchema.safeParse(req.params['id']);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid plan ID format' });
        return;
      }

      const plan = await getPlan(db, parsed.data);
      if (!plan) {
        res.status(404).json({ success: false, error: 'Plan not found' });
        return;
      }

      const tasks = await listPlanTasks(db, plan.id);
      res.json({ success: true, data: { ...plan, tasks } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // POST / — create plan from requirement
  router.post('/', async (req: Request, res: Response) => {
    try {
      const body = z.object({
        requirementId: z.string().uuid(),
      }).safeParse(req.body);

      if (!body.success) {
        res.status(400).json({ success: false, error: 'Invalid request', issues: body.error.issues });
        return;
      }

      const requirement = await getRequirement(db, body.data.requirementId);
      if (!requirement) {
        res.status(404).json({ success: false, error: 'Requirement not found' });
        return;
      }

      if (requirement.status === 'pending_validation') {
        res.status(409).json({
          success: false,
          error: 'Requirement has unresolved validation issues',
        });
        return;
      }

      if (requirement.status === 'planned') {
        res.status(409).json({
          success: false,
          error: 'Requirement already has an associated plan',
        });
        return;
      }

      // Transition requirement to planning state
      await updateRequirement(db, requirement.id, { status: 'planning' });

      try {
        const result = await generatePlanFromRequirement(db, requirement);

        // Transition requirement to planned
        await updateRequirement(db, requirement.id, { status: 'planned' });

        const tasks = await listPlanTasks(db, result.plan.id);
        res.status(201).json({
          success: true,
          data: {
            ...result.plan,
            tasks,
            generation: {
              method: result.method,
              taskCount: result.taskCount,
            },
          },
        });
      } catch (genError) {
        // Revert requirement status on generation failure
        await updateRequirement(db, requirement.id, { status: 'validated' });
        throw genError;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // PUT /:id — update plan
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const parsed = uuidSchema.safeParse(req.params['id']);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid plan ID format' });
        return;
      }

      const body = updatePlanSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ success: false, error: 'Invalid request', issues: body.error.issues });
        return;
      }

      const plan = await getPlan(db, parsed.data);
      if (!plan) {
        res.status(404).json({ success: false, error: 'Plan not found' });
        return;
      }

      const updated = await updatePlan(db, plan.id, body.data);
      res.json({ success: true, data: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // DELETE /:id — soft-delete plan
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const parsed = uuidSchema.safeParse(req.params['id']);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid plan ID format' });
        return;
      }

      const plan = await getPlan(db, parsed.data);
      if (!plan) {
        res.status(404).json({ success: false, error: 'Plan not found' });
        return;
      }

      if (plan.status === 'running' || plan.status === 'dispatched') {
        res.status(409).json({
          success: false,
          error: 'Cannot delete a plan that is currently running or dispatched',
        });
        return;
      }

      await updatePlan(db, plan.id, { status: 'deleted' });
      res.json({ success: true, data: { id: plan.id, status: 'deleted' } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // POST /:id/execute — dispatch plan to executor
  router.post('/:id/execute', async (req: Request, res: Response) => {
    try {
      const parsed = uuidSchema.safeParse(req.params['id']);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid plan ID format' });
        return;
      }

      const plan = await getPlan(db, parsed.data);
      if (!plan) {
        res.status(404).json({ success: false, error: 'Plan not found' });
        return;
      }

      if (plan.status !== 'ready' && plan.status !== 'backlog' && plan.status !== 'failed') {
        res.status(409).json({
          success: false,
          error: `Plan cannot be executed in '${plan.status}' state`,
        });
        return;
      }

      const tasks = await listPlanTasks(db, plan.id);
      if (tasks.length === 0) {
        res.status(400).json({ success: false, error: 'Plan has no tasks to execute' });
        return;
      }

      // Dispatch to executor
      const result = await executor.dispatch(plan.id, {
        name: plan.name,
        description: plan.description ?? undefined,
        tasks: tasks.map((t) => ({ index: t.task_index, text: t.task_text })),
      });

      // Update plan with executor job ID and status
      await updatePlan(db, plan.id, {
        executor_job_id: result.jobId,
        status: 'dispatched',
      });

      await createLog(db, {
        plan_id: plan.id,
        event_type: 'plan.dispatched',
        status_message: `Dispatched to executor as job ${result.jobId}`,
        metadata: { executor_job_id: result.jobId },
      });

      // Subscribe to executor events for status mirroring
      subscribeToPlanEvents(db, plan.id, result.jobId, notificationUrl);

      res.json({
        success: true,
        data: {
          planId: plan.id,
          executorJobId: result.jobId,
          status: 'dispatched',
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // POST /:id/cancel — cancel plan execution
  router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const parsed = uuidSchema.safeParse(req.params['id']);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid plan ID format' });
        return;
      }

      const plan = await getPlan(db, parsed.data);
      if (!plan) {
        res.status(404).json({ success: false, error: 'Plan not found' });
        return;
      }

      if (!plan.executor_job_id) {
        res.status(400).json({ success: false, error: 'Plan has not been dispatched to executor' });
        return;
      }

      if (plan.status !== 'dispatched' && plan.status !== 'running') {
        res.status(409).json({
          success: false,
          error: `Plan cannot be cancelled in '${plan.status}' state`,
        });
        return;
      }

      const result = await executor.cancel(plan.executor_job_id);

      await updatePlan(db, plan.id, { status: 'cancelled' });

      await createLog(db, {
        plan_id: plan.id,
        event_type: 'plan.cancelled',
        status_message: 'Cancelled via API',
      });

      unsubscribeFromPlan(plan.id);

      res.json({
        success: true,
        data: {
          planId: plan.id,
          executorJobId: result.jobId,
          status: 'cancelled',
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  return router;
}
