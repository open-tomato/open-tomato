/**
 * @packageDocumentation
 * Express router for the `/approvals` human-gate workflow endpoints.
 */
import type { Db } from '../db/index.js';
import type { EntityKind } from '../entity/types.js';
import type { Request, Response } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { sseBus } from '../sse/bus.js';
import {
  createApproval,
  decideApproval,
  getAllPendingApprovals,
  getApproval,
  getPendingApprovals,
} from '../store/approvals.js';

const CreateApprovalSchema = z.object({
  requestId: z.string().uuid(),
  jobId: z.string().uuid(),
  nodeId: z.string().min(1),
  entityKind: z.enum(['executor', 'mail', 'push', 'reminder', 'prompt', 'webhook']),
  type: z.enum(['prerequisite', 'human-loop']),
  description: z.string().min(1),
  options: z.array(z.string()).optional(),
});

const DecideApprovalSchema = z.object({
  decision: z.enum(['granted', 'denied']),
  note: z.string().optional(),
});

/**
 * Express router for the `/approvals` human-gate workflow.
 *
 * @param db - Drizzle database instance.
 * @returns Configured Express Router.
 *
 * @remarks
 * **Endpoints**
 * - `POST /approvals` — entity requests a human gate; returns `201` with the approval record
 * - `GET  /approvals?jobId=&pending=true` — list pending approvals (all jobs or filtered by jobId)
 * - `GET  /approvals/:requestId/wait` — SSE stream; resolves once a decision is published
 * - `POST /approvals/:requestId/decide` — human grants or denies; notifies waiting executor via SSE
 */
export function approvalsRouter(db: Db): Router {
  const router = Router();

  // ── POST /approvals ───────────────────────────────────────────────────────

  router.post('/', async (req: Request, res: Response) => {
    const parsed = CreateApprovalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', issues: parsed.error.issues });
      return;
    }

    const { requestId, jobId, entityKind, type, description, options } = parsed.data;

    const approval = await createApproval(db, {
      requestId,
      jobId,
      entityKind: entityKind as EntityKind,
      approvalType: type,
      description,
      options,
    });

    res.status(201).json(approval);
  });

  // ── GET /approvals ────────────────────────────────────────────────────────

  router.get('/', async (req: Request, res: Response) => {
    const { jobId, pending } = req.query as { jobId?: string; pending?: string };

    if (jobId) {
      const approvals = pending === 'true'
        ? await getPendingApprovals(db, jobId)
        : await getPendingApprovals(db, jobId); // default to pending; extend later

      res.json(approvals);
      return;
    }

    // No jobId filter — return all pending across all jobs (approval inbox)
    const approvals = await getAllPendingApprovals(db);
    res.json(approvals);
  });

  // ── GET /approvals/:requestId/wait (SSE) ──────────────────────────────────

  router.get('/:requestId/wait', async (req: Request, res: Response) => {
    const { requestId } = req.params as { requestId: string };

    // If already decided, return immediately as a single SSE event + close
    const existing = await getApproval(db, requestId);
    if (existing && existing.status !== 'pending') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ decision: existing.status, note: existing.decision_note })}\n\n`);
      res.end();
      return;
    }

    // Attach SSE wait — resolves when decideApproval publishes to the bus
    sseBus.attachApprovalWait(res, requestId);
  });

  // ── POST /approvals/:requestId/decide ─────────────────────────────────────

  router.post('/:requestId/decide', async (req: Request, res: Response) => {
    const { requestId } = req.params as { requestId: string };

    const parsed = DecideApprovalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', issues: parsed.error.issues });
      return;
    }

    const updated = await decideApproval(db, {
      requestId,
      decision: parsed.data.decision,
      note: parsed.data.note,
    });

    if (!updated) {
      res.status(404).json({
        error: 'Approval not found or already decided',
        requestId,
      });
      return;
    }

    // Notify the waiting executor via SSE bus
    sseBus.publishApprovalDecision(requestId, {
      decision: updated.status,
      note: updated.decision_note,
    });

    res.json(updated);
  });

  return router;
}
