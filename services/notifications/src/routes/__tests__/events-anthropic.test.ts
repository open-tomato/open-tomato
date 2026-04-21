import type { Db } from '../../db/index.js';

import { anthropicPlugin } from '@open-tomato/notifications-plugin-anthropic';
import express from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { entityRegistry } from '../../entity/registry.js';
import { eventsRouter } from '../events.js';

// ---------------------------------------------------------------------------
// Mocks — replace DB + SSE with test doubles
// ---------------------------------------------------------------------------

vi.mock('../../store/events.js', () => ({
  storeEvent: vi.fn().mockResolvedValue({ id: 'test-event-id' }),
  getEventHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../sse/bus.js', () => ({
  sseBus: {
    publishEvent: vi.fn(),
    attachEventStream: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Register plugin once — before any tests run
// ---------------------------------------------------------------------------

beforeAll(() => {
  if (!entityRegistry.get('anthropic')) {
    entityRegistry.register({
      kind: 'anthropic',
      providers: ['sse', 'inline-http'],
      direction: 'inbound',
      interactive: false,
      payloadSchema: anthropicPlugin.schema,
    });
  }
});

// ---------------------------------------------------------------------------
// Test app + server lifecycle
// ---------------------------------------------------------------------------

const TEST_JOB_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

let app: express.Express;
let server: ReturnType<express.Express['listen']>;
let baseUrl: string;

beforeEach(async () => {
  app = express();
  app.use(express.json());
  app.use('/events', eventsRouter({} as Db));

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr
        ? addr.port
        : 0;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterEach(() => {
  server?.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function postEvent(kind: string, body: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}/events/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() as Record<string, unknown> };
}

async function getHistory(kind: string, jobId: string) {
  const res = await fetch(`${baseUrl}/events/${kind}/${jobId}/history`);
  return { status: res.status, body: await res.json() as unknown };
}

// ---------------------------------------------------------------------------
// POST /events/anthropic
// ---------------------------------------------------------------------------

describe('POST /events/anthropic', () => {
  it('accepts a valid PreToolUse event and returns 202', async () => {
    const { status, body } = await postEvent('anthropic', {
      jobId: TEST_JOB_ID,
      nodeId: 'claude-session-1',
      type: 'PreToolUse',
      hook_event_name: 'PreToolUse',
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test.ts' },
    });

    expect(status).toBe(202);
    expect(body).toEqual({ ok: true });
  });

  it('accepts a valid Stop event and returns 202', async () => {
    const { status, body } = await postEvent('anthropic', {
      jobId: TEST_JOB_ID,
      nodeId: 'claude-session-1',
      type: 'Stop',
      hook_event_name: 'Stop',
      stop_hook_active: true,
    });

    expect(status).toBe(202);
    expect(body).toEqual({ ok: true });
  });

  it('accepts a valid Notification event and returns 202', async () => {
    const { status, body } = await postEvent('anthropic', {
      jobId: TEST_JOB_ID,
      nodeId: 'claude-session-1',
      type: 'Notification',
      hook_event_name: 'Notification',
      message: 'Task completed',
    });

    expect(status).toBe(202);
    expect(body).toEqual({ ok: true });
  });

  it('rejects an invalid payload with 400', async () => {
    const { status, body } = await postEvent('anthropic', {
      jobId: TEST_JOB_ID,
      nodeId: 'claude-session-1',
      type: 'PreToolUse',
      hook_event_name: 'PreToolUse',
      // missing required tool_name and tool_input
    });

    expect(status).toBe(400);
    expect(body).toHaveProperty('error', 'Invalid payload');
  });

  it('rejects missing envelope fields with 400', async () => {
    const { status, body } = await postEvent('anthropic', {
      // missing jobId, nodeId, type
      hook_event_name: 'Stop',
    });

    expect(status).toBe(400);
    expect(body).toHaveProperty('error', 'Invalid envelope');
  });
});

// ---------------------------------------------------------------------------
// GET /events/anthropic/:jobId/history
// ---------------------------------------------------------------------------

describe('GET /events/anthropic/:jobId/history', () => {
  it('returns 200 with empty history', async () => {
    const { status, body } = await getHistory('anthropic', TEST_JOB_ID);

    expect(status).toBe(200);
    expect(body).toEqual([]);
  });

  it('rejects unknown entity kinds with 400', async () => {
    const { status, body } = await getHistory('nonexistent', TEST_JOB_ID);

    expect(status).toBe(400);
    expect((body as Record<string, unknown>)).toHaveProperty('error');
  });
});
