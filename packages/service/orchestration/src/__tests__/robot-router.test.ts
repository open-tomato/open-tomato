import type { GuidanceAccumulator } from '../guidance-accumulator.js';
import type { RobotService } from '@open-tomato/types';
import type { Server } from 'bun';
import type { Server as NodeServer } from 'node:http';

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import express from 'express';

import { HttpWebhookRobotService } from '../http-webhook-robot-service.js';
import { robotRouter } from '../robot-router.js';
import { SessionRegistry } from '../session-registry.js';

/** Helper to access the protected guidanceAccumulator for test assertions. */
function getAccumulator(svc: HttpWebhookRobotService): GuidanceAccumulator {
  return (svc as unknown as { guidanceAccumulator: GuidanceAccumulator })
    .guidanceAccumulator;
}

// ── Helpers ───────────────────────────────────────────────────────────────

interface ReceivedRequest {
  readonly method: string;
  readonly body: unknown;
}

/** Minimal outbound webhook sink that records requests and always returns 200. */
function createOutboundSink(): {
  start: () => Promise<{ url: string }>;
  stop: () => void;
  requests: ReceivedRequest[];
} {
  let server: Server<undefined> | undefined;
  const requests: ReceivedRequest[] = [];
  return {
    requests,
    async start() {
      server = Bun.serve({
        port: 0,
        async fetch(req) {
          const body = await req.json().catch(() => null);
          requests.push({ method: req.method, body });
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });
      return { url: `http://localhost:${server.port}` };
    },
    stop() {
      server?.stop(true);
    },
  };
}

/** Boots an Express app with the robot router on an ephemeral port. */
function listenOnEphemeralPort(
  service: HttpWebhookRobotService,
): Promise<{ baseUrl: string; server: NodeServer }> {
  const app = express();
  app.use(express.json());
  app.use('/robot', robotRouter({ service }));

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr
        ? addr.port
        : 0;
      resolve({ baseUrl: `http://localhost:${port}`, server });
    });
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('robotRouter', () => {
  let outbound: ReturnType<typeof createOutboundSink>;
  let outboundRequests: ReceivedRequest[];
  let service: HttpWebhookRobotService;
  let baseUrl: string;
  let appServer: NodeServer;

  beforeEach(async () => {
    outbound = createOutboundSink();
    outboundRequests = outbound.requests;
    const { url } = await outbound.start();

    service = new HttpWebhookRobotService({
      webhookUrl: url,
      timeoutMs: 2_000,
      pollIntervalMs: 10,
      maxRetries: 2,
      baseRetryDelayMs: 10,
    });

    ({ baseUrl, server: appServer } = await listenOnEphemeralPort(service));
  });

  afterEach(async () => {
    await service.shutdown();
    appServer.close();
    outbound.stop();
  });

  // ── POST /robot/response ──────────────────────────────────────────────

  describe('POST /robot/response', () => {
    it('returns 202 for a valid response payload', async () => {
      const res = await fetch(`${baseUrl}/robot/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.response',
          sessionId: 's1',
          response: 'approved',
          timestamp: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body).toEqual({ ok: true });
    });

    it('returns 400 for an invalid payload', async () => {
      const res = await fetch(`${baseUrl}/robot/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'human.response' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid request');
      expect(body.detail).toBeTypeOf('string');
    });

    it('returns 400 when type is wrong', async () => {
      const res = await fetch(`${baseUrl}/robot/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.guidance',
          sessionId: 's1',
          guidance: 'not a response',
          timestamp: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(400);
    });

    it('unblocks an in-flight sendQuestion', async () => {
      const questionPromise = service.sendQuestion('s1', 'proceed?');

      setTimeout(async () => {
        await fetch(`${baseUrl}/robot/response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'human.response',
            sessionId: 's1',
            response: 'yes, go ahead',
            timestamp: new Date().toISOString(),
          }),
        });
      }, 50);

      const result = await questionPromise;
      expect(result).toBe('yes, go ahead');
    });
  });

  // ── POST /robot/guidance ──────────────────────────────────────────────

  describe('POST /robot/guidance', () => {
    it('returns 202 for a valid guidance payload', async () => {
      const res = await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.guidance',
          sessionId: 's1',
          guidance: 'focus on error handling',
          timestamp: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body).toEqual({ ok: true });
    });

    it('returns 400 for an invalid payload', async () => {
      const res = await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'human.guidance' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid request');
      expect(body.detail).toBeTypeOf('string');
    });

    it('returns 400 when type is wrong', async () => {
      const res = await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.response',
          sessionId: 's1',
          response: 'not guidance',
          timestamp: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(400);
    });

    it('notifies registered guidance handlers', async () => {
      const received: Array<{ sessionId: string; guidance: string }> = [];
      service.onGuidance((sessionId, guidance) => {
        received.push({ sessionId, guidance });
      });

      await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.guidance',
          sessionId: 's1',
          guidance: 'watch the logs',
          timestamp: new Date().toISOString(),
        }),
      });

      expect(received).toEqual([
        { sessionId: 's1', guidance: 'watch the logs' },
      ]);
    });
  });

  // ── Integration: full HTTP round-trip scenarios ─────────────────────────

  describe('integration: question delivery', () => {
    it('outbound POST reaches the mock webhook server', async () => {
      const promise = service.sendQuestion('s1', 'deploy to prod?', 200);

      // Let it timeout — we only care about the outbound request
      await promise;

      expect(outboundRequests.length).toBeGreaterThanOrEqual(1);

      const req = outboundRequests[0]!;
      expect(req.method).toBe('POST');
      expect(req.body).toMatchObject({
        type: 'human.interact',
        sessionId: 's1',
        question: 'deploy to prod?',
      });
      expect((req.body as Record<string, unknown>).timestamp).toBeTypeOf(
        'string',
      );
    });
  });

  describe('integration: response receipt unblocks wait', () => {
    it('HTTP response POST unblocks an in-flight sendQuestion', async () => {
      const questionPromise = service.sendQuestion('s2', 'continue?');

      // Simulate human replying via the HTTP endpoint after a short delay
      setTimeout(async () => {
        await fetch(`${baseUrl}/robot/response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'human.response',
            sessionId: 's2',
            response: 'yes, continue',
            timestamp: new Date().toISOString(),
          }),
        });
      }, 50);

      const result = await questionPromise;
      expect(result).toBe('yes, continue');
    });

    it('routes responses to the correct session', async () => {
      const p1 = service.sendQuestion('session-a', 'q1?');
      const p2 = service.sendQuestion('session-b', 'q2?');

      setTimeout(async () => {
        await fetch(`${baseUrl}/robot/response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'human.response',
            sessionId: 'session-b',
            response: 'answer-b',
            timestamp: new Date().toISOString(),
          }),
        });
        await fetch(`${baseUrl}/robot/response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'human.response',
            sessionId: 'session-a',
            response: 'answer-a',
            timestamp: new Date().toISOString(),
          }),
        });
      }, 50);

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe('answer-a');
      expect(r2).toBe('answer-b');
    });
  });

  describe('integration: guidance accumulation', () => {
    it('multiple guidance POSTs accumulate and flush as numbered list', async () => {
      await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.guidance',
          sessionId: 's1',
          guidance: 'use defensive checks',
          timestamp: new Date().toISOString(),
        }),
      });
      await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.guidance',
          sessionId: 's1',
          guidance: 'avoid mutations',
          timestamp: new Date().toISOString(),
        }),
      });
      await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.guidance',
          sessionId: 's1',
          guidance: 'add logging',
          timestamp: new Date().toISOString(),
        }),
      });

      const flushed = getAccumulator(service).flush('s1');
      expect(flushed).toBe(
        '1. use defensive checks\n2. avoid mutations\n3. add logging',
      );
    });

    it('flush clears accumulated guidance', async () => {
      await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.guidance',
          sessionId: 's1',
          guidance: 'first entry',
          timestamp: new Date().toISOString(),
        }),
      });

      const first = getAccumulator(service).flush('s1');
      expect(first).toBe('1. first entry');

      const second = getAccumulator(service).flush('s1');
      expect(second).toBeNull();
    });

    it('guidance for different sessions does not cross-contaminate', async () => {
      await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.guidance',
          sessionId: 'session-x',
          guidance: 'tip for x',
          timestamp: new Date().toISOString(),
        }),
      });
      await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.guidance',
          sessionId: 'session-y',
          guidance: 'tip for y',
          timestamp: new Date().toISOString(),
        }),
      });

      expect(getAccumulator(service).flush('session-x')).toBe('1. tip for x');
      expect(getAccumulator(service).flush('session-y')).toBe('1. tip for y');
    });
  });

  describe('integration: timeout path', () => {
    it('sendQuestion returns null when no response arrives within timeout', async () => {
      const result = await service.sendQuestion('s1', 'anyone there?', 100);
      expect(result).toBeNull();
    });

    it('outbound question is still delivered even when response times out', async () => {
      await service.sendQuestion('s1', 'will timeout', 100);

      expect(outboundRequests.length).toBeGreaterThanOrEqual(1);
      expect(outboundRequests[0]!.body).toMatchObject({
        type: 'human.interact',
        sessionId: 's1',
        question: 'will timeout',
      });
    });

    it('shutdown aborts in-flight sendQuestion before timeout', async () => {
      const promise = service.sendQuestion('s1', 'will be aborted', 10_000);

      setTimeout(() => service.shutdown(), 50);

      const result = await promise;
      expect(result).toBeNull();
    });
  });
});

// ── Registry-mode tests ────────────────────────────────────────────────────

function stubService(label: string): RobotService & {
  readonly responses: Array<{ sessionId: string; response: string }>;
  readonly guidances: Array<{ sessionId: string; guidance: string }>;
} {
  const responses: Array<{ sessionId: string; response: string }> = [];
  const guidances: Array<{ sessionId: string; guidance: string }> = [];
  return {
    sendQuestion: async () => `${label}-answer`,
    sendCheckin: async () => {},
    onGuidance: () => {},
    flushGuidance: () => null,
    acceptResponse(sessionId: string, response: string) {
      responses.push({ sessionId, response });
    },
    acceptGuidance(sessionId: string, guidance: string) {
      guidances.push({ sessionId, guidance });
    },
    shutdown: async () => {},
    responses,
    guidances,
  };
}

describe('robotRouter — registry mode', () => {
  let appServer: NodeServer;
  let baseUrl: string;
  let deployService: ReturnType<typeof stubService>;
  let buildService: ReturnType<typeof stubService>;
  let mainService: ReturnType<typeof stubService>;
  let registry: SessionRegistry;

  beforeEach(async () => {
    deployService = stubService('deploy');
    buildService = stubService('build');
    mainService = stubService('main');

    registry = new SessionRegistry(new Map())
      .register('deploy', deployService)
      .register('build', buildService)
      .register('main', mainService);

    const app = express();
    app.use(express.json());
    app.use('/robot', robotRouter({ registry }));

    await new Promise<void>((resolve) => {
      appServer = app.listen(0, () => {
        const addr = appServer.address();
        const port = typeof addr === 'object' && addr
          ? addr.port
          : 0;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterEach(() => {
    appServer.close();
  });

  // ── POST /response with registry ──────────────────────────────────────

  describe('POST /robot/response', () => {
    it('routes response to correct service by sessionId', async () => {
      const res = await fetch(`${baseUrl}/robot/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.response',
          sessionId: 'deploy',
          response: 'approved',
          timestamp: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(202);
      expect(deployService.responses).toEqual([
        { sessionId: 'deploy', response: 'approved' },
      ]);
      expect(buildService.responses).toHaveLength(0);
    });

    it('returns 404 for an unknown sessionId', async () => {
      const res = await fetch(`${baseUrl}/robot/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.response',
          sessionId: 'unknown-session',
          response: 'yes',
          timestamp: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.sessionId).toBe('unknown-session');
    });

    it('returns 400 for payload missing sessionId', async () => {
      const res = await fetch(`${baseUrl}/robot/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'human.response' }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /guidance with registry ──────────────────────────────────────

  describe('POST /robot/guidance', () => {
    it('routes guidance to correct service by sessionId', async () => {
      const res = await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.guidance',
          sessionId: 'build',
          guidance: 'watch the logs',
          timestamp: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(202);
      expect(buildService.guidances).toEqual([
        { sessionId: 'build', guidance: 'watch the logs' },
      ]);
      expect(deployService.guidances).toHaveLength(0);
    });

    it('returns 404 for an unknown sessionId', async () => {
      const res = await fetch(`${baseUrl}/robot/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human.guidance',
          sessionId: 'ghost',
          guidance: 'hello',
          timestamp: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(404);
    });
  });

  // ── POST /message — resolveSessionId routing ─────────────────────────

  describe('POST /robot/message', () => {
    it('routes by @prefix to the correct service', async () => {
      const res = await fetch(`${baseUrl}/robot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '@deploy proceed with rollout' }),
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.sessionId).toBe('deploy');
      expect(deployService.guidances).toEqual([
        { sessionId: 'deploy', guidance: '@deploy proceed with rollout' },
      ]);
    });

    it('routes by replyToSessionId to the correct service', async () => {
      const res = await fetch(`${baseUrl}/robot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'yes, go ahead',
          replyToSessionId: 'build',
        }),
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.sessionId).toBe('build');
      // replyToSessionId present → treated as response
      expect(buildService.responses).toEqual([
        { sessionId: 'build', response: 'yes, go ahead' },
      ]);
    });

    it('falls back to main session when no routing signal', async () => {
      const res = await fetch(`${baseUrl}/robot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'just a general note' }),
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.sessionId).toBe('main');
      expect(mainService.guidances).toEqual([
        { sessionId: 'main', guidance: 'just a general note' },
      ]);
    });

    it('returns 404 when resolved session is not registered', async () => {
      const res = await fetch(`${baseUrl}/robot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '@unknown do something' }),
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid message payload', async () => {
      const res = await fetch(`${baseUrl}/robot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it('@prefix takes precedence over replyToSessionId', async () => {
      const res = await fetch(`${baseUrl}/robot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '@deploy override reply',
          replyToSessionId: 'build',
        }),
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.sessionId).toBe('deploy');
    });
  });
});
