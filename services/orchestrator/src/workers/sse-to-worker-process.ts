/**
 * Parses an SSE stream from a task-worker HTTP response into the
 * `WorkerProcess` interface expected by the executor's runner.
 *
 * The task-worker emits SSE events in this format:
 *   data: {"stream":"stdout","line":"..."}
 *   data: {"stream":"stderr","line":"..."}
 *   data: {"exit":<code>}
 *   data: {"error":"..."}
 *
 * This adapter splits the stream into separate stdout/stderr
 * `ReadableStream<Uint8Array>` instances and a `Promise<number>` for
 * the exit code — matching the `WorkerProcess` shape from `client.ts`.
 */

import type { WorkerProcess } from './client.js';

// ---------------------------------------------------------------------------
// SSE line parser
// ---------------------------------------------------------------------------

interface SseCallbacks {
  onStdout(line: string): void;
  onStderr(line: string): void;
  onExit(code: number): void;
  onError(message: string): void;
}

/**
 * Reads an SSE byte stream, extracts `data:` payloads, and dispatches
 * parsed events to the provided callbacks.
 */
async function parseSseStream(
  stream: ReadableStream<Uint8Array>,
  callbacks: SseCallbacks,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let terminated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6); // strip 'data: ' prefix
        try {
          const event = JSON.parse(jsonStr) as Record<string, unknown>;

          if (event['stream'] === 'stdout' && typeof event['line'] === 'string') {
            callbacks.onStdout(event['line']);
          } else if (event['stream'] === 'stderr' && typeof event['line'] === 'string') {
            callbacks.onStderr(event['line']);
          } else if (typeof event['exit'] === 'number') {
            callbacks.onExit(event['exit']);
            terminated = true;
          } else if (typeof event['error'] === 'string') {
            callbacks.onError(event['error']);
            terminated = true;
          }
        } catch {
          // Malformed JSON — skip line
        }
      }

      // Stop reading after a terminal event (exit/error).
      // The HTTP connection may stay open (keep-alive) but there is
      // nothing left to process.
      if (terminated) return;
    }

    // Flush remaining buffer
    if (!terminated && buffer.startsWith('data: ')) {
      try {
        const event = JSON.parse(buffer.slice(6)) as Record<string, unknown>;
        if (typeof event['exit'] === 'number') {
          callbacks.onExit(event['exit']);
        }
      } catch {
        // Ignore
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Converts an SSE response stream into a `WorkerProcess`.
 *
 * @param sseStream - The `ReadableStream` from a `fetch()` response body.
 * @param abortController - Optional controller to abort the underlying fetch.
 * @returns A `WorkerProcess` with stdout, stderr, exited, and kill().
 */
export function sseToWorkerProcess(
  sseStream: ReadableStream<Uint8Array>,
  abortController?: AbortController,
): WorkerProcess {
  const encoder = new TextEncoder();

  let stdoutController!: ReadableStreamDefaultController<Uint8Array>;
  let stderrController!: ReadableStreamDefaultController<Uint8Array>;
  let resolveExitCode!: (code: number) => void;
  let stdoutClosed = false;
  let stderrClosed = false;

  const stdout = new ReadableStream<Uint8Array>({
    start(c) { stdoutController = c; },
  });

  const stderr = new ReadableStream<Uint8Array>({
    start(c) { stderrController = c; },
  });

  const exited = new Promise<number>((resolve) => {
    resolveExitCode = resolve;
  });

  function closeStreams(): void {
    if (!stdoutClosed) {
      stdoutClosed = true;
      try { stdoutController.close(); } catch { /* already closed */ }
    }
    if (!stderrClosed) {
      stderrClosed = true;
      try { stderrController.close(); } catch { /* already closed */ }
    }
  }

  // Parse SSE in the background
  void parseSseStream(sseStream, {
    onStdout(line) {
      if (!stdoutClosed) {
        stdoutController.enqueue(encoder.encode(line + '\n'));
      }
    },
    onStderr(line) {
      if (!stderrClosed) {
        stderrController.enqueue(encoder.encode(line + '\n'));
      }
    },
    onExit(code) {
      closeStreams();
      resolveExitCode(code);
    },
    onError(message) {
      closeStreams();
      // Treat error events as non-zero exit
      resolveExitCode(1);
      console.error(`[sse-adapter] worker error: ${message}`);
    },
  }).then(() => {
    // If stream ends without an exit event, force close
    closeStreams();
  })
    .catch(() => {
      closeStreams();
      resolveExitCode(1);
    });

  return {
    stdout,
    stderr,
    exited,
    kill() {
      abortController?.abort();
      closeStreams();
      resolveExitCode(130); // SIGINT-like code
    },
  };
}
