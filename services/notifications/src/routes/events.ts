/**
 * @packageDocumentation
 * Express router for the `/events` endpoint — event ingestion and SSE streaming.
 *
 * Post-refactoring: notifications is pure event fan-out. No job/task lifecycle
 * side-effects — the executor service owns all state transitions.
 */
import type { Db } from '../db/index.js';
import type { EntityKind } from '../entity/types.js';
import type { Request, Response } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { entityRegistry } from '../entity/registry.js';
import { sseBus } from '../sse/bus.js';
import { getEventHistory, storeEvent } from '../store/events.js';

const VALID_KINDS: EntityKind[] = ['anthropic', 'executor', 'mail', 'push', 'reminder', 'prompt', 'webhook'];

function isEntityKind(v: string): v is EntityKind {
  return (VALID_KINDS as string[]).includes(v);
}

// Base envelope for inbound event posts
const EventEnvelopeSchema = z.object({
  jobId: z.string().uuid(),
  nodeId: z.string().min(1),
  type: z.string().min(1),
});

/**
 * Express router for `/events/:kind` and `/events/:kind/:jobId`.
 *
 * @param db - Drizzle database instance.
 * @returns Configured Express Router.
 *
 * @remarks
 * **Endpoints**
 * - `POST /events/:kind` — entity pushes an event; persists, fans out via SSE, triggers delivery hook
 * - `GET /events/:kind/:jobId` — SSE stream; replays history then streams live events
 * - `GET /events/:kind/:jobId/history` — plain JSON array of stored events
 */
export function eventsRouter(db: Db): Router {
  const router = Router({ mergeParams: true });

  // ── POST /events/:kind ────────────────────────────────────────────────────

  router.post('/:kind', async (req: Request, res: Response) => {
    const { kind } = req.params as { kind: string };

    if (!isEntityKind(kind)) {
      res.status(400).json({ error: `Unknown entity kind: ${kind}` });
      return;
    }

    const definition = entityRegistry.get(kind);
    if (!definition) {
      res.status(400).json({ error: `Entity kind "${kind}" not registered` });
      return;
    }

    // Validate envelope fields
    const envelope = EventEnvelopeSchema.safeParse(req.body);
    if (!envelope.success) {
      res.status(400).json({ error: 'Invalid envelope', issues: envelope.error.issues });
      return;
    }

    // Validate payload against entity-specific schema
    const payload = definition.payloadSchema.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: 'Invalid payload', issues: payload.error.issues });
      return;
    }

    const { jobId, nodeId, type: eventType } = envelope.data;
    const fullPayload = { jobId, nodeId, ...payload.data as Record<string, unknown> };

    // Persist
    await storeEvent(db, { jobId, entityKind: kind, eventType, payload: fullPayload });

    // Fan-out via SSE bus (live subscribers get it immediately)
    sseBus.publishEvent(jobId, fullPayload);

    // Fire delivery hook (fire-and-forget — does not affect response)
    if (definition.deliver) {
      void definition.deliver(fullPayload).catch((err: unknown) => {
        console.error('[notifications] entity delivery failed', { kind, jobId, err });
      });
    }

    res.status(202).json({ ok: true });
  });

  // ── GET /events/:kind/:jobId/history (REST) ───────────────────────────────
  // Plain JSON array of stored events — used by the UI for initial history
  // load without opening an SSE connection.

  router.get('/:kind/:jobId/history', async (req: Request, res: Response) => {
    const { kind, jobId } = req.params as { kind: string; jobId: string };

    if (!isEntityKind(kind)) {
      res.status(400).json({ error: `Unknown entity kind: ${kind}` });
      return;
    }

    const history = await getEventHistory(db, jobId);
    res.json(history);
  });

  // ── GET /events/:kind/:jobId (SSE) ────────────────────────────────────────

  router.get('/:kind/:jobId', async (req: Request, res: Response) => {
    const { kind, jobId } = req.params as { kind: string; jobId: string };

    if (!isEntityKind(kind)) {
      res.status(400).json({ error: `Unknown entity kind: ${kind}` });
      return;
    }

    // Fetch history for replay
    const history = await getEventHistory(db, jobId);
    const historyPayloads = history.map((e) => e.payload);

    sseBus.attachEventStream(res, jobId, historyPayloads);
  });

  return router;
}
