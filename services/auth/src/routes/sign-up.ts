/**
 * Sign-up routes (09c).
 *
 * `POST /sign-up/email` — `{ email, username, password }`:
 *   - `{ status:'ok', user, tokens }` (`amr:['pwd']`) — account created, signed in
 *   - `{ status:'email_taken' }` (200)               — the email already has an account
 *
 * `POST /sign-up/oauth/:provider/complete` — finish a federated sign-up once the
 *   user has chosen a handle. The verified federated identity comes from the
 *   server-side `pending federation` cookie set by the OAuth callback — NEVER
 *   from the request body (which carries only the chosen handle/display name).
 *   Delivered alongside the OAuth routes in this phase.
 */
import type { RouteDeps } from './context.js';
import type { Request, Response, NextFunction } from 'express';

import { zodToValidationError } from '@open-tomato/errors';
import { Router } from 'express';
import { z } from 'zod';

import { hashPassword } from '../auth/password.js';
import { setPassword } from '../store/credentials.js';
import { createUser } from '../store/users.js';
import { issueTokenSet } from '../tokens/session-tokens.js';

/** Minimum password length accepted when a credential is set (sign-up / reset). */
const MIN_PASSWORD_LENGTH = 8;

const EmailSignUpSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

export function signUpRouter(deps: RouteDeps): Router {
  const router = Router({ mergeParams: true });
  const { db, redis, issuer } = deps;

  router.post('/email', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = EmailSignUpSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      const { email, username, password } = parsed.data;

      // The unique-email insert is the enforcement point — a colliding email
      // returns null → email_taken (no separate existence probe).
      const user = await createUser(db, { email, name: username });
      if (user == null) {
        res.status(200).json({ status: 'email_taken' });
        return;
      }

      await setPassword(db, user.id, await hashPassword(password));

      const tokens = await issueTokenSet(redis, issuer, {
        sub: user.id,
        email: user.email,
        name: user.name,
        amr: ['pwd'],
      });
      res.status(200).json({
        status: 'ok',
        user: { id: user.id, email: user.email, name: user.name, handle: username },
        tokens,
      });
    } catch (err) {
      next(err);
    }
  });

  // `POST /sign-up/oauth/:provider/complete` is registered by the OAuth wiring
  // (it needs the OIDC pending-federation store); see routes/oauth.ts.

  return router;
}
