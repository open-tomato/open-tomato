/**
 * Workspace-context port — the seam a future standalone Workspace service lifts
 * out behind. Resolves a caller's authorization (role) + pending invite for a
 * workspace on demand, from the memberships/invitations stores. This is where
 * `wspRole`/`inv` went when they left the identity token (WS09e): the token
 * carries only the `wsp` scope pointer; role and invite-state are fetched here.
 *
 * FUTURE (OPT-259): a durable `acceptInvite(sub, invitationId)` method belongs on
 * this port — writing a `workspace_memberships` row + setting
 * `invitations.accepted_at`. Left as a documented extension point; `select` does
 * NOT auto-accept for the PoC. When Workspace becomes its own service, swap
 * `createWorkspaceContext(db)` for an HTTP client behind the same interface — no
 * consumer changes.
 */
import type { Db } from '../db/index.js';
import type { WorkspaceRole } from '../tokens/types.js';

import { getMembershipRole, listOpenInvitationsForEmail } from '../store/invitations.js';

export interface WorkspaceContextResult {
  /** Effective role: the caller's membership role, else a pending invite's role,
   *  else `null` (no access). Authorization lives here now, not in the token. */
  wspRole: WorkspaceRole | null;
  /** Present when the caller is a confirmed member. */
  membership: { role: WorkspaceRole } | null;
  /** Present when the caller has an open (unaccepted) invite to this workspace —
   *  the replacement for the old `inv` token claim. */
  pendingInvite: { id: string; role: WorkspaceRole } | null;
}

export interface WorkspaceContextParams {
  sub: string;
  email: string;
  workspaceId: string;
}

/** The port consumers depend on — never the concrete stores. */
export interface WorkspaceContext {
  resolveContext(params: WorkspaceContextParams): Promise<WorkspaceContextResult>;
}

export function createWorkspaceContext(db: Db): WorkspaceContext {
  return {
    async resolveContext({ sub, email, workspaceId }) {
      const [membershipRole, openInvites] = await Promise.all([
        getMembershipRole(db, sub, workspaceId),
        listOpenInvitationsForEmail(db, email),
      ]);

      const invite = openInvites.find((i) => i.workspaceId === workspaceId) ?? null;
      const pendingInvite = invite == null
        ? null
        : { id: invite.id, role: invite.role };
      const membership = membershipRole == null
        ? null
        : { role: membershipRole };
      const wspRole = membershipRole ?? pendingInvite?.role ?? null;

      return { wspRole, membership, pendingInvite };
    },
  };
}
