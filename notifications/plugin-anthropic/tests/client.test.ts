import type { ClaudeCodeEvent } from '../src/schema';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { emitEvent } from '../src/client';

// ---------------------------------------------------------------------------
// Fetch mock setup
// ---------------------------------------------------------------------------

const fetchMock = vi.fn<typeof globalThis.fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function okResponse(): Response {
  return new Response(null, { status: 200, statusText: 'OK' });
}

function errorResponse(status: number, statusText: string): Response {
  return new Response(null, { status, statusText });
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STOP_EVENT: ClaudeCodeEvent = { hook_event_name: 'Stop' };

const PRE_TOOL_EVENT: ClaudeCodeEvent = {
  hook_event_name: 'PreToolUse',
  tool_name: 'Read',
  tool_input: { file_path: '/tmp/test.ts' },
};

const NOTIFICATION_EVENT: ClaudeCodeEvent = {
  hook_event_name: 'Notification',
  message: 'Build complete',
};

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

describe('emitEvent — URL construction', () => {
  it('appends /events/anthropic to the base URL', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    await emitEvent('http://localhost:3100', 'src-1', STOP_EVENT);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:3100/events/anthropic');
  });

  it('strips a single trailing slash from baseUrl', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    await emitEvent('http://localhost:3100/', 'src-1', STOP_EVENT);

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:3100/events/anthropic');
  });

  it('strips multiple trailing slashes from baseUrl', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    await emitEvent('http://localhost:3100///', 'src-1', STOP_EVENT);

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:3100/events/anthropic');
  });

  it('works with a path-prefixed base URL', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    await emitEvent('https://api.example.com/v1', 'src-1', STOP_EVENT);

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.example.com/v1/events/anthropic');
  });
});

// ---------------------------------------------------------------------------
// Request headers and method
// ---------------------------------------------------------------------------

describe('emitEvent — request headers', () => {
  it('sends a POST request', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    await emitEvent('http://localhost:3100', 'src-1', STOP_EVENT);

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init).toHaveProperty('method', 'POST');
  });

  it('sets Content-Type to application/json', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    await emitEvent('http://localhost:3100', 'src-1', STOP_EVENT);

    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as { headers: Record<string, string> }).headers).toEqual({
      'Content-Type': 'application/json',
    });
  });
});

// ---------------------------------------------------------------------------
// Request body serialization
// ---------------------------------------------------------------------------

describe('emitEvent — request body', () => {
  it('serializes sourceId merged with the event payload', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    await emitEvent('http://localhost:3100', 'machine-a', PRE_TOOL_EVENT);

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as { body: string }).body) as unknown;
    expect(body).toEqual({
      sourceId: 'machine-a',
      hook_event_name: 'PreToolUse',
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test.ts' },
    });
  });

  it('includes message field for Notification events', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    await emitEvent('http://localhost:3100', 'src-2', NOTIFICATION_EVENT);

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as { body: string }).body) as unknown;
    expect(body).toEqual({
      sourceId: 'src-2',
      hook_event_name: 'Notification',
      message: 'Build complete',
    });
  });

  it('spreads all PostToolUse fields including optional is_error', async () => {
    const event: ClaudeCodeEvent = {
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
      tool_response: { stdout: 'file.ts' },
      is_error: false,
      session_id: 'sess-42',
    };
    fetchMock.mockResolvedValueOnce(okResponse());
    await emitEvent('http://localhost:3100', 'src-3', event);

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as { body: string }).body) as Record<
      string,
      unknown
    >;
    expect(body.sourceId).toBe('src-3');
    expect(body.hook_event_name).toBe('PostToolUse');
    expect(body.tool_name).toBe('Bash');
    expect(body.tool_input).toEqual({ command: 'ls' });
    expect(body.tool_response).toEqual({ stdout: 'file.ts' });
    expect(body.is_error).toBe(false);
    expect(body.session_id).toBe('sess-42');
  });

  it('includes optional base fields when present', async () => {
    const event: ClaudeCodeEvent = {
      hook_event_name: 'Stop',
      session_id: 'sess-123',
      permission_mode: 'plan',
      transcript_path: '/tmp/transcript.jsonl',
    };
    fetchMock.mockResolvedValueOnce(okResponse());
    await emitEvent('http://localhost:3100', 'src-4', event);

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as { body: string }).body) as unknown;
    expect(body).toEqual({
      sourceId: 'src-4',
      hook_event_name: 'Stop',
      session_id: 'sess-123',
      permission_mode: 'plan',
      transcript_path: '/tmp/transcript.jsonl',
    });
  });
});

// ---------------------------------------------------------------------------
// Successful responses
// ---------------------------------------------------------------------------

describe('emitEvent — success', () => {
  it('resolves to void on 200 OK', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const result = await emitEvent('http://localhost:3100', 'src-1', STOP_EVENT);
    expect(result).toBeUndefined();
  });

  it('resolves to void on 201 Created', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 201, statusText: 'Created' }),
    );
    const result = await emitEvent('http://localhost:3100', 'src-1', STOP_EVENT);
    expect(result).toBeUndefined();
  });

  it('resolves to void on 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 204, statusText: 'No Content' }),
    );
    const result = await emitEvent('http://localhost:3100', 'src-1', STOP_EVENT);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Error propagation
// ---------------------------------------------------------------------------

describe('emitEvent — error propagation', () => {
  it('throws on 400 Bad Request', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(400, 'Bad Request'));
    await expect(
      emitEvent('http://localhost:3100', 'src-1', STOP_EVENT),
    ).rejects.toThrow('emitEvent failed: 400 Bad Request');
  });

  it('throws on 401 Unauthorized', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'));
    await expect(
      emitEvent('http://localhost:3100', 'src-1', STOP_EVENT),
    ).rejects.toThrow('emitEvent failed: 401 Unauthorized');
  });

  it('throws on 404 Not Found', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(404, 'Not Found'));
    await expect(
      emitEvent('http://localhost:3100', 'src-1', STOP_EVENT),
    ).rejects.toThrow('emitEvent failed: 404 Not Found');
  });

  it('throws on 500 Internal Server Error', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(500, 'Internal Server Error'),
    );
    await expect(
      emitEvent('http://localhost:3100', 'src-1', STOP_EVENT),
    ).rejects.toThrow('emitEvent failed: 500 Internal Server Error');
  });

  it('throws on 503 Service Unavailable', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(503, 'Service Unavailable'),
    );
    await expect(
      emitEvent('http://localhost:3100', 'src-1', STOP_EVENT),
    ).rejects.toThrow('emitEvent failed: 503 Service Unavailable');
  });

  it('propagates network errors from fetch', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(
      emitEvent('http://localhost:3100', 'src-1', STOP_EVENT),
    ).rejects.toThrow('fetch failed');
  });

  it('error message includes both status code and status text', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(422, 'Unprocessable Entity'),
    );
    await expect(
      emitEvent('http://localhost:3100', 'src-1', STOP_EVENT),
    ).rejects.toThrow(/422.*Unprocessable Entity/);
  });
});
