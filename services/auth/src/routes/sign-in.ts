/**
 * `POST /sign-in/email` — password sign-in (09a).
 *
 * Result union (per `auth-api-contract.md`):
 *   - `{ status: 'ok', tokens }`                       — password-only account, `amr:['pwd']`
 *   - `{ status: 'two_factor_required', challenge, user }` — account has a confirmed TOTP secret
 *   - `{ status: 'invalid_credentials' }` + HTTP 401   — wrong/empty password OR unknown email
 *
 * **No account enumeration**: an unknown email and a wrong password are handled
 * on the same branch and are indistinguishable to the caller.
 */
import type { RouteDeps } from './context.js';
import type { Request, Response, NextFunction } from 'express';

import { zodToValidationError } from '@open-tomato/errors';
import { Router } from 'express';
import { z } from 'zod';

import { getDecoyHash, verifyPassword } from '../auth/password.js';
import { createSignInChallenge } from '../store/challenges.js';
import { getCredentialByUserId } from '../store/credentials.js';
import { getUserByEmail, hasConfirmedTotp } from '../store/users.js';
import { issueTokenSet } from '../tokens/session-tokens.js';

import { handleFromEmail } from './context.js';

// Transport-level validation only: both fields must be present strings. Bad
// values (unknown email, wrong password) are business outcomes, not 422s —
// surfacing them as validation errors would leak account existence.
const EmailSignInSchema = z.object({
  email: z.string(),
  password: z.string(),
  remember: z.boolean().optional(),
});

/** Emit the enumeration-safe failure: HTTP 401 carrying the status tag. */
function invalidCredentials(res: Response): void {
  res.status(401).json({ status: 'invalid_credentials' });
}

export function signInRouter(deps: RouteDeps): Router {
  const router = Router({ mergeParams: true });
  const { db, redis, issuer } = deps;

  router.post('/email', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = EmailSignInSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      const { email, password } = parsed.data;

      const user = await getUserByEmail(db, email);
      const credential = user == null
        ? null
        : await getCredentialByUserId(db, user.id);

      // Constant-time credential check: ALWAYS run one argon2 verify — against
      // the real hash when the account exists, else a fixed decoy of the same
      // cost — so unknown-email and wrong-password paths are timing-identical.
      // No early return on a missing user/credential (that would leak existence
      // by latency). See password.getDecoyHash.
      const hash = credential?.passwordHash ?? await getDecoyHash();
      const passwordMatches = await verifyPassword(hash, password);
      const passwordOk = credential != null && password.trim() !== '' && passwordMatches;
      if (!passwordOk || user == null) return invalidCredentials(res);

      // Second factor gate — a confirmed TOTP secret escalates to a challenge.
      if (await hasConfirmedTotp(db, user.id)) {
        const challenge = await createSignInChallenge(redis, user.id, ['totp']);
        res.status(200).json({
          status: 'two_factor_required',
          challenge: { challengeId: challenge.challengeId, methods: challenge.methods },
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            handle: handleFromEmail(user.email),
          },
        });
        return;
      }

      const tokens = await issueTokenSet(redis, issuer, {
        sub: user.id,
        email: user.email,
        name: user.name,
        amr: ['pwd'],
      });
      res.status(200).json({ status: 'ok', tokens });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
