/**
 * `POST /introspect` — the framework's `auth.introspectUrl` seam.
 *
 * Verifies an access token's HS256 signature + expiry and returns its claims.
 * This is how other services validate a session against this one (decision
 * D-JWT: shared-secret HS256, no JWKS yet).
 *
 *   - valid   → `{ active: true, ...claims }`
 *   - invalid → `{ active: false }`  (unknown/expired/tampered — never an error)
 *
 * Following RFC 7662's spirit, a token that fails validation is a normal
 * `{ active: false }` 200 response, not a transport error.
 */
import type { RouteDeps } from './context.js';
import type { Request, Response, NextFunction } from 'express';

import { zodToValidationError } from '@open-tomato/errors';
import { Router } from 'express';
import { z } from 'zod';

const IntrospectSchema = z.object({
  token: z.string(),
});

export function introspectRouter(deps: RouteDeps): Router {
  const router = Router({ mergeParams: true });
  const { issuer } = deps;

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = IntrospectSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      const claims = await issuer.verifyAccessToken(parsed.data.token);
      if (claims == null) {
        res.status(200).json({ active: false });
        return;
      }

      res.status(200).json({ active: true, ...claims });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
