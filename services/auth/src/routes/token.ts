/**
 * `POST /token/refresh` — rotate the access token from a valid refresh token.
 *
 * Resolves the refresh token to its `sid`-bound session, mints a fresh access
 * JWT off the stored claims, and rotates the refresh token (the presented one
 * is invalidated). An unknown, dangling, or already-rotated token → HTTP 401.
 */
import type { RouteDeps } from './context.js';
import type { Request, Response, NextFunction } from 'express';

import { UnauthorizedError, zodToValidationError } from '@open-tomato/errors';
import { Router } from 'express';
import { z } from 'zod';

import { refreshTokenSet } from '../tokens/session-tokens.js';

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export function tokenRouter(deps: RouteDeps): Router {
  const router = Router({ mergeParams: true });
  const { redis, issuer } = deps;

  router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = RefreshSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      const tokens = await refreshTokenSet(redis, issuer, parsed.data.refreshToken);
      if (tokens == null) throw new UnauthorizedError('Invalid or expired refresh token');

      res.status(200).json({ status: 'ok', tokens });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
