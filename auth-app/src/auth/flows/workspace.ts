/**
 * Workspace-pick flow state machine.
 *
 * Shared terminal step of sign-in and sign-up. Loads the user's open
 * invitations, then mints the FINAL session token with the active workspace
 * stamped as the `wsp` scope pointer only. Role and invite-acceptance state are
 * NOT in the token (WS09e) — the app resolves them via `workspaceApi.getContext`.
 *
 * picking --loadInvites--> picking (+ invitations)
 * picking --select(invite ok)----> done (+ tokens with wsp only)
 * picking --select(bad invite)---> picking + error
 * picking --select(self-serve)---> done (+ tokens with wsp=ws_default)
 */

import type { WorkspaceApi } from '../api/authApi';
import type { TokenSet, WorkspaceInvitation } from '../types';

import { workspaceApi as defaultApi } from '../api/authApi';

export type WorkspaceStep = 'picking' | 'done';

/** invited = choose from open invites; fresh = seeded self-serve default. */
export type WorkspaceKind = 'invited' | 'fresh';

export interface WorkspaceState {
  step: WorkspaceStep;
  userId: string;
  kind: WorkspaceKind;
  invitations: WorkspaceInvitation[];
  error?: string;
  tokens?: TokenSet;
}

export type WorkspaceEvent =
  | { kind: 'loadInvites' }
  | { kind: 'select'; invitationId?: string };

export const initialWorkspace = (
  userId: string,
  kind: WorkspaceKind = 'invited',
): WorkspaceState => ({
  step: 'picking', userId, kind, invitations: [],
});

export const workspaceReduce = async (
  state: WorkspaceState,
  event: WorkspaceEvent,
  api: WorkspaceApi = defaultApi,
): Promise<WorkspaceState> => {
  switch (event.kind) {
    case 'loadInvites': {
      const invitations = await api.listInvitations();
      return { ...state, invitations };
    }

    case 'select': {
      const result = await api.select({ userId: state.userId, invitationId: event.invitationId });
      if (result.status === 'invalid_invitation') {
        return { ...state, step: 'picking', error: 'That invitation is no longer valid. Pick another or start fresh.' };
      }
      return { ...state, step: 'done', tokens: result.tokens, error: undefined };
    }

    default:
      return state;
  }
};
