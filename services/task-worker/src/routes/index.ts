/**
 * Combines all task-worker route handlers into a single router.
 */

import type { ProcessSpawner } from '../core/spawner.js';
import type { ModelPreset } from '@open-tomato/worker-protocol';
import type { Router as ExpressRouter } from 'express';

import { Router } from 'express';

import { WorkerStateManager } from '../core/state.js';
import { WorkspaceManager } from '../core/workspace-manager.js';

import { execRouter } from './exec.js';
import { healthRouter } from './health.js';
import { workspaceRouter } from './workspace.js';

// ---------------------------------------------------------------------------
// Combined router factory
// ---------------------------------------------------------------------------

export interface WorkerRoutesOpts {
  readonly workerId: string;
  readonly defaultModel: string;
  readonly supportedPresets: readonly ModelPreset[];
  readonly spawner?: ProcessSpawner;
}

export function createWorkerRoutes(opts: WorkerRoutesOpts): {
  router: ExpressRouter;
  state: WorkerStateManager;
  workspaceManager: WorkspaceManager;
} {
  const state = new WorkerStateManager();
  const workspaceManager = new WorkspaceManager();

  const router = Router();

  router.use('/exec', execRouter({
    state,
    defaultModel: opts.defaultModel,
    supportedPresets: opts.supportedPresets,
    spawner: opts.spawner,
  }));

  router.use('/workspace', workspaceRouter({
    state,
    workspaceManager,
  }));

  router.use('/health', healthRouter({
    workerId: opts.workerId,
    state,
    supportedPresets: opts.supportedPresets,
  }));

  return { router, state, workspaceManager };
}
