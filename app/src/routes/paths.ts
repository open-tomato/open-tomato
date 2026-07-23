/**
 * URL patterns (UI-Overview spec): `/` is the single-workspace base;
 * `/workspace/:workspaceId` is the multi-workspace base. Every feature
 * path (sessions, agents, tasks, tools, settings, notifications, search)
 * hangs off whichever base is active.
 */

export const workspaceBase = (workspaceId?: string): string => (workspaceId == null
  ? ''
  : `/workspace/${workspaceId}`);

export const withBase = (base: string, subPath: string): string => `${base}${subPath}` || '/';

export const searchPath = (base: string, query: string): string => `${base}/search?q=${encodeURIComponent(query)}`;
