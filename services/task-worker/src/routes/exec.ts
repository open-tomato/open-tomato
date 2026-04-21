/**
 * POST /exec — spawn a Claude Code CLI invocation and stream output as SSE.
 *
 * The task-worker accepts a prompt and workspace path, resolves the model
 * preset, spawns the CLI, and pipes stdout/stderr back as SSE events.
 * The executor's `TaskWorkerHttpClient` consumes this stream.
 */

import type { ProcessSpawner, SpawnedProcess } from '../core/spawner.js';
import type { ModelPreset } from '@open-tomato/worker-protocol';
import type { Request, Response } from 'express';

import { ExecRequestSchema, toSseLine, validatePreset } from '@open-tomato/worker-protocol';
import { Router } from 'express';

import { spawnClaude } from '../core/spawner.js';
import { WorkerStateManager } from '../core/state.js';

// ---------------------------------------------------------------------------
// Line splitter — buffers partial lines from ReadableStream chunks
// ---------------------------------------------------------------------------

async function drainStreamAsLines(
  stream: ReadableStream<Uint8Array>,
  onLine: (line: string) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last (possibly incomplete) fragment in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.length > 0) onLine(line);
      }
    }

    // Flush remaining buffer
    if (buffer.length > 0) onLine(buffer);
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

interface ExecRouteOpts {
  readonly state: WorkerStateManager;
  readonly defaultModel: string;
  readonly supportedPresets: readonly ModelPreset[];
  readonly spawner?: ProcessSpawner;
}

export function execRouter(opts: ExecRouteOpts): Router {
  const { state, defaultModel, supportedPresets, spawner } = opts;
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    // ── Validate request ────────────────────────────────────────���──────
    const parsed = ExecRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', issues: parsed.error.issues });
      return;
    }

    // ── Reject if busy ─────────────────────────────────────────────────
    if (state.busy) {
      res.status(409).json({ error: 'Worker is busy' });
      return;
    }

    // ── Resolve model preset ───────────────────────────────────────────
    const modelName = parsed.data.model ?? defaultModel;
    let preset: ModelPreset;
    try {
      preset = validatePreset(modelName);
    } catch (err) {
      const available = supportedPresets.map((p) => p.name);
      res.status(400).json({
        error: err instanceof Error
          ? err.message
          : 'Unknown model',
        availableModels: available,
      });
      return;
    }

    // ── Mark busy and spawn ────────────────────────────────────────────
    state.markBusy(preset.name);

    let proc: SpawnedProcess;
    try {
      proc = spawnClaude(
        {
          prompt: parsed.data.prompt,
          workDir: parsed.data.workDir,
          preset,
        },
        spawner,
      );
    } catch (err) {
      state.markIdle();
      res.status(500).json({
        error: `Failed to spawn claude: ${err instanceof Error
          ? err.message
          : String(err)}`,
      });
      return;
    }

    // ── SSE headers ────────────────────────────────────────────────────
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    });
    // Disable Nagle's algorithm so SSE chunks flush immediately
    res.socket?.setNoDelay(true);

    // ── Handle client disconnect ───────────────────────────────────────
    // Use res.on('close'), not req.on('close'). In Bun, req 'close' fires
    // when the request body stream ends (after client sends body), not when
    // the connection drops — which would prematurely block all writes.
    let clientDisconnected = false;
    res.on('close', () => {
      if (!res.writableFinished) {
        clientDisconnected = true;
        proc.kill();
      }
    });

    // ── Stream stdout and stderr as SSE events ─────────────────────────
    const writeSse = (event: Parameters<typeof toSseLine>[0]) => {
      if (!clientDisconnected) {
        res.write(toSseLine(event));
      }
    };

    try {
      // Drain both streams concurrently
      await Promise.all([
        drainStreamAsLines(proc.stdout, (line) => {
          writeSse({ stream: 'stdout', line });
        }),
        drainStreamAsLines(proc.stderr, (line) => {
          writeSse({ stream: 'stderr', line });
        }),
      ]);

      const exitCode = await proc.exited;
      writeSse({ exit: exitCode });
    } catch (err) {
      writeSse({ error: err instanceof Error
        ? err.message
        : 'Unknown error' });
    } finally {
      state.markIdle();
      if (!clientDisconnected) {
        res.end();
      }
    }
  });

  return router;
}
