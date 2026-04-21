/**
 * Integration test: SSE protocol round-trip.
 *
 * Boots the task-worker HTTP routes with a mock spawner, sends requests,
 * and verifies the SSE stream is correctly produced (and can be parsed
 * by the executor's `sseToWorkerProcess` adapter).
 */

import type { ProcessSpawner } from '../core/spawner.js';

import http from 'node:http';

import { APPROVED_PRESETS } from '@open-tomato/worker-protocol';
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';

import { createWorkerRoutes } from '../routes/index.js';

// Dynamic import for executor adapter — skip test if unavailable
let sseToWorkerProcess: typeof import('../../../../services/orchestrator/src/workers/sse-to-worker-process.js').sseToWorkerProcess;
let adapterAvailable = false;

try {
  const mod = await import('../../../../services/orchestrator/src/workers/sse-to-worker-process.js');
  sseToWorkerProcess = mod.sseToWorkerProcess;
  adapterAvailable = true;
} catch {
  // Executor module not available
}

// ---------------------------------------------------------------------------
// Mock spawner
// ---------------------------------------------------------------------------

function createMockSpawner(
  stdoutLines: string[],
  stderrLines: string[],
  exitCode: number,
): ProcessSpawner {
  return {
    spawn() {
      const encoder = new TextEncoder();

      const stdout = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const line of stdoutLines) {
            controller.enqueue(encoder.encode(line + '\n'));
          }
          controller.close();
        },
      });

      const stderr = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const line of stderrLines) {
            controller.enqueue(encoder.encode(line + '\n'));
          }
          controller.close();
        },
      });

      return {
        stdout,
        stderr,
        exited: Promise.resolve(exitCode),
        kill() {},
      };
    },
  };
}

// ---------------------------------------------------------------------------
// SSE event reader using raw http.request (avoids Bun fetch SSE buffering)
// ---------------------------------------------------------------------------

function collectSseEvents(
  baseUrl: string,
  path: string,
  body: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const payload = JSON.stringify(body);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        const events: Array<Record<string, unknown>> = [];
        let buffer = '';

        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          buffer += chunk;

          while (buffer.includes('\n\n')) {
            const idx = buffer.indexOf('\n\n');
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            for (const line of block.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              try {
                const event = JSON.parse(line.slice(6)) as Record<string, unknown>;
                events.push(event);

                if ('exit' in event || 'error' in event) {
                  res.destroy(); // close the connection
                  resolve(events);
                  return;
                }
              } catch { /* skip */ }
            }
          }
        });

        res.on('end', () => resolve(events));
        res.on('error', reject);
      },
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Same as collectSseEvents but returns the raw response body as a
 * ReadableStream, for use with the executor's sseToWorkerProcess adapter.
 */
function fetchSseAsStream(
  baseUrl: string,
  path: string,
  body: Record<string, unknown>,
): Promise<{ stream: ReadableStream<Uint8Array>; destroy: () => void }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const payload = JSON.stringify(body);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            res.on('data', (chunk: Buffer) => {
              controller.enqueue(new Uint8Array(chunk));
            });
            res.on('end', () => {
              try { controller.close(); } catch { /* already closed */ }
            });
            res.on('error', (err) => {
              try { controller.error(err); } catch { /* already errored */ }
            });
          },
        });
        resolve({ stream, destroy: () => res.destroy() });
      },
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let server: any = null;
let baseUrl = '';

function startServer(spawner: ProcessSpawner): Promise<void> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    const { router } = createWorkerRoutes({
      workerId: 'test-worker',
      defaultModel: 'sonnet',
      supportedPresets: APPROVED_PRESETS,
      spawner,
    });

    app.use('/', router);
    server = app.listen(0, () => {
      const addr = server!.address();
      if (typeof addr === 'object' && addr) {
        baseUrl = `http://localhost:${addr.port}`;
      }
      resolve();
    });
  });
}

function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) { resolve(); return; }
    // Force-close all active connections before closing the server
    server.closeAllConnections();
    server.close(() => {
      server = null;
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SSE round-trip: task-worker → executor adapter', () => {
  afterEach(async () => {
    await stopServer();
  });

  it('health endpoint returns expected shape', async () => {
    await startServer(createMockSpawner([], [], 0));

    const res = await fetch(`${baseUrl}/health`);
    expect(res.ok).toBe(true);

    const body = await res.json();
    expect(body).toMatchObject({
      status: 'idle',
      workerId: 'test-worker',
      supportedModels: expect.arrayContaining(['sonnet', 'haiku']),
    });
  });

  it('exec returns SSE stream with stdout, stderr, and exit events', async () => {
    await startServer(createMockSpawner(['line 1', 'line 2'], ['warn: something'], 0));

    const events = await collectSseEvents(baseUrl, '/exec', {
      prompt: 'test prompt',
      workDir: '/tmp/test',
    });

    const stdoutEvents = events.filter((e) => e['stream'] === 'stdout');
    const stderrEvents = events.filter((e) => e['stream'] === 'stderr');
    const exitEvents = events.filter((e) => 'exit' in e);

    expect(stdoutEvents).toEqual([
      { stream: 'stdout', line: 'line 1' },
      { stream: 'stdout', line: 'line 2' },
    ]);
    expect(stderrEvents).toEqual([
      { stream: 'stderr', line: 'warn: something' },
    ]);
    expect(exitEvents).toEqual([{ exit: 0 }]);
  });

  it('exec returns 409 when busy', async () => {
    const hangingSpawner: ProcessSpawner = {
      spawn() {
        return {
          stdout: new ReadableStream({ start() {} }),
          stderr: new ReadableStream({ start() {} }),
          exited: new Promise(() => {}),
          kill() {},
        };
      },
    };
    await startServer(hangingSpawner);

    // Start a blocking request (don't await the stream — swallow disconnect error)
    fetch(`${baseUrl}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'blocking', workDir: '/tmp' }),
    }).catch(() => { /* expected: server closes the connection */ });

    await new Promise((r) => setTimeout(r, 100));

    const res2 = await fetch(`${baseUrl}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'rejected', workDir: '/tmp' }),
    });

    expect(res2.status).toBe(409);
    const body = await res2.json();
    expect(body).toMatchObject({ error: 'Worker is busy' });
  });

  it('exec rejects invalid model preset', async () => {
    await startServer(createMockSpawner([], [], 0));

    const res = await fetch(`${baseUrl}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'test',
        workDir: '/tmp',
        model: 'gpt-4-does-not-exist',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body['error']).toContain('Unknown model preset');
  });

  it.skipIf(!adapterAvailable)(
    'executor sseToWorkerProcess correctly parses task-worker SSE output',
    async () => {
      await startServer(
        createMockSpawner(['hello from claude', 'second line'], ['stderr warning'], 0),
      );

      const { stream, destroy } = await fetchSseAsStream(baseUrl, '/exec', {
        prompt: 'integration test',
        workDir: '/tmp',
      });

      const proc = sseToWorkerProcess(stream);

      // Drain stdout and stderr concurrently, then get exit code
      const decoder = new TextDecoder();

      async function drain(s: ReadableStream<Uint8Array>): Promise<string> {
        const reader = s.getReader();
        let text = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value);
        }
        return text;
      }

      const [stdoutText, stderrText, exitCode] = await Promise.all([
        drain(proc.stdout),
        drain(proc.stderr),
        proc.exited,
      ]);

      expect(stdoutText).toBe('hello from claude\nsecond line\n');
      expect(stderrText).toBe('stderr warning\n');
      expect(exitCode).toBe(0);

      destroy(); // clean up the HTTP connection
    },
  );
});
