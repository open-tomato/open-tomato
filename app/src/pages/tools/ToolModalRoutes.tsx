import type { ToolEditorMode } from './ToolEditorModal';
import type { Tool } from '../../data';

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { api } from '../../data';
import { withBase, workspaceBase } from '../../routes/paths';

import { ToolEditorModal } from './ToolEditorModal';

/**
 * Route wrappers for the Tools sub-routes. Each renders the
 * ToolEditorModal over the ToolsPage grid `<Outlet/>`, closing back to the
 * grid. Edit/Clone fetch the target tool first, mounting the modal only
 * once it lands (fresh state per open — no reset effects).
 */

const useCloseToGrid = (): () => void => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const navigate = useNavigate();
  const base = workspaceBase(workspaceId);
  return () => { void navigate(withBase(base, '/tools')); };
};

const useTool = (toolId?: string): Tool | null => {
  const [tool, setTool] = useState<Tool | null>(null);
  useEffect(() => {
    if (toolId == null) return undefined;
    let cancelled = false;
    void api.tools.get(toolId)
      .then((t) => { if (!cancelled) setTool(t); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('tool load failed', error);
      });
    return () => { cancelled = true; };
  }, [toolId]);
  return tool;
};

/** `/tools/new` — the New Tool form. */
export const ToolNewRoute = () => {
  const close = useCloseToGrid();
  return <ToolEditorModal open onClose={close} mode="new" />;
};

ToolNewRoute.displayName = 'ToolNewRoute';

/** `/tools/:id/edit` and `/tools/:id/clone` share the fetch + modal. */
const ToolEditorRoute = ({ mode }: { mode: Extract<ToolEditorMode, 'edit' | 'clone'> }) => {
  const { toolId } = useParams<{ toolId: string }>();
  const close = useCloseToGrid();
  const tool = useTool(toolId);
  if (tool == null) return null;
  return <ToolEditorModal open onClose={close} mode={mode} tool={tool} />;
};

export const ToolEditRoute = () => <ToolEditorRoute mode="edit" />;
ToolEditRoute.displayName = 'ToolEditRoute';

export const ToolCloneRoute = () => <ToolEditorRoute mode="clone" />;
ToolCloneRoute.displayName = 'ToolCloneRoute';
