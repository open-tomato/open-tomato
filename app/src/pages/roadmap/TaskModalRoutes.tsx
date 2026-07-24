import type { Task } from '../../data';

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { api, DEFAULT_WORKSPACE_ID } from '../../data';
import { withBase, workspaceBase } from '../../routes/paths';

import { TaskFormModal } from './TaskFormModal';

/**
 * Route wrappers for the Roadmap sub-routes. Each renders the
 * TaskFormModal over the RoadmapPage table `<Outlet/>`, closing back to
 * the table. Edit fetches the target task first, mounting the modal only
 * once it lands (fresh state per open — no reset effects).
 */

const useCloseToTable = (): () => void => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const navigate = useNavigate();
  const base = workspaceBase(workspaceId);
  return () => { void navigate(withBase(base, '/tasks')); };
};

const useActiveWorkspaceId = (): string => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  return workspaceId ?? DEFAULT_WORKSPACE_ID;
};

const useTask = (taskId?: string): Task | null => {
  const [task, setTask] = useState<Task | null>(null);
  useEffect(() => {
    if (taskId == null) return undefined;
    let cancelled = false;
    void api.tasks.get(taskId)
      .then((t) => { if (!cancelled) setTask(t); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('task load failed', error);
      });
    return () => { cancelled = true; };
  }, [taskId]);
  return task;
};

/** `/tasks/new` — the New Task form. */
export const TaskNewRoute = () => {
  const close = useCloseToTable();
  const workspaceId = useActiveWorkspaceId();
  return <TaskFormModal open onClose={close} mode="new" workspaceId={workspaceId} />;
};

TaskNewRoute.displayName = 'TaskNewRoute';

/** `/tasks/:taskId/edit` — the Edit Task form, prefilled once the task lands. */
export const TaskEditRoute = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const close = useCloseToTable();
  const workspaceId = useActiveWorkspaceId();
  const task = useTask(taskId);
  if (task == null) return null;
  return <TaskFormModal open onClose={close} mode="edit" task={task} workspaceId={workspaceId} />;
};

TaskEditRoute.displayName = 'TaskEditRoute';
