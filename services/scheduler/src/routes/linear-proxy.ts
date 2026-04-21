/**
 * @packageDocumentation
 * Express router that proxies requests to the Linear API.
 * The Linear access token is extracted from the Authorization header.
 */

import type { Request, Response } from 'express';

import { Router } from 'express';

import { getLinearIssues, getLinearProjects, getLinearTeams } from '../linear/proxy.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractLinearToken(req: Request): string | null {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function linearProxyRouter(): Router {
  const router = Router();

  // GET /teams — list Linear teams
  router.get('/teams', async (req: Request, res: Response) => {
    try {
      const token = extractLinearToken(req);
      if (!token) {
        res.status(401).json({ success: false, error: 'Linear access token required' });
        return;
      }

      const teams = await getLinearTeams(token);
      res.json({ success: true, data: teams });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(502).json({ success: false, error: message });
    }
  });

  // GET /teams/:teamId/projects — list projects for a team
  router.get('/teams/:teamId/projects', async (req: Request, res: Response) => {
    try {
      const token = extractLinearToken(req);
      if (!token) {
        res.status(401).json({ success: false, error: 'Linear access token required' });
        return;
      }

      const projects = await getLinearProjects(token, req.params['teamId']!);
      res.json({ success: true, data: projects });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(502).json({ success: false, error: message });
    }
  });

  // GET /projects/:projectId/issues — list issues for a project
  router.get('/projects/:projectId/issues', async (req: Request, res: Response) => {
    try {
      const token = extractLinearToken(req);
      if (!token) {
        res.status(401).json({ success: false, error: 'Linear access token required' });
        return;
      }

      const issues = await getLinearIssues(token, req.params['projectId']!);
      res.json({ success: true, data: issues });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(502).json({ success: false, error: message });
    }
  });

  return router;
}
