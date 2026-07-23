import { WorkspacePickPage } from '@open-tomato/ui-components';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  FlowScreen,
  authApi,
  completeSignIn,
  initialWorkspace,
  persistSession,
  workspaceReduce,
  type WorkspaceState,
} from '../auth';
import { type FlowNavState } from '../routes/paths';

import { AuthBanner } from './shared/AuthBanner';

/**
 * Workspace pick — the shared terminal step of sign-in and sign-up. Loads open
 * invitations, reads the user's pick off the selected `OptionCard`
 * (`aria-pressed`), and mints the FINAL session token with the workspace claim.
 *
 * `?kind=fresh` (or nav-state `kind`) renders the self-serve default; otherwise
 * the invited branch. On success: a `signup` intent proceeds to the Done
 * splash; a `signin` intent redirects straight back to the webapp.
 */
export const WorkspaceFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const nav = (location.state ?? {}) as FlowNavState;
  const kind = nav.kind
    ?? (new URLSearchParams(location.search).get('kind') === 'fresh'
      ? 'fresh'
      : 'invited');

  const [state, setState] = useState<WorkspaceState>(
    () => initialWorkspace(nav.userId ?? 'usr_sam', kind),
  );

  // Load invitations once (the machine's `loadInvites` transition is unit-
  // tested directly; here we merge the result without a render-time ref).
  useEffect(() => {
    void authApi.workspace.listInvitations().then((invitations) => {
      setState((s) => ({ ...s, invitations }));
    });
  }, []);

  // Terminal hand-off.
  useEffect(() => {
    if (state.step !== 'done' || state.tokens == null) return;
    persistSession(state.tokens);
    if (nav.intent === 'signup') {
      navigate('/signup/done');
    } else {
      completeSignIn(state.tokens, location.search);
    }
  }, [state.step, state.tokens, nav.intent, navigate, location.search]);

  const onPrimary = (container: HTMLElement) => {
    if (kind === 'fresh') {
      void workspaceReduce(state, { kind: 'select' }).then(setState);
      return;
    }
    const pressed = container.querySelector('button[aria-pressed="true"]');
    const text = pressed?.textContent ?? '';
    const invite = state.invitations.find((i) => text.includes(i.workspaceName));
    void workspaceReduce(state, {
      kind: 'select', invitationId: invite?.id,
    }).then(setState);
  };

  return (
    <FlowScreen onPrimary={(_fields, container) => onPrimary(container)}>
      {state.error != null && <AuthBanner message={state.error} />}
      <WorkspacePickPage kind={kind} />
    </FlowScreen>
  );
};
