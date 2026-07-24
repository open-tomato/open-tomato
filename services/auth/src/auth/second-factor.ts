/**
 * Second-factor verification for sign-in step 2. Accepts either a live 6-digit
 * TOTP code or a single-use recovery code, routing by the code's shape so a
 * plain TOTP attempt never pays the argon2 cost of the recovery-code scan.
 *
 * Recovery redemption is deliberately in-scope: codes minted at enrollment are
 * useless unless redeemable here, and the wire shape (`{ challengeId, code }`)
 * is unchanged. A matched recovery code is consumed (marked used) so it can
 * never authenticate twice.
 */
import type { Db } from '../db/index.js';

import { listUnusedRecoveryCodes, markRecoveryCodeUsed } from '../store/recovery-codes.js';
import { getConfirmedTotpSecret } from '../store/totp.js';

import { verifyRecoveryCode } from './recovery.js';
import { verifyTotp } from './totp.js';

/** A six-digit numeric input is a TOTP attempt; anything else, a recovery code. */
const TOTP_SHAPE = /^\d{6}$/;

/**
 * Verify a second factor for `userId`. Returns `true` on a valid TOTP code or a
 * matching unused recovery code (which is then consumed); `false` otherwise.
 */
export async function verifySecondFactor(db: Db, userId: string, rawCode: string): Promise<boolean> {
  const code = rawCode.trim();

  if (TOTP_SHAPE.test(code.replace(/\s/g, ''))) {
    const secret = await getConfirmedTotpSecret(db, userId);
    return secret != null && verifyTotp(secret.secret, code);
  }

  const unused = await listUnusedRecoveryCodes(db, userId);
  for (const stored of unused) {
    if (await verifyRecoveryCode(stored.codeHash, code)) {
      // Only one stored code can match; accept iff we win the atomic claim.
      // A lost race (concurrent redemption already spent it) → not accepted.
      return markRecoveryCodeUsed(db, stored.id);
    }
  }
  return false;
}
