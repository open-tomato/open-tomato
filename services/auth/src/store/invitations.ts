/**
 * Workspace invitation + membership reads. Behind its own module so route tests
 * `vi.mock` it and skip a live Postgres.
 *
 * The DB `invitations` table is intentionally lean (no UI cosmetics); the
 * contract's `WorkspaceInvitation` shape (description / members / tone) is
 * DERIVED in the route from real data — membership count, the inviter's name —
 * rather than stored, so no migration is needed for the display fields.
 */
import type { Db } from '../db/index.js';
import type { WorkspaceRole } from '../tokens/types.js';

import { and, count, eq, gt, isNull, or } from 'drizzle-orm';

import { invitationsTable, workspaceMembershipsTable } from '../db/schema.js';

import { normalizeEmail } from './users.js';

export interface InvitationRow {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string | null;
  expiresAt: Date | null;
  acceptedAt: Date | null;
}

const selectCols = {
  id: invitationsTable.id,
  workspaceId: invitationsTable.workspace_id,
  workspaceName: invitationsTable.workspace_name,
  email: invitationsTable.email,
  role: invitationsTable.role,
  invitedBy: invitationsTable.invited_by,
  expiresAt: invitationsTable.expires_at,
  acceptedAt: invitationsTable.accepted_at,
};

/** Open (unaccepted, unexpired) invitations addressed to `email`. */
export async function listOpenInvitationsForEmail(db: Db, email: string): Promise<InvitationRow[]> {
  return db
    .select(selectCols)
    .from(invitationsTable)
    .where(
      and(
        eq(invitationsTable.email, normalizeEmail(email)),
        isNull(invitationsTable.accepted_at),
        // Null expiry = never expires; else must still be in the future.
        or(isNull(invitationsTable.expires_at), gt(invitationsTable.expires_at, new Date())),
      ),
    );
}

/** A single invitation by id, or `null` when unknown. Validity is judged by the caller. */
export async function getInvitationById(db: Db, id: string): Promise<InvitationRow | null> {
  const rows = await db.select(selectCols).from(invitationsTable)
    .where(eq(invitationsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** How many confirmed members a workspace has — the derived `members` display field. */
export async function countWorkspaceMembers(db: Db, workspaceId: string): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(workspaceMembershipsTable)
    .where(eq(workspaceMembershipsTable.workspace_id, workspaceId));
  return Number(rows[0]?.n ?? 0);
}
