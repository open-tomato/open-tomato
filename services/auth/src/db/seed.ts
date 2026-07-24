/**
 * Dev seed (D-WSP) — fixtures matching the auth-app's in-app mock so password
 * sign-in works end-to-end against the live service in dev.
 *
 *   - Sam Lin      <sam@open-tomato.dev>    — password-only (`amr:['pwd']`)
 *   - Ren Ohara    <secure@open-tomato.dev> — password + confirmed TOTP → 2FA
 *   - a workspace membership (Sam → open-garden)
 *   - an open invitation (open-garden → Sam)
 *
 * Every account shares the dev password below. Idempotent: re-running upserts
 * on the `users.email` unique constraint and skips duplicate child rows.
 *
 * Run with `bun run db:seed` (needs DATABASE_URL + a migrated schema).
 */
import process from 'node:process';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { hashPassword, PASSWORD_ALGO } from '../auth/password.js';

import {
  credentialsTable,
  invitationsTable,
  totpSecretsTable,
  usersTable,
  workspaceMembershipsTable,
} from './schema.js';

/** Shared dev password for every seeded account. */
const DEV_PASSWORD = 'tomato-dev-password';
/** A fixed TOTP secret for the 2FA account (mirrors the mock fixture). */
const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://auth:auth@localhost:5435/auth';

// Refuse to seed a production database: this writes well-known dev credentials
// (a shared password + a fixed TOTP secret). Only run in dev/test, or against a
// clearly-local Postgres. Set ALLOW_SEED=1 to override deliberately.
function assertSeedAllowed(): void {
  const env = process.env['NODE_ENV'];
  const isLocalEnv = env == null || env === 'development' || env === 'test';
  const isLocalHost = /@(localhost|127\.0\.0\.1|db|postgres)[:/]/.test(DATABASE_URL);
  if (process.env['ALLOW_SEED'] === '1') return;
  if (!isLocalEnv || !isLocalHost) {
    throw new Error(
      'Refusing to seed: dev fixtures target a non-local DB/env. Set ALLOW_SEED=1 to override.',
    );
  }
}

async function seed(): Promise<void> {
  assertSeedAllowed();
  const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
  const db = drizzle({ client: pool });

  try {
    const passwordHash = await hashPassword(DEV_PASSWORD);

    // --- Users (upsert by email) ------------------------------------------
    const [sam] = await db
      .insert(usersTable)
      .values({ email: 'sam@open-tomato.dev', name: 'Sam Lin' })
      .onConflictDoUpdate({ target: usersTable.email, set: { name: 'Sam Lin' } })
      .returning();

    const [ren] = await db
      .insert(usersTable)
      .values({ email: 'secure@open-tomato.dev', name: 'Ren Ohara' })
      .onConflictDoUpdate({ target: usersTable.email, set: { name: 'Ren Ohara' } })
      .returning();

    if (sam == null || ren == null) throw new Error('user upsert returned no rows');

    // --- Credentials (one password hash per user) -------------------------
    for (const userId of [sam.id, ren.id]) {
      const existing = await db
        .select({ id: credentialsTable.id })
        .from(credentialsTable)
        .where(eq(credentialsTable.user_id, userId))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(credentialsTable).values({
          user_id: userId,
          password_hash: passwordHash,
          algo: PASSWORD_ALGO,
        });
      }
    }

    // --- Confirmed TOTP for the 2FA account -------------------------------
    const totpExisting = await db
      .select({ id: totpSecretsTable.id })
      .from(totpSecretsTable)
      .where(eq(totpSecretsTable.user_id, ren.id))
      .limit(1);
    if (totpExisting.length === 0) {
      await db.insert(totpSecretsTable).values({
        user_id: ren.id,
        secret: TOTP_SECRET,
        confirmed_at: new Date(),
      });
    }

    // --- Workspace membership (Sam → open-garden) -------------------------
    await db
      .insert(workspaceMembershipsTable)
      .values({ user_id: sam.id, workspace_id: 'ws_open_garden', role: 'member' })
      .onConflictDoNothing();

    // --- Open invitation (open-garden → Sam) ------------------------------
    const inviteExisting = await db
      .select({ id: invitationsTable.id })
      .from(invitationsTable)
      .where(eq(invitationsTable.email, 'sam@open-tomato.dev'))
      .limit(1);
    if (inviteExisting.length === 0) {
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.insert(invitationsTable).values({
        workspace_id: 'ws_open_garden',
        workspace_name: 'open-garden',
        email: 'sam@open-tomato.dev',
        role: 'member',
        invited_by: ren.id,
        expires_at: expires,
      });
    }
     
    console.log(`seeded auth dev fixtures — password for all accounts: "${DEV_PASSWORD}"`);
  } finally {
    await pool.end();
  }
}

seed().catch((err: unknown) => {
   
  console.error('auth seed failed:', err);
  process.exit(1);
});
