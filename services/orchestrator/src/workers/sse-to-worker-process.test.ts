import { describe, expect, it } from 'vitest';

import { sseToWorkerProcess } from './sse-to-worker-process.js';

function createSseStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      }
      controller.close();
    },
  });
}

async function drainStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }
  return result;
}

describe('sseToWorkerProcess', () => {
  it('routes stdout events to stdout stream', async () => {
    const stream = createSseStream([
      '{"stream":"stdout","line":"hello"}',
      '{"stream":"stdout","line":"world"}',
      '{"exit":0}',
    ]);

    const proc = sseToWorkerProcess(stream);
    const output = await drainStream(proc.stdout);
    const exitCode = await proc.exited;

    expect(output).toBe('hello\nworld\n');
    expect(exitCode).toBe(0);
  });

  it('routes stderr events to stderr stream', async () => {
    const stream = createSseStream([
      '{"stream":"stderr","line":"warning: something"}',
      '{"exit":0}',
    ]);

    const proc = sseToWorkerProcess(stream);
    const stderrOutput = await drainStream(proc.stderr);
    const exitCode = await proc.exited;

    expect(stderrOutput).toBe('warning: something\n');
    expect(exitCode).toBe(0);
  });

  it('handles non-zero exit codes', async () => {
    const stream = createSseStream([
      '{"stream":"stdout","line":"partial output"}',
      '{"exit":1}',
    ]);

    const proc = sseToWorkerProcess(stream);
    await drainStream(proc.stdout);
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
  });

  it('handles error events', async () => {
    const stream = createSseStream([
      '{"error":"process crashed"}',
    ]);

    const proc = sseToWorkerProcess(stream);
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
  });

  it('kill aborts and returns SIGINT code', async () => {
    // Create a stream that never closes
    const stream = new ReadableStream<Uint8Array>({
      start() {
        // Never enqueue or close — simulates hanging connection
      },
    });

    const proc = sseToWorkerProcess(stream);
    proc.kill();

    const exitCode = await proc.exited;
    expect(exitCode).toBe(130);
  });

  it('skips malformed JSON lines', async () => {
    const stream = createSseStream([
      '{"stream":"stdout","line":"good"}',
      'not valid json',
      '{"exit":0}',
    ]);

    const proc = sseToWorkerProcess(stream);
    const output = await drainStream(proc.stdout);
    const exitCode = await proc.exited;

    expect(output).toBe('good\n');
    expect(exitCode).toBe(0);
  });
});
