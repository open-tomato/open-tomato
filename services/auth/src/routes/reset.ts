/**
 * Password-reset routes (09b).
 *
 * `POST /reset/request` — `{ email }` → **always** `{ status:'sent', channel,
 *   maskedEmail }`. An account-bound code is minted + stub-mailed only when the
 *   email resolves; the unknown-email branch does equivalent argon2 work so the
 *   two paths are timing-indistinguishable (no enumeration).
 *
 * `POST /reset/confirm` — `{ email, code, newPassword }`:
 *   - `{ status:'ok', tokens }`     — code valid **and** bound to this email;
 *     sets the new password, revokes all other sessions, signs in (`amr:['pwd']`).
 *   - `{ status:'expired' }`        — the code matched but is past its window.
 *   - `{ status:'invalid_code' }`   — wrong code, code↔email mismatch, OR unknown
 *     email. Mints nothing. **No default-user fallback** (the WS08 sec fix).
 *   invalid_code/expired are 200s (business outcomes), not transport errors.
 */
import type { RouteDeps } from './context.js';
import type { Request, Response, NextFunction } from 'express';

import { randomInt } from 'node:crypto';

import { zodToValidationError } from '@open-tomato/errors';
import { Router } from 'express';
import { z } from 'zod';

import { getDecoyHash, hashPassword, verifyPassword } from '../auth/password.js';
import { setPassword } from '../store/credentials.js';
import { consumeResetCode, createResetCode } from '../store/reset-codes.js';
import { revokeUserSessions } from '../store/sessions.js';
import { getUserByEmail } from '../store/users.js';
import { issueTokenSet } from '../tokens/session-tokens.js';

/** Minimum length for a reset's new password (aligns with sign-up policy). */
const MIN_PASSWORD_LENGTH = 8;

const RequestSchema = z.object({ email: z.string() });
const ConfirmSchema = z.object({
  email: z.string(),
  code: z.string(),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH),
});

/** Mask an email for the always-`sent` response — mirrors the auth-app mock. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (domain == null || local == null || local.length === 0) return email;
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

/** A throwaway 6-digit value for the decoy-hash timing equalizer. */
const decoyCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');

export function resetRouter(deps: RouteDeps): Router {
  const router = Router({ mergeParams: true });
  const { db, redis, issuer, mail } = deps;

  router.post('/request', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = RequestSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      const { email } = parsed.data;
      const user = await getUserByEmail(db, email);

      if (user != null) {
        const issued = await createResetCode(redis, user.id);
        await mail.sendPasswordResetCode({
          to: user.email,
          code: issued.code,
          expiresInMinutes: issued.expiresInMinutes,
        });
      } else {
        // Equalize timing with the real branch (one argon2 hash) so an
        // unknown email can't be told apart from a known one by latency.
        await hashPassword(decoyCode());
      }

      // Always the same response — the masked form of whatever was submitted.
      res.status(200).json({ status: 'sent', channel: 'email', maskedEmail: maskEmail(email) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/confirm', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ConfirmSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      const { email, code, newPassword } = parsed.data;

      const user = await getUserByEmail(db, email);
      // Unknown email → invalid_code, indistinguishable from a wrong code. The
      // code is looked up by the resolved account only — never a fallback user.
      if (user == null) {
        // Decoy argon2 verify so an unknown email costs the same as a real
        // account's reset-code check (which runs one verify in consumeResetCode)
        // — no registration oracle by latency.
        await verifyPassword(await getDecoyHash(), code);
        res.status(200).json({ status: 'invalid_code' });
        return;
      }

      const check = await consumeResetCode(redis, user.id, code);
      if (check === 'expired') {
        res.status(200).json({ status: 'expired' });
        return;
      }
      if (check === 'invalid') {
        res.status(200).json({ status: 'invalid_code' });
        return;
      }

      // Valid + bound: set the new password and revoke every existing session
      // (a reset invalidates old sessions), then mint a fresh signed-in session.
      await setPassword(db, user.id, await hashPassword(newPassword));
      await revokeUserSessions(redis, user.id);

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
