/**
 * Two-factor enrollment routes (09b) — the post-login security-setup surface.
 * All TOTP routes require a valid access token ({@link requireAuth}); the acting
 * user comes from the verified token, never the request body.
 *
 * `POST /2fa/totp/start` → `{ secret, otpauthUri }` — mints a pending secret and
 *   the `otpauth://` URI the client renders as a QR.
 * `POST /2fa/totp/verify` — `{ code }`:
 *   - `{ status:'ok', recoveryCodes }` — first code verified; the secret is
 *     confirmed and 8 single-use recovery codes are minted (shown once).
 *   - `{ status:'invalid_code' }`      — no pending enrollment or wrong code.
 * `POST /2fa/passkey/*` — **deferred (D5)** → HTTP 501.
 */
import type { RouteDeps } from './context.js';
import type { AuthedRequest } from './require-auth.js';
import type { Request, Response, NextFunction } from 'express';

import { zodToValidationError } from '@open-tomato/errors';
import { Router } from 'express';
import { z } from 'zod';

import { generateRecoveryCodes, hashRecoveryCode } from '../auth/recovery.js';
import { buildOtpauthUri, generateTotpSecret, verifyTotp } from '../auth/totp.js';
import { replaceRecoveryCodes } from '../store/recovery-codes.js';
import { confirmTotpSecret, getPendingTotpSecret, startTotpEnrollment } from '../store/totp.js';

import { requireAuth } from './require-auth.js';

const VerifySchema = z.object({ code: z.string() });

/** Passkey ceremonies are deferred (D5): advertise not-implemented, don't 404. */
function passkeyDeferred(_req: Request, res: Response): void {
  res.status(501).json({
    status: 'not_implemented',
    message: 'Passkey enrollment is deferred (D5); use TOTP.',
  });
}

export function twoFactorRouter(deps: RouteDeps): Router {
  const router = Router({ mergeParams: true });
  const { db, issuer } = deps;
  const auth = requireAuth(issuer);

  router.post('/totp/start', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sub, email } = (req as AuthedRequest).auth;

      const secret = generateTotpSecret();
      await startTotpEnrollment(db, sub, secret);

      res.status(200).json({ secret, otpauthUri: buildOtpauthUri(secret, email) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/totp/verify', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = VerifySchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      const { sub } = (req as AuthedRequest).auth;

      const pending = await getPendingTotpSecret(db, sub);
      if (pending == null || !verifyTotp(pending.secret, parsed.data.code)) {
        res.status(200).json({ status: 'invalid_code' });
        return;
      }

      // Confirm the factor, then mint + persist a hashed set of recovery codes.
      await confirmTotpSecret(db, sub, pending.id);
      const recoveryCodes = generateRecoveryCodes();
      await replaceRecoveryCodes(db, sub, await Promise.all(recoveryCodes.map(hashRecoveryCode)));

      // The plaintext codes are returned exactly once — never stored, never re-shown.
      res.status(200).json({ status: 'ok', recoveryCodes });
    } catch (err) {
      next(err);
    }
  });

  router.post('/passkey/start', passkeyDeferred);
  router.post('/passkey/finish', passkeyDeferred);

  return router;
}
