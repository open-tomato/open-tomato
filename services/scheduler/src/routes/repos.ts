/**
 * @packageDocumentation
 * Express router for listing GitHub organization repositories.
 */

import type { GithubRepo } from '../github/client.js';
import type { Request, Response } from 'express';

import { Router } from 'express';

import { createGithubClient } from '../github/client.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReposRouterDeps {
  githubToken: string;
  githubOrg: string;
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

let cachedRepos: GithubRepo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function reposRouter({ githubToken, githubOrg }: ReposRouterDeps): Router {
  const router = Router();

  // GET / — list org repos (with in-memory caching)
  router.get('/', async (req: Request, res: Response) => {
    try {
      const bustCache = req.query['refresh'] === 'true';
      const now = Date.now();

      if (!bustCache && cachedRepos && (now - cacheTimestamp) < CACHE_TTL_MS) {
        res.json({ success: true, data: cachedRepos });
        return;
      }

      const client = createGithubClient(githubToken);
      const repos = await client.listOrgRepos(githubOrg);

      cachedRepos = repos;
      cacheTimestamp = now;

      res.json({ success: true, data: repos });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  return router;
}
