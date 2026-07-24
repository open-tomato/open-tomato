/**
 * Roadmap task helpers (WS07 session 3).
 *
 * Owner-handle resolution for the roadmap table's `user-inline` column and
 * the option sources behind the New / Edit Task form (owners, existing
 * tags, and the task list the Relations block draws parent / subtasks /
 * blocked-by / blocking from). Deterministic — derived from the fixtures.
 */

import type { TaskFormOptions } from './types';

import { MEMBERS, TASKS } from './fixtures';

/** The pseudo-owner offered alongside real members (agent-owned tasks). */
export const AGENT_OWNER = 'agent';

/**
 * Resolve a task's `ownerId` to a display handle for the roadmap owner
 * column. An absent owner is an agent-owned task (`agent`); an unknown id
 * degrades to the bare id so the column never renders empty.
 */
export const resolveOwnerHandle = (ownerId?: string): string => {
  if (ownerId == null) return AGENT_OWNER;
  const member = MEMBERS.find((m) => m.id === ownerId);
  return member?.handle ?? ownerId;
};

/**
 * Option sources for the task form: member handles + the `agent`
 * pseudo-owner, the existing tag vocabulary, and every task's id/title for
 * the Relations block. Workspace-scoped for the task list; owners + tags
 * span the workspace roster.
 */
export const buildTaskFormOptions = (workspaceId?: string): TaskFormOptions => {
  const tasks = (workspaceId == null
    ? TASKS
    : TASKS.filter((t) => t.workspaceId === workspaceId));
  const tags = Array.from(new Set(tasks.flatMap((t) => t.tags))).sort();
  return {
    owners: [...MEMBERS.map((m) => m.handle), AGENT_OWNER],
    tags,
    tasks: tasks.map((t) => ({ id: t.id, title: t.title })),
  };
};
