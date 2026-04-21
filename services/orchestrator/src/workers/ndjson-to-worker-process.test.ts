import { describe, expect, it } from 'vitest';

import { ndjsonToWorkerProcess } from './ndjson-to-worker-process.js';

function createNdjsonStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'));
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

describe('ndjsonToWorkerProcess', () => {
  it('routes stdout events to stdout stream', async () => {
    const stream = createNdjsonStream([
      '{"stream":"stdout","line":"line 1"}',
      '{"stream":"stdout","line":"line 2"}',
      '{"exit":0}',
    ]);

    const proc = ndjsonToWorkerProcess(stream, () => {});
    const output = await drainStream(proc.stdout);
    const exitCode = await proc.exited;

    expect(output).toBe('line 1\nline 2\n');
    expect(exitCode).toBe(0);
  });

  it('routes stderr events to stderr stream', async () => {
    const stream = createNdjsonStream([
      '{"stream":"stderr","line":"err msg"}',
      '{"exit":0}',
    ]);

    const proc = ndjsonToWorkerProcess(stream, () => {});
    const stderrOutput = await drainStream(proc.stderr);

    expect(stderrOutput).toBe('err msg\n');
  });

  it('handles non-zero exit', async () => {
    const stream = createNdjsonStream([
      '{"exit":42}',
    ]);

    const proc = ndjsonToWorkerProcess(stream, () => {});
    const exitCode = await proc.exited;

    expect(exitCode).toBe(42);
  });

  it('handles error events as exit code 1', async () => {
    const stream = createNdjsonStream([
      '{"error":"boom"}',
    ]);

    const proc = ndjsonToWorkerProcess(stream, () => {});
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
  });

  it('kill calls killFn and returns 130', async () => {
    let killed = false;
    const stream = new ReadableStream<Uint8Array>({
      start() { /* never closes */ },
    });

    const proc = ndjsonToWorkerProcess(stream, () => { killed = true; });
    proc.kill();

    const exitCode = await proc.exited;
    expect(exitCode).toBe(130);
    expect(killed).toBe(true);
  });

  it('skips malformed JSON lines', async () => {
    const stream = createNdjsonStream([
      '{"stream":"stdout","line":"ok"}',
      'garbage',
      '{"exit":0}',
    ]);

    const proc = ndjsonToWorkerProcess(stream, () => {});
    const output = await drainStream(proc.stdout);
    const exitCode = await proc.exited;

    expect(output).toBe('ok\n');
    expect(exitCode).toBe(0);
  });

  it('treats stream end without exit event as error', async () => {
    const stream = createNdjsonStream([
      '{"stream":"stdout","line":"partial"}',
      // No exit event — stream closes
    ]);

    const proc = ndjsonToWorkerProcess(stream, () => {});
    await drainStream(proc.stdout);
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
  });
});
