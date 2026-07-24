/**
 * Bearer-token auth middleware for this service's own post-login endpoints
 * (2FA enrollment). The framework's `requireAuth` (`@open-tomato/express`) is
 * still a passthrough stub, and it would introspect over HTTP anyway; since
 * this service owns the token issuer, it verifies the access token locally.
 *
 * On success it attaches the decoded claims to `req.auth`; on a missing or
 * invalid token it throws `UnauthorizedError` (→ HTTP 401 via the error handler).
 */
import type { TokenIssuer } from '../tokens/issuer.js';
import type { AccessTokenClaims } from '../tokens/types.js';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { UnauthorizedError } from '@open-tomato/errors';

/** A request that has passed {@link requireAuth} — `auth` is guaranteed present. */
export interface AuthedRequest extends Request {
  auth: AccessTokenClaims;
}

const BEARER = /^Bearer (.+)$/i;

export function requireAuth(issuer: TokenIssuer): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const match = BEARER.exec(req.headers.authorization ?? '');
      const token = match?.[1]?.trim();
      if (token == null || token === '') throw new UnauthorizedError('Missing bearer token');

      const claims = await issuer.verifyAccessToken(token);
      if (claims == null) throw new UnauthorizedError('Invalid or expired access token');

      (req as AuthedRequest).auth = claims;
      next();
    } catch (err) {
      next(err);
    }
  };
}
