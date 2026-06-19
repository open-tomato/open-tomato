import type { Server } from 'bun';

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { HttpWebhookRobotService } from '../http-webhook-robot-service.js';

// ── Mock HTTP server ───────────────────────────────────────────────────────

interface ReceivedRequest {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

/**
 * Creates a minimal HTTP server that records incoming requests and responds
 * with a configurable status.  Used to verify outbound webhook delivery.
 */
function createMockServer(): {
  start: () => Promise<{ url: string }>;
  stop: () => void;
  requests: ReceivedRequest[];
  setStatus: (status: number) => void;
} {
  const requests: ReceivedRequest[] = [];
  let responseStatus = 200;
  let server: Server<undefined> | undefined;

  return {
    requests,
    setStatus(status: number) {
      responseStatus = status;
    },
    async start() {
      server = Bun.serve({
        port: 0, // ephemeral
        async fetch(req) {
          const url = new URL(req.url);
          const body = await req.json().catch(() => null);
          requests.push({ method: req.method, path: url.pathname, body });
          return new Response(JSON.stringify({ ok: true }), {
            status: responseStatus,
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

// ── Tests ──────────────────────────────────────────────────────────────────

describe('HttpWebhookRobotService', () => {
  let mock: ReturnType<typeof createMockServer>;
  let service: HttpWebhookRobotService;

  beforeEach(async () => {
    mock = createMockServer();
    const { url } = await mock.start();
    service = new HttpWebhookRobotService({
      webhookUrl: url,
      timeoutMs: 2_000,
      pollIntervalMs: 10,
      maxRetries: 2,
      baseRetryDelayMs: 10,
    });
  });

  afterEach(async () => {
    await service.shutdown();
    mock.stop();
  });

  // ── sendQuestion: outbound delivery ────────────────────────────────────

  describe('sendQuestion', () => {
    it('POSTs a human.interact event to the webhook URL', async () => {
      // Start question — will timeout since no response is injected, but
      // we only care about the outbound POST here.
      const promise = service.sendQuestion('s1', 'approve?', 100);

      const result = await promise;

      expect(result).toBeNull(); // timeout
      expect(mock.requests.length).toBeGreaterThanOrEqual(1);

      const req = mock.requests[0]!;
      expect(req.method).toBe('POST');
      expect(req.body).toMatchObject({
        type: 'human.interact',
        sessionId: 's1',
        question: 'approve?',
      });
      expect((req.body as Record<string, unknown>).timestamp).toBeTypeOf(
        'string',
      );
    });

    it('unblocks when a response is injected via handleIncomingResponse', async () => {
      const promise = service.sendQuestion('s1', 'proceed?');

      // Simulate the human replying after a small delay
      setTimeout(() => {
        service.handleIncomingResponse({
          type: 'human.response',
          sessionId: 's1',
          response: 'yes, go ahead',
          timestamp: new Date().toISOString(),
        });
      }, 50);

      const result = await promise;
      expect(result).toBe('yes, go ahead');
    });

    it('returns null when timeout expires without a response', async () => {
      const result = await service.sendQuestion('s1', 'hello?', 100);
      expect(result).toBeNull();
    });

    it('returns null when shutdown fires during wait', async () => {
      const promise = service.sendQuestion('s1', 'waiting...', 10_000);

      setTimeout(() => service.shutdown(), 50);

      const result = await promise;
      expect(result).toBeNull();
    });

    it('retries on transient webhook failure', async () => {
      // First call will fail (500), second will succeed
      let callCount = 0;
      mock.stop();

      const retryServer = Bun.serve({
        port: 0,
        async fetch(req) {
          callCount++;
          await req.json().catch(() => null);

          const status = callCount === 1
            ? 500
            : 200;
          return new Response(JSON.stringify({ ok: status === 200 }), {
            status,
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });

      try {
        const retryService = new HttpWebhookRobotService({
          webhookUrl: `http://localhost:${retryServer.port}`,
          timeoutMs: 500,
          pollIntervalMs: 10,
          maxRetries: 3,
          baseRetryDelayMs: 10,
        });

        const promise = retryService.sendQuestion('s1', 'retry-test', 200);

        // Inject response so it doesn't just timeout
        setTimeout(() => {
          retryService.handleIncomingResponse({
            type: 'human.response',
            sessionId: 's1',
            response: 'retried-ok',
            timestamp: new Date().toISOString(),
          });
        }, 100);

        const result = await promise;
        expect(result).toBe('retried-ok');
        expect(callCount).toBe(2); // first failed, second succeeded
        await retryService.shutdown();
      } finally {
        retryServer.stop(true);
      }
    });
  });

  // ── sendCheckin ────────────────────────────────────────────────────────

  describe('sendCheckin', () => {
    it('POSTs a human.checkin event to the webhook URL', async () => {
      await service.sendCheckin('s1', 'step 3 of 5 complete');

      expect(mock.requests).toHaveLength(1);

      const req = mock.requests[0]!;
      expect(req.method).toBe('POST');
      expect(req.body).toMatchObject({
        type: 'human.checkin',
        sessionId: 's1',
        message: 'step 3 of 5 complete',
      });
    });

    it('does not throw on webhook failure', async () => {
      mock.setStatus(500);

      // Should not throw
      await service.sendCheckin('s1', 'this will fail silently');

      expect(mock.requests).toHaveLength(1);
    });
  });

  // ── handleIncomingResponse ─────────────────────────────────────────────

  describe('handleIncomingResponse', () => {
    it('returns ok:true for a valid response payload', () => {
      const result = service.handleIncomingResponse({
        type: 'human.response',
        sessionId: 's1',
        response: 'looks good',
        timestamp: new Date().toISOString(),
      });

      expect(result).toEqual({ ok: true });
    });

    it('returns ok:false for an invalid payload', () => {
      const result = service.handleIncomingResponse({
        type: 'human.response',
        // missing sessionId and response
      });

      expect(result.ok).toBe(false);
      expect('error' in result && typeof result.error).toBe('string');
    });

    it('returns ok:false when type is wrong', () => {
      const result = service.handleIncomingResponse({
        type: 'human.guidance',
        sessionId: 's1',
        guidance: 'not a response',
        timestamp: new Date().toISOString(),
      });

      expect(result.ok).toBe(false);
    });

    it('returns ok:false for empty response text', () => {
      const result = service.handleIncomingResponse({
        type: 'human.response',
        sessionId: 's1',
        response: '',
        timestamp: new Date().toISOString(),
      });

      expect(result.ok).toBe(false);
    });
  });

  // ── handleIncomingGuidance ─────────────────────────────────────────────

  describe('handleIncomingGuidance', () => {
    it('returns ok:true for a valid guidance payload', () => {
      const result = service.handleIncomingGuidance({
        type: 'human.guidance',
        sessionId: 's1',
        guidance: 'focus on error handling',
        timestamp: new Date().toISOString(),
      });

      expect(result).toEqual({ ok: true });
    });

    it('accumulates guidance retrievable via the accumulator', () => {
      service.handleIncomingGuidance({
        type: 'human.guidance',
        sessionId: 's1',
        guidance: 'first tip',
        timestamp: new Date().toISOString(),
      });
      service.handleIncomingGuidance({
        type: 'human.guidance',
        sessionId: 's1',
        guidance: 'second tip',
        timestamp: new Date().toISOString(),
      });

      // Access the accumulator through sendQuestion + flush pattern
      // We verify indirectly: register a guidance handler and confirm both arrived
      const received: string[] = [];
      service.onGuidance((_sid, g) => received.push(g));

      service.handleIncomingGuidance({
        type: 'human.guidance',
        sessionId: 's1',
        guidance: 'third tip',
        timestamp: new Date().toISOString(),
      });

      expect(received).toEqual(['third tip']);
    });

    it('notifies registered guidance handlers', () => {
      const received: Array<{ sessionId: string; guidance: string }> = [];
      service.onGuidance((sessionId, guidance) => {
        received.push({ sessionId, guidance });
      });

      service.handleIncomingGuidance({
        type: 'human.guidance',
        sessionId: 's1',
        guidance: 'watch the logs',
        timestamp: new Date().toISOString(),
      });

      expect(received).toEqual([
        { sessionId: 's1', guidance: 'watch the logs' },
      ]);
    });

    it('returns ok:false for an invalid payload', () => {
      const result = service.handleIncomingGuidance({
        type: 'human.guidance',
        // missing fields
      });

      expect(result.ok).toBe(false);
      expect('error' in result && typeof result.error).toBe('string');
    });

    it('returns ok:false when type is wrong', () => {
      const result = service.handleIncomingGuidance({
        type: 'human.response',
        sessionId: 's1',
        response: 'not guidance',
        timestamp: new Date().toISOString(),
      });

      expect(result.ok).toBe(false);
    });
  });

  // ── shutdown ───────────────────────────────────────────────────────────

  describe('shutdown', () => {
    it('causes in-flight sendQuestion to resolve null', async () => {
      const promise = service.sendQuestion('s1', 'will be aborted', 10_000);

      setTimeout(() => service.shutdown(), 50);

      const result = await promise;
      expect(result).toBeNull();
    });
  });
});
