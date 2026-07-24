/**
 * Sign-in routes.
 *
 * `POST /sign-in/email` — password sign-in (09a):
 *   - `{ status: 'ok', tokens }`                       — password-only account, `amr:['pwd']`
 *   - `{ status: 'two_factor_required', challenge, user }` — account has a confirmed TOTP secret
 *   - `{ status: 'invalid_credentials' }` + HTTP 401   — wrong/empty password OR unknown email
 *   **No account enumeration**: unknown email and wrong password share one branch.
 *
 * `POST /sign-in/2fa` — second-factor verification (09b):
 *   - `{ status: 'ok', tokens }` (`amr:['pwd','otp']`) — TOTP or recovery code accepted
 *   - `{ status: 'invalid_code' }`                     — bad/expired challenge or wrong code
 *   The challenge (from step 1) is the ONLY source of identity — the client's
 *   `sub` is never trusted — and it is consumed on success (single-use).
 */
import type { RouteDeps } from './context.js';
import type { Request, Response, NextFunction } from 'express';

import { zodToValidationError } from '@open-tomato/errors';
import { Router } from 'express';
import { z } from 'zod';

import { getDecoyHash, verifyPassword } from '../auth/password.js';
import { verifySecondFactor } from '../auth/second-factor.js';
import {
  consumeSignInChallenge,
  createSignInChallenge,
  getSignInChallenge,
} from '../store/challenges.js';
import { getCredentialByUserId } from '../store/credentials.js';
import { getUserByEmail, getUserById, hasConfirmedTotp } from '../store/users.js';
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

// Transport-level only: both fields present strings. A bad code / stale
// challenge is a business outcome (`invalid_code`), not a 422.
const TwoFactorSchema = z.object({
  challengeId: z.string(),
  code: z.string(),
});

/** Emit the enumeration-safe failure: HTTP 401 carrying the status tag. */
function invalidCredentials(res: Response): void {
  res.status(401).json({ status: 'invalid_credentials' });
}

/**
 * The `/sign-in/2fa` failure branch. A 200 (not 401): the contract models an
 * expected wrong-code as normal control flow the screen branches on, reserving
 * non-2xx for `invalid_credentials` and transport errors. Mints nothing.
 */
function invalidCode(res: Response): void {
  res.status(200).json({ status: 'invalid_code' });
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

  router.post('/2fa', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = TwoFactorSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      const { challengeId, code } = parsed.data;

      // The challenge is the sole trusted identity — resolve it, never a
      // client `sub`. Unknown/expired → invalid_code.
      const challenge = await getSignInChallenge(redis, challengeId);
      if (challenge == null) return invalidCode(res);

      // TOTP or single-use recovery code. Left un-consumed on failure so a
      // fat-fingered code can be retried within the challenge's short TTL.
      const verified = await verifySecondFactor(db, challenge.userId, code);
      if (!verified) return invalidCode(res);

      // Atomic single-use gate: the first request to delete the challenge wins
      // and mints; a concurrent duplicate finds it already gone → invalid_code,
      // so one challenge can never yield two token sets.
      const consumed = await consumeSignInChallenge(redis, challengeId);
      if (!consumed) return invalidCode(res);

      const user = await getUserById(db, challenge.userId);
      if (user == null) return invalidCode(res); // account vanished mid-flight

      const tokens = await issueTokenSet(redis, issuer, {
        sub: user.id,
        email: user.email,
        name: user.name,
        amr: ['pwd', 'otp'],
      });
      res.status(200).json({ status: 'ok', tokens });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
