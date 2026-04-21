/**
 * POST /workspace  — prepare a workspace (git clone into temp dir).
 * DELETE /workspace — clean up the current workspace.
 */

import type { WorkspaceManager } from '../core/workspace-manager.js';
import type { Request, Response } from 'express';

import { WorkspaceRequestSchema } from '@open-tomato/worker-protocol';
import { Router } from 'express';

import { WorkerStateManager } from '../core/state.js';

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

interface WorkspaceRouteOpts {
  readonly state: WorkerStateManager;
  readonly workspaceManager: WorkspaceManager;
}

export function workspaceRouter(opts: WorkspaceRouteOpts): Router {
  const { state, workspaceManager } = opts;
  const router = Router();

  // ── POST / — prepare workspace ─────────────────────────────────────────

  router.post('/', async (req: Request, res: Response) => {
    const parsed = WorkspaceRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', issues: parsed.error.issues });
      return;
    }

    try {
      const workDir = await workspaceManager.prepare(
        parsed.data.branch,
        parsed.data.repoUrl,
      );
      state.setWorkDir(workDir);
      res.json({ workDir });
    } catch (err) {
      res.status(422).json({
        error: `Workspace preparation failed: ${err instanceof Error
          ? err.message
          : String(err)}`,
      });
    }
  });

  // ── DELETE / — clean workspace ─────────────────────────────────────────

  router.delete('/', async (_req: Request, res: Response) => {
    try {
      const cleaned = await workspaceManager.clean();
      state.setWorkDir(null);
      res.json({ cleaned });
    } catch (err) {
      res.status(500).json({
        error: `Workspace cleanup failed: ${err instanceof Error
          ? err.message
          : String(err)}`,
      });
    }
  });

  return router;
}
