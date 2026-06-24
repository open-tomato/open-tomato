/**
 * @packageDocumentation
 * Express router for the `/robot/response`, `/robot/guidance`, and
 * `/robot/message` webhook endpoints — inbound human-in-the-loop message
 * handling with optional multi-session routing via {@link SessionRegistry}.
 */
import type { HttpWebhookRobotService } from './http-webhook-robot-service.js';
import type { IncomingMessage, RobotService } from '@open-tomato/types';
import type { Request, Response } from 'express';

import {
  HumanResponseEventSchema,
  HumanGuidanceEventSchema,
} from '@open-tomato/types';
import { Router } from 'express';

import { SessionRegistry } from './session-registry.js';

/**
 * Options accepted by {@link robotRouter}.
 *
 * Provide **either** `service` (single-service mode) **or** `registry`
 * (multi-session mode).  When `registry` is supplied, incoming payloads are
 * routed to the {@link RobotService} instance that owns the target session.
 */
export interface RobotRouterOpts {
  /** Single-service mode — all sessions served by one HttpWebhookRobotService. */
  readonly service?: HttpWebhookRobotService;

  /** Multi-session mode — routes by sessionId to per-session RobotService instances. */
  readonly registry?: SessionRegistry;
}

/**
 * Extracts `sessionId` from a raw body, returning `undefined` if missing or
 * not a non-empty string.
 */
function extractSessionId(body: unknown): string | undefined {
  if (
    typeof body === 'object' &&
    body !== null &&
    'sessionId' in body &&
    typeof (body as Record<string, unknown>).sessionId === 'string' &&
    ((body as Record<string, unknown>).sessionId as string).length > 0
  ) {
    return (body as Record<string, unknown>).sessionId as string;
  }
  return undefined;
}

/**
 * Parses a raw body into an {@link IncomingMessage}, returning `undefined`
 * if the shape is invalid.
 */
function parseIncomingMessage(body: unknown): IncomingMessage | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const obj = body as Record<string, unknown>;
  if (typeof obj.text !== 'string' || obj.text.length === 0) return undefined;
  const message: IncomingMessage = { text: obj.text };
  if (typeof obj.replyToSessionId === 'string' && obj.replyToSessionId.length > 0) {
    return { text: obj.text, replyToSessionId: obj.replyToSessionId };
  }
  return message;
}

/**
 * Express router factory for the human-in-the-loop webhook endpoints.
 *
 * Mounts POST routes that accept inbound messages from the human operator
 * and delegate to the appropriate {@link RobotService}:
 *
 * - `POST /response` — human reply to a blocking question
 * - `POST /guidance` — proactive guidance injected into the prompt
 * - `POST /message`  — generic {@link IncomingMessage} routed via
 *   {@link resolveSessionId} (registry mode only)
 *
 * In **single-service mode** (`service` option), all messages are handled by
 * one {@link HttpWebhookRobotService}.
 *
 * In **multi-session mode** (`registry` option), the router extracts the
 * `sessionId` from each payload and looks up the owning service in the
 * {@link SessionRegistry}.  The `/message` endpoint applies
 * {@link resolveSessionId} to determine the target session from `@loop-id`
 * prefixes, `replyToSessionId` metadata, or the default session.
 *
 * @param opts - Router dependencies.
 * @returns Configured Express Router.
 */
export function robotRouter({ service, registry }: RobotRouterOpts): Router {
  const router = Router();

  // ── POST /response ──────────────────────────────────────────────────────

  router.post('/response', (req: Request, res: Response) => {
    if (registry) {
      const sessionId = extractSessionId(req.body);
      if (!sessionId) {
        res.status(400).json({ error: 'Invalid request', detail: 'Missing or empty sessionId' });
        return;
      }

      const target = registry.get(sessionId);
      if (!target) {
        res.status(404).json({ error: 'Session not found', sessionId });
        return;
      }

      const result = handleResponse(target, req.body);
      if (!result.ok) {
        res.status(400).json({ error: 'Invalid request', detail: result.error });
        return;
      }

      res.status(202).json({ ok: true });
      return;
    }

    if (!service) {
      res.status(500).json({ error: 'No service or registry configured' });
      return;
    }

    const result = service.handleIncomingResponse(req.body);

    if (!result.ok) {
      res.status(400).json({ error: 'Invalid request', detail: result.error });
      return;
    }

    res.status(202).json({ ok: true });
  });

  // ── POST /guidance ──────────────────────────────────────────────────────

  router.post('/guidance', (req: Request, res: Response) => {
    if (registry) {
      const sessionId = extractSessionId(req.body);
      if (!sessionId) {
        res.status(400).json({ error: 'Invalid request', detail: 'Missing or empty sessionId' });
        return;
      }

      const target = registry.get(sessionId);
      if (!target) {
        res.status(404).json({ error: 'Session not found', sessionId });
        return;
      }

      const result = handleGuidance(target, req.body);
      if (!result.ok) {
        res.status(400).json({ error: 'Invalid request', detail: result.error });
        return;
      }

      res.status(202).json({ ok: true });
      return;
    }

    if (!service) {
      res.status(500).json({ error: 'No service or registry configured' });
      return;
    }

    const result = service.handleIncomingGuidance(req.body);

    if (!result.ok) {
      res.status(400).json({ error: 'Invalid request', detail: result.error });
      return;
    }

    res.status(202).json({ ok: true });
  });

  // ── POST /message (registry mode only) ─────────────────────────────────

  router.post('/message', (req: Request, res: Response) => {
    if (!registry) {
      res.status(400).json({ error: '/message endpoint requires registry mode' });
      return;
    }

    const message = parseIncomingMessage(req.body);
    if (!message) {
      res.status(400).json({ error: 'Invalid message', detail: 'Missing or empty text field' });
      return;
    }

    const resolved = registry.resolveWithId(message);
    if (!resolved) {
      res.status(404).json({ error: 'No matching session' });
      return;
    }

    const { sessionId, service: targetService } = resolved;

    // Reply messages are treated as responses; unprompted messages as guidance.
    if (message.replyToSessionId) {
      targetService.acceptResponse(sessionId, message.text);
    } else {
      targetService.acceptGuidance(sessionId, message.text);
    }

    res.status(202).json({ ok: true, sessionId });
  });

  return router;
}

// ── Validation + injection helpers for generic RobotService instances ─────

function handleResponse(
  service: RobotService,
  body: unknown,
): { ok: true } | { ok: false; error: string } {
  const result = HumanResponseEventSchema.safeParse(body);
  if (!result.success) return { ok: false, error: result.error.message };
  service.acceptResponse(result.data.sessionId, result.data.response);
  return { ok: true };
}

function handleGuidance(
  service: RobotService,
  body: unknown,
): { ok: true } | { ok: false; error: string } {
  const result = HumanGuidanceEventSchema.safeParse(body);
  if (!result.success) return { ok: false, error: result.error.message };
  service.acceptGuidance(result.data.sessionId, result.data.guidance);
  return { ok: true };
}
