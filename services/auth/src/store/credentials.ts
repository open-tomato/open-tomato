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
