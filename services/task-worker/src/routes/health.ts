/**
 * GET /health — report worker status and supported models.
 */

import type { WorkerStateManager } from '../core/state.js';
import type { ModelPreset } from '@open-tomato/worker-protocol';
import type { Request, Response } from 'express';

import { Router } from 'express';

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

interface HealthRouteOpts {
  readonly workerId: string;
  readonly state: WorkerStateManager;
  readonly supportedPresets: readonly ModelPreset[];
}

export function healthRouter(opts: HealthRouteOpts): Router {
  const { workerId, state, supportedPresets } = opts;
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json({
      status: state.busy
        ? 'busy'
        : 'idle',
      workerId,
      supportedModels: supportedPresets.map((p) => p.name),
    });
  });

  return router;
}
