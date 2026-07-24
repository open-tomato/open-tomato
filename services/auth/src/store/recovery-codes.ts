/**
 * Recovery-code persistence (hashed, single-use). Behind its own module so
 * route tests `vi.mock` it and skip a live Postgres.
 *
 * Enrollment replaces the whole set; sign-in redemption scans the user's unused
 * codes and marks the matched one used. Only hashes are stored — the plaintext
 * codes are shown to the user exactly once at enrollment.
 */
import type { Db } from '../db/index.js';

import { and, eq, isNull } from 'drizzle-orm';

import { recoveryCodesTable } from '../db/schema.js';

export interface StoredRecoveryCode {
  id: string;
  codeHash: string;
}

/**
 * Replace the user's recovery codes with a fresh hashed set (a new enrollment
 * or regeneration invalidates every prior code).
 */
export async function replaceRecoveryCodes(
  db: Db,
  userId: string,
  codeHashes: string[],
): Promise<void> {
  await db.delete(recoveryCodesTable).where(eq(recoveryCodesTable.user_id, userId));
  if (codeHashes.length === 0) return;
  await db
    .insert(recoveryCodesTable)
    .values(codeHashes.map((codeHash) => ({ user_id: userId, code_hash: codeHash })));
}

/** All of the user's not-yet-redeemed recovery codes (hashes only). */
export async function listUnusedRecoveryCodes(db: Db, userId: string): Promise<StoredRecoveryCode[]> {
  return db
    .select({ id: recoveryCodesTable.id, codeHash: recoveryCodesTable.code_hash })
    .from(recoveryCodesTable)
    .where(and(eq(recoveryCodesTable.user_id, userId), isNull(recoveryCodesTable.used_at)));
}

/**
 * Atomically claim a recovery code as redeemed. The `used_at IS NULL` guard
 * makes the mark a compare-and-set: only the FIRST of two concurrent
 * redemptions of the same code updates a row. Returns `true` when this call won
 * the claim, `false` when the code was already spent (a lost race) — so the
 * caller never double-honours a single code.
 */
export async function markRecoveryCodeUsed(db: Db, id: string): Promise<boolean> {
  const claimed = await db
    .update(recoveryCodesTable)
    .set({ used_at: new Date() })
    .where(and(eq(recoveryCodesTable.id, id), isNull(recoveryCodesTable.used_at)))
    .returning({ id: recoveryCodesTable.id });
  return claimed.length > 0;
}
