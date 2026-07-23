import type { AgentEditorMode } from './AgentEditorModal';
import type { Agent } from '../../data';

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { api } from '../../data';
import { withBase, workspaceBase } from '../../routes/paths';

import { AgentEditorModal } from './AgentEditorModal';

/**
 * Route wrappers for the Agents sub-routes. Each renders the
 * AgentEditorModal over the AgentsPage grid `<Outlet/>`, closing back to
 * the grid. Edit/Clone fetch the target agent first, mounting the modal
 * only once it lands (fresh state per open — no reset effects).
 */

const useCloseToGrid = (): () => void => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const navigate = useNavigate();
  const base = workspaceBase(workspaceId);
  return () => { void navigate(withBase(base, '/agents')); };
};

const useAgent = (agentId?: string): Agent | null => {
  const [agent, setAgent] = useState<Agent | null>(null);
  useEffect(() => {
    if (agentId == null) return undefined;
    let cancelled = false;
    void api.agents.get(agentId)
      .then((a) => { if (!cancelled) setAgent(a); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('agent load failed', error);
      });
    return () => { cancelled = true; };
  }, [agentId]);
  return agent;
};

/** `/agents/new` — the New Agent form. */
export const AgentNewRoute = () => {
  const close = useCloseToGrid();
  return <AgentEditorModal open onClose={close} mode="new" />;
};

AgentNewRoute.displayName = 'AgentNewRoute';

/** `/agents/:id/edit` and `/agents/:id/clone` share the fetch + modal. */
const AgentEditorRoute = ({ mode }: { mode: Extract<AgentEditorMode, 'edit' | 'clone'> }) => {
  const { agentId } = useParams<{ agentId: string }>();
  const close = useCloseToGrid();
  const agent = useAgent(agentId);
  if (agent == null) return null;
  return <AgentEditorModal open onClose={close} mode={mode} agent={agent} />;
};

export const AgentEditRoute = () => <AgentEditorRoute mode="edit" />;
AgentEditRoute.displayName = 'AgentEditRoute';

export const AgentCloneRoute = () => <AgentEditorRoute mode="clone" />;
AgentCloneRoute.displayName = 'AgentCloneRoute';
