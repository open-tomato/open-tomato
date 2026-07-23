import type {
  NotificationRecord,
  SearchSuggestionRecord,
  UsageStats,
  User,
  Workspace,
} from '../data';

import { useEffect, useState } from 'react';

import { api } from '../data';

export interface ShellData {
  workspaces: Workspace[];
  user: User | null;
  notifications: NotificationRecord[];
  suggestions: SearchSuggestionRecord[];
  usage: UsageStats | null;
  markAllNotificationsRead: () => void;
}

/**
 * Loads everything the shell chrome needs from the mock api in one
 * parallel pass. Notifications are held as local state so mark-all-read
 * can update immutably; real fetching swaps in behind the same shape.
 */
export const useShellData = (workspaceId: string): ShellData => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestionRecord[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.workspaces.list(),
      api.users.me(),
      api.notifications.list(workspaceId),
      api.search.suggest(),
      api.usage.stats(workspaceId).catch(() => null),
    ]).then(([ws, me, ntfs, sugg, stats]) => {
      if (cancelled) return;
      setWorkspaces(ws);
      setUser(me);
      setNotifications(ntfs);
      setSuggestions(sugg);
      setUsage(stats);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const markAllNotificationsRead = (): void => {
    setNotifications((current) => current.map((n) => ({ ...n, unread: false })));
  };

  return {
    workspaces,
    user,
    notifications,
    suggestions,
    usage,
    markAllNotificationsRead,
  };
};
