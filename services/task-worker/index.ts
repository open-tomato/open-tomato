/**
 * Task-worker HTTP server entry point.
 *
 * Starts an Express service that exposes the worker HTTP API:
 *   POST /exec      — spawn Claude CLI, stream SSE output
 *   POST /workspace — git clone into temp dir
 *   DELETE /workspace — clean up workspace
 *   GET /health     — worker status + supported models
 *
 * Environment variables:
 *   PORT             — HTTP listen port (default: 4310)
 *   WORKER_ID        — Worker identifier (default: 'task-worker-0')
 *   DEFAULT_MODEL    — Model preset name (default: 'sonnet')
 *   ORCHESTRATOR_URL — Hive learning orchestrator (optional)
 */

import process from 'node:process';

import { createService } from '@open-tomato/express';
import { APPROVED_PRESETS, getPreset } from '@open-tomato/worker-protocol';

import {
  bootstrapInstincts,
  registerShutdownHook,
} from './src/core/instinct-lifecycle.js';
import { createWorkerRoutes } from './src/routes/index.js';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const PORT = Number(process.env['PORT'] ?? 4310);
const WORKER_ID = process.env['WORKER_ID'] ?? 'task-worker-0';
const DEFAULT_MODEL = process.env['DEFAULT_MODEL'] ?? 'sonnet';
const ORCHESTRATOR_URL = process.env['ORCHESTRATOR_URL'];

// ---------------------------------------------------------------------------
// Validate default model
// ---------------------------------------------------------------------------

const defaultPreset = getPreset(DEFAULT_MODEL);
if (!defaultPreset) {
  const available = APPROVED_PRESETS.map((p) => p.name).join(', ');
  console.error(
    `[task-worker] Unknown DEFAULT_MODEL '${DEFAULT_MODEL}'. Available: ${available}`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

// Register SIGTERM handler for instinct flush before anything else
registerShutdownHook(ORCHESTRATOR_URL, WORKER_ID);

// Pull blessed instinct bundle (non-blocking, silent on failure)
await bootstrapInstincts(ORCHESTRATOR_URL, WORKER_ID);

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

await createService({
  serviceId: 'task-worker',
  port: PORT,
  dependencies: [],

  async register(app) {
    const { router } = createWorkerRoutes({
      workerId: WORKER_ID,
      defaultModel: DEFAULT_MODEL,
      supportedPresets: APPROVED_PRESETS,
    });

    app.use('/', router);

    console.log(`[task-worker] worker=${WORKER_ID} model=${DEFAULT_MODEL}`);
    console.log(
      `[task-worker] supported models: ${APPROVED_PRESETS.map((p) => p.name).join(', ')}`,
    );
  },
});
