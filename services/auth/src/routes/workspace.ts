/**
 * Workspace routes (09c) — the shared terminal step of sign-in and sign-up.
 * Both require a valid access token; the acting user is taken from the verified
 * token, never a client-supplied `userId`.
 *
 * `GET /workspaces/invitations` → `WorkspaceInvitation[]` — the caller's open
 *   invites, with the contract's display fields (`description`, `members`,
 *   `tone`) derived from real data.
 * `POST /workspaces/select` — `{ invitationId? }`:
 *   - `{ status:'ok', tokens }` — mints the FINAL token with `wsp` (+ `wspRole`,
 *     and `inv` for an invite) stamped in. With an invite: validated + bound to
 *     the caller's email. Without: the self-serve default (`ws_default`/`owner`).
 *   - `{ status:'invalid_invitation' }` — unknown / expired / already-accepted /
 *     not addressed to this user.
 */
import type { RouteDeps } from './context.js';
import type { AuthedRequest } from './require-auth.js';
import type { InvitationRow } from '../store/invitations.js';
import type { WorkspaceRole } from '../tokens/types.js';
import type { Request, Response, NextFunction } from 'express';

import { zodToValidationError } from '@open-tomato/errors';
import { Router } from 'express';
import { z } from 'zod';

import {
  countWorkspaceMembers,
  getInvitationById,
  listOpenInvitationsForEmail,
} from '../store/invitations.js';
import { getUserById, normalizeEmail } from '../store/users.js';
import { issueTokenSet } from '../tokens/session-tokens.js';

import { requireAuth } from './require-auth.js';

const SelectSchema = z.object({
  // `userId` may appear in the body (the frontend sends it) but is ignored —
  // the token's `sub` is authoritative. Only `invitationId` is honored.
  userId: z.string().optional(),
  invitationId: z.string().optional(),
});

/** The self-serve workspace minted when no invite is chosen. */
const DEFAULT_WORKSPACE = { id: 'ws_default', role: 'owner' as const };

const TONES = ['accent', 'primary', 'gold'] as const;

/** Deterministic display tone from the workspace id (UI-cosmetic only). */
function toneFor(workspaceId: string): (typeof TONES)[number] {
  let sum = 0;
  for (const ch of workspaceId) sum = (sum + ch.charCodeAt(0)) % 997;
  return TONES[sum % TONES.length]!;
}

/** Whether an invite may be selected by the caller — the single validity gate. */
function inviteIsValidFor(invite: InvitationRow | null, email: string): invite is InvitationRow {
  if (invite == null) return false;
  if (invite.acceptedAt != null) return false;
  if (invite.expiresAt != null && invite.expiresAt.getTime() <= Date.now()) return false;
  return invite.email === normalizeEmail(email);
}

export function workspaceRouter(deps: RouteDeps): Router {
  const router = Router({ mergeParams: true });
  const { db, redis, issuer } = deps;
  const auth = requireAuth(issuer);

  router.get('/invitations', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = (req as AuthedRequest).auth;
      const rows = await listOpenInvitationsForEmail(db, email);

      const invitations = await Promise.all(
        rows.map(async (row) => {
          const [members, inviter] = await Promise.all([
            countWorkspaceMembers(db, row.workspaceId),
            row.invitedBy == null
              ? Promise.resolve(null)
              : getUserById(db, row.invitedBy),
          ]);
          const invitedBy = inviter?.name ?? 'a teammate';
          return {
            id: row.id,
            workspaceId: row.workspaceId,
            workspaceName: row.workspaceName,
            description: `${row.role} · invited by ${invitedBy}`,
            members,
            role: row.role,
            invitedBy,
            tone: toneFor(row.workspaceId),
          };
        }),
      );

      res.status(200).json(invitations);
    } catch (err) {
      next(err);
    }
  });

  router.post('/select', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = SelectSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      const { sub, email, name, amr } = (req as AuthedRequest).auth;
      const { invitationId } = parsed.data;

      let wsp = DEFAULT_WORKSPACE.id;
      let wspRole: WorkspaceRole = DEFAULT_WORKSPACE.role;
      let inv: string | undefined;

      if (invitationId != null) {
        const invite = await getInvitationById(db, invitationId);
        if (!inviteIsValidFor(invite, email)) {
          res.status(200).json({ status: 'invalid_invitation' });
          return;
        }
        wsp = invite.workspaceId;
        wspRole = invite.role;
        inv = invite.id;
      }

      // The FINAL token carries the workspace claim; `amr` is preserved from the
      // session that reached this step (pwd / otp / oauth).
      const tokens = await issueTokenSet(redis, issuer, { sub, email, name, amr, wsp, wspRole, inv });
      res.status(200).json({ status: 'ok', tokens });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
