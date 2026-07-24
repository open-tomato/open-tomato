/**
 * TOTP secret persistence. Kept behind this module so route tests `vi.mock` it
 * and never touch a live Postgres.
 *
 * Lifecycle: enrollment start writes a **pending** secret (`confirmed_at` null);
 * verify promotes it to **confirmed** and drops any other secret for the user,
 * so a user has at most one active second factor. A confirmed secret is what
 * makes `POST /sign-in/email` escalate to `two_factor_required`.
 */
import type { Db } from '../db/index.js';

import { and, desc, eq, isNotNull, isNull, ne } from 'drizzle-orm';

import { totpSecretsTable } from '../db/schema.js';

export interface TotpSecretRow {
  id: string;
  secret: string;
}

/**
 * Begin enrollment: clear any prior **pending** secret for the user (an
 * abandoned enrollment) and store the fresh one. A confirmed secret is left
 * untouched, so an in-progress re-enrollment never disables working 2FA before
 * the new code is proven.
 */
export async function startTotpEnrollment(db: Db, userId: string, secret: string): Promise<void> {
  await db
    .delete(totpSecretsTable)
    .where(and(eq(totpSecretsTable.user_id, userId), isNull(totpSecretsTable.confirmed_at)));
  await db.insert(totpSecretsTable).values({ user_id: userId, secret });
}

/** The user's latest **pending** secret — the one an enroll-verify checks against. */
export async function getPendingTotpSecret(db: Db, userId: string): Promise<TotpSecretRow | null> {
  const rows = await db
    .select({ id: totpSecretsTable.id, secret: totpSecretsTable.secret })
    .from(totpSecretsTable)
    .where(and(eq(totpSecretsTable.user_id, userId), isNull(totpSecretsTable.confirmed_at)))
    .orderBy(desc(totpSecretsTable.created_at))
    .limit(1);
  return rows[0] ?? null;
}

/** The user's **confirmed** secret — the one a sign-in second factor verifies against. */
export async function getConfirmedTotpSecret(db: Db, userId: string): Promise<TotpSecretRow | null> {
  const rows = await db
    .select({ id: totpSecretsTable.id, secret: totpSecretsTable.secret })
    .from(totpSecretsTable)
    .where(and(eq(totpSecretsTable.user_id, userId), isNotNull(totpSecretsTable.confirmed_at)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Promote a pending secret to confirmed and remove every other secret for the
 * user, leaving exactly one active factor.
 */
export async function confirmTotpSecret(db: Db, userId: string, secretId: string): Promise<void> {
  await db
    .update(totpSecretsTable)
    .set({ confirmed_at: new Date() })
    .where(eq(totpSecretsTable.id, secretId));
  await db
    .delete(totpSecretsTable)
    .where(and(eq(totpSecretsTable.user_id, userId), ne(totpSecretsTable.id, secretId)));
}
