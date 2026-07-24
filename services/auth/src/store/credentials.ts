/**
 * Credential lookups. Behind its own module so route tests `vi.mock` it and
 * skip a live Postgres.
 */
import type { Db } from '../db/index.js';

import { eq } from 'drizzle-orm';

import { credentialsTable } from '../db/schema.js';

export interface CredentialRecord {
  userId: string;
  passwordHash: string;
  algo: 'argon2id' | 'scrypt';
}

/** Fetch the password credential for a user, or `null` when none is set. */
export async function getCredentialByUserId(db: Db, userId: string): Promise<CredentialRecord | null> {
  const rows = await db
    .select({
      userId: credentialsTable.user_id,
      passwordHash: credentialsTable.password_hash,
      algo: credentialsTable.algo,
    })
    .from(credentialsTable)
    .where(eq(credentialsTable.user_id, userId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Set (or replace) a user's password hash — the write side of password reset.
 * Updates the existing credential in place, or inserts one if the account had
 * none. Always stamps `argon2id` (the only algorithm this service mints).
 */
export async function setPassword(db: Db, userId: string, passwordHash: string): Promise<void> {
  const updated = await db
    .update(credentialsTable)
    .set({ password_hash: passwordHash, algo: 'argon2id' })
    .where(eq(credentialsTable.user_id, userId))
    .returning({ id: credentialsTable.id });

  if (updated.length === 0) {
    await db.insert(credentialsTable).values({
      user_id: userId,
      password_hash: passwordHash,
      algo: 'argon2id',
    });
  }
}
