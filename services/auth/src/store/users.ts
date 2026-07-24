/**
 * User lookups. Kept behind this module so route tests can `vi.mock` it and
 * never touch a live Postgres.
 */
import type { Db } from '../db/index.js';

import { and, eq, isNotNull } from 'drizzle-orm';

import { totpSecretsTable, usersTable } from '../db/schema.js';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
}

/** Normalise an email for lookup/storage — trim + lowercase. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Find a user by email (case-insensitive). Returns `null` when absent. */
export async function getUserByEmail(db: Db, email: string): Promise<UserRecord | null> {
  const rows = await db
    .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.email, normalizeEmail(email)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Whether the user has a **confirmed** TOTP secret — the signal that a
 * password sign-in must escalate to `two_factor_required`. (The 2FA verify
 * endpoint itself is 09b; this read exists so 09a returns the correct shape.)
 */
export async function hasConfirmedTotp(db: Db, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: totpSecretsTable.id })
    .from(totpSecretsTable)
    .where(and(eq(totpSecretsTable.user_id, userId), isNotNull(totpSecretsTable.confirmed_at)))
    .limit(1);
  return rows.length > 0;
}
