/**
 * Auth service persistence schema (Drizzle pg-core).
 *
 * All tables for the full WS09 auth backend are declared up front (09a only
 * exercises `users` + `credentials` + `totp_secrets` + `invitations`), so later
 * phases (09b 2FA/reset, 09c OAuth/workspace) add handlers, not migrations.
 *
 * Cross-service references (workspace ids, inviter ids) are **soft UUID/text
 * refs** — no foreign keys reach outside this service's own tables.
 */
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Password hashing algorithm recorded alongside each credential hash. */
export const credentialAlgoEnum = pgEnum('credential_algo', ['argon2id', 'scrypt']);

/** OAuth / OIDC providers the service federates with. */
export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'github']);

/** Role a user holds within a workspace (mirrors the token `wspRole` claim). */
export const workspaceRoleEnum = pgEnum('workspace_role', ['owner', 'admin', 'member', 'viewer']);

// ---------------------------------------------------------------------------
// Users — the identity anchor every other table references (soft UUID refs).
// ---------------------------------------------------------------------------

export const usersTable = pgTable(
  'users',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    email: text().notNull(),
    name: text().notNull(),
    created_at: timestamp().notNull()
      .defaultNow(),
  },
  (t) => [unique('users_email_uq').on(t.email)],
);

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

// ---------------------------------------------------------------------------
// Credentials — one password hash per user (argon2id by default).
// ---------------------------------------------------------------------------

export const credentialsTable = pgTable(
  'credentials',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    /** Soft reference to `users.id` — no FK, per the service convention. */
    user_id: uuid().notNull(),
    password_hash: text().notNull(),
    algo: credentialAlgoEnum().notNull()
      .default('argon2id'),
    created_at: timestamp().notNull()
      .defaultNow(),
  },
  (t) => [index('credentials_user_id_idx').on(t.user_id)],
);

export type Credential = typeof credentialsTable.$inferSelect;
export type NewCredential = typeof credentialsTable.$inferInsert;

// ---------------------------------------------------------------------------
// OAuth accounts — federated identities linked to a user (09c).
// ---------------------------------------------------------------------------

export const oauthAccountsTable = pgTable(
  'oauth_accounts',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    user_id: uuid().notNull(),
    provider: oauthProviderEnum().notNull(),
    /** The provider's stable subject identifier for this user. */
    provider_uid: text().notNull(),
    created_at: timestamp().notNull()
      .defaultNow(),
  },
  (t) => [
    unique('oauth_accounts_provider_uid_uq').on(t.provider, t.provider_uid),
    index('oauth_accounts_user_id_idx').on(t.user_id),
  ],
);

export type OAuthAccount = typeof oauthAccountsTable.$inferSelect;
export type NewOAuthAccount = typeof oauthAccountsTable.$inferInsert;

// ---------------------------------------------------------------------------
// TOTP secrets — one per user; `confirmed_at` set once enrollment verifies (09b).
// A confirmed secret is what makes sign-in escalate to `two_factor_required`.
// ---------------------------------------------------------------------------

export const totpSecretsTable = pgTable(
  'totp_secrets',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    user_id: uuid().notNull(),
    secret: text().notNull(),
    created_at: timestamp().notNull()
      .defaultNow(),
    /** Null until the first TOTP code is verified during enrollment. */
    confirmed_at: timestamp(),
  },
  (t) => [index('totp_secrets_user_id_idx').on(t.user_id)],
);

export type TotpSecret = typeof totpSecretsTable.$inferSelect;
export type NewTotpSecret = typeof totpSecretsTable.$inferInsert;

// ---------------------------------------------------------------------------
// Recovery codes — single-use TOTP backup codes (09b).
// ---------------------------------------------------------------------------

export const recoveryCodesTable = pgTable(
  'recovery_codes',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    user_id: uuid().notNull(),
    code_hash: text().notNull(),
    created_at: timestamp().notNull()
      .defaultNow(),
    /** Null until the code is redeemed. */
    used_at: timestamp(),
  },
  (t) => [index('recovery_codes_user_id_idx').on(t.user_id)],
);

export type RecoveryCode = typeof recoveryCodesTable.$inferSelect;
export type NewRecoveryCode = typeof recoveryCodesTable.$inferInsert;

// ---------------------------------------------------------------------------
// Workspace memberships — a user's confirmed roles across workspaces (09c).
// `workspace_id` is a soft cross-service ref (owned by the workspace surface).
// ---------------------------------------------------------------------------

export const workspaceMembershipsTable = pgTable(
  'workspace_memberships',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    user_id: uuid().notNull(),
    workspace_id: text().notNull(),
    role: workspaceRoleEnum().notNull(),
    created_at: timestamp().notNull()
      .defaultNow(),
  },
  (t) => [
    unique('workspace_memberships_user_workspace_uq').on(t.user_id, t.workspace_id),
    index('workspace_memberships_user_id_idx').on(t.user_id),
  ],
);

export type WorkspaceMembership = typeof workspaceMembershipsTable.$inferSelect;
export type NewWorkspaceMembership = typeof workspaceMembershipsTable.$inferInsert;

// ---------------------------------------------------------------------------
// Invitations — open invites a user can accept during workspace select (09c).
// ---------------------------------------------------------------------------

export const invitationsTable = pgTable(
  'invitations',
  {
    id: uuid().primaryKey()
      .defaultRandom(),
    workspace_id: text().notNull(),
    workspace_name: text().notNull(),
    /** The invited email (invitee may not yet have an account). */
    email: text().notNull(),
    role: workspaceRoleEnum().notNull(),
    /** Soft ref to the inviting user (display only). */
    invited_by: uuid(),
    created_at: timestamp().notNull()
      .defaultNow(),
    expires_at: timestamp(),
    /** Null until the invite is accepted during workspace select. */
    accepted_at: timestamp(),
  },
  (t) => [
    index('invitations_email_idx').on(t.email),
    index('invitations_workspace_id_idx').on(t.workspace_id),
  ],
);

export type Invitation = typeof invitationsTable.$inferSelect;
export type NewInvitation = typeof invitationsTable.$inferInsert;
