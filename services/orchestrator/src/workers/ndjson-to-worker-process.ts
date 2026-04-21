/**
 * Parses NDJSON output from the task-worker CLI into a `WorkerProcess`.
 *
 * The CLI entry point (`cli.ts exec`) writes one JSON object per line to
 * stdout matching the same event shapes as the HTTP SSE stream:
 *   {"stream":"stdout","line":"..."}
 *   {"stream":"stderr","line":"..."}
 *   {"exit":<code>}
 *
 * This adapter splits the NDJSON stream into separate stdout/stderr
 * `ReadableStream<Uint8Array>` instances and a `Promise<number>` for
 * the exit code.
 */

import type { WorkerProcess } from './client.js';

/**
 * Converts an NDJSON `ReadableStream` (from a subprocess stdout) into
 * a `WorkerProcess`.
 *
 * @param ndjsonStream - The subprocess stdout producing NDJSON lines.
 * @param killFn - Function to kill the underlying subprocess.
 */
export function ndjsonToWorkerProcess(
  ndjsonStream: ReadableStream<Uint8Array>,
  killFn: () => void,
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

  // Parse NDJSON in the background
  void (async () => {
    const reader = ndjsonStream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.length === 0) continue;

          try {
            const event = JSON.parse(line) as Record<string, unknown>;

            if (event['stream'] === 'stdout' && typeof event['line'] === 'string') {
              if (!stdoutClosed) {
                stdoutController.enqueue(encoder.encode(event['line'] + '\n'));
              }
            } else if (event['stream'] === 'stderr' && typeof event['line'] === 'string') {
              if (!stderrClosed) {
                stderrController.enqueue(encoder.encode(event['line'] + '\n'));
              }
            } else if (typeof event['exit'] === 'number') {
              closeStreams();
              resolveExitCode(event['exit']);
              return;
            } else if (typeof event['error'] === 'string') {
              closeStreams();
              resolveExitCode(1);
              return;
            }
          } catch {
            // Malformed JSON line — skip
          }
        }
      }

      // Stream ended without an exit event — treat as error
      closeStreams();
      resolveExitCode(1);
    } catch {
      closeStreams();
      resolveExitCode(1);
    } finally {
      reader.releaseLock();
    }
  })();

  return {
    stdout,
    stderr,
    exited,
    kill() {
      killFn();
      closeStreams();
      resolveExitCode(130);
    },
  };
}
