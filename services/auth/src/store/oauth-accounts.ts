/**
 * Federated-identity links (`oauth_accounts`). Behind its own module so route
 * tests `vi.mock` it and skip a live Postgres.
 */
import type { Db } from '../db/index.js';
import type { OAuthProvider } from '../tokens/types.js';

import { and, eq } from 'drizzle-orm';

import { oauthAccountsTable } from '../db/schema.js';

/** The local user id linked to `(provider, providerUid)`, or `null` when unlinked. */
export async function getOAuthAccountUserId(
  db: Db,
  provider: OAuthProvider,
  providerUid: string,
): Promise<string | null> {
  const rows = await db
    .select({ userId: oauthAccountsTable.user_id })
    .from(oauthAccountsTable)
    .where(and(eq(oauthAccountsTable.provider, provider), eq(oauthAccountsTable.provider_uid, providerUid)))
    .limit(1);
  return rows[0]?.userId ?? null;
}

/**
 * Link a federated identity to a user. The `unique(provider, provider_uid)`
 * constraint makes this a claim: `onConflictDoNothing` returns no row when the
 * identity is already linked, which the caller maps to `email_taken`.
 */
export async function linkOAuthAccount(
  db: Db,
  input: { userId: string; provider: OAuthProvider; providerUid: string },
): Promise<boolean> {
  const rows = await db
    .insert(oauthAccountsTable)
    .values({ user_id: input.userId, provider: input.provider, provider_uid: input.providerUid })
    .onConflictDoNothing({ target: [oauthAccountsTable.provider, oauthAccountsTable.provider_uid] })
    .returning({ id: oauthAccountsTable.id });
  return rows.length > 0;
}
