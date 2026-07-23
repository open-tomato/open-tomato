import type { SessionDetail } from '../../data';

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { api, DEFAULT_WORKSPACE_ID } from '../../data';
import { withBase, workspaceBase } from '../../routes/paths';

import { ExportTranscriptModal } from './ExportTranscriptModal';
import { NewSessionModal } from './NewSessionModal';

/**
 * Route wrappers for the Sessions sub-routes. Each renders a modal over the
 * SessionsPage list `<Outlet/>`, closing back to the list. Fork/Export
 * fetch the target session detail first, mounting the modal only once the
 * data lands (fresh state per open — no reset effects).
 */

const useCloseToList = (): () => void => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const navigate = useNavigate();
  const base = workspaceBase(workspaceId);
  return () => { void navigate(withBase(base, '/sessions')); };
};

/** `/sessions/new` — the New Session form. */
export const NewSessionRoute = () => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const close = useCloseToList();
  return (
    <NewSessionModal
      open
      onClose={close}
      workspaceId={workspaceId ?? DEFAULT_WORKSPACE_ID}
    />
  );
};

NewSessionRoute.displayName = 'NewSessionRoute';

const useSessionDetail = (sessionId?: string): SessionDetail | null => {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  useEffect(() => {
    if (sessionId == null) return undefined;
    let cancelled = false;
    void api.sessions.detail(sessionId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('session detail load failed', error);
      });
    return () => { cancelled = true; };
  }, [sessionId]);
  return detail;
};

/** `/sessions/:id/fork` — the Fork Session prefill form. */
export const ForkSessionRoute = () => {
  const { workspaceId, sessionId } = useParams<{ workspaceId?: string; sessionId: string }>();
  const close = useCloseToList();
  const detail = useSessionDetail(sessionId);
  if (detail == null) return null;
  return (
    <NewSessionModal
      open
      onClose={close}
      workspaceId={workspaceId ?? DEFAULT_WORKSPACE_ID}
      mode="fork"
      session={detail.session}
      sourceAgentName={detail.agentName}
    />
  );
};

ForkSessionRoute.displayName = 'ForkSessionRoute';

/** `/sessions/:id/export` — the Export transcript modal. */
export const ExportTranscriptRoute = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const close = useCloseToList();
  const detail = useSessionDetail(sessionId);
  if (detail == null) return null;
  return <ExportTranscriptModal open onClose={close} detail={detail} />;
};

ExportTranscriptRoute.displayName = 'ExportTranscriptRoute';
