import type {
  NotificationRecord,
  SearchSuggestionRecord,
  User,
  Workspace,
} from '../data';
import type {
  NotificationItem,
  SearchSuggestion,
  WorkspaceOption,
} from '@open-tomato/ui-components';

import {
  NotificationsBell,
  ProfileMenu,
  SearchSuggest,
  ThemeSwitcher,
  WorkspaceSwitcher,
} from '@open-tomato/ui-components';

import { useTheme } from '../theme/theme-context';

export interface TopbarProps {
  title: string;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  user: User | null;
  notifications: NotificationRecord[];
  suggestions: SearchSuggestionRecord[];
  onSwitchWorkspace: (workspaceId: string) => void;
  /** Navigate to a workspace-relative path ("/sessions/ses-001"). */
  onNavigate: (subPath: string) => void;
  /** Enter without a selection — fall through to /search?q=…. */
  onSearchAll: (query: string) => void;
  onMarkAllNotificationsRead: () => void;
}

/** Deterministic short label for the bell's time chip ("Jul 20"). */
const timeLabel = (iso: string): string => new Date(iso).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const toWorkspaceOption = (w: Workspace): WorkspaceOption => ({
  id: w.id,
  name: w.name,
  members: w.members,
  tone: w.tone,
});

/** SearchSuggest rows keep their record's target on the object itself. */
type SuggestionWithHref = SearchSuggestion & { href: string };

const toSuggestion = (s: SearchSuggestionRecord): SuggestionWithHref => ({
  kind: s.kind,
  label: s.label,
  sub: s.sub,
  href: s.href,
});

const toNotificationItem = (n: NotificationRecord): NotificationItem => ({
  id: n.id,
  level: n.level,
  title: n.title,
  body: n.body,
  time: timeLabel(n.createdAt),
  unread: n.unread,
});

/**
 * Topbar chrome per the app-shell spec: WorkspaceSwitcher (hides
 * itself for single-workspace users), page title, SearchSuggest with its
 * built-in global ⌘K scope switch, NotificationsBell, ThemeSwitcher
 * (hidden under a `system` preference) and ProfileMenu with the inline
 * logout confirm.
 */
export const Topbar = ({
  title,
  workspaces,
  activeWorkspaceId,
  user,
  notifications,
  suggestions,
  onSwitchWorkspace,
  onNavigate,
  onSearchAll,
  onMarkAllNotificationsRead,
}: TopbarProps) => {
  const { theme, preference, setTheme } = useTheme();
  const hrefByLabel = new Map(
    suggestions.map((s) => [`${s.kind}:${s.label}`, s.href]),
  );

  const openSuggestion = (picked: SearchSuggestion): void => {
    const href = (picked as SuggestionWithHref).href
      ?? hrefByLabel.get(`${picked.kind}:${picked.label}`);
    if (href == null) return;
    if (href.startsWith('http')) {
      window.open(href, '_blank', 'noreferrer');
      return;
    }
    onNavigate(href);
  };

  return (
    <>
      <WorkspaceSwitcher
        workspaces={workspaces.map(toWorkspaceOption)}
        activeId={activeWorkspaceId}
        onSwitch={onSwitchWorkspace}
        onSeeAll={() => onNavigate('/settings/workspaces')}
        onNew={() => onNavigate('/settings/workspaces')}
      />
      <div className="font-display text-lg font-bold tracking-[-0.015em] text-fg1">
        {title}
      </div>
      <div className="flex-1" />
      <SearchSuggest
        suggestions={suggestions.map(toSuggestion)}
        className="w-[240px]"
        onSelect={openSuggestion}
        onSearch={onSearchAll}
      />
      <NotificationsBell
        notifications={notifications.map(toNotificationItem)}
        onMarkAllRead={onMarkAllNotificationsRead}
        onOpenItem={() => onNavigate('/notifications')}
        onSeeAll={() => onNavigate('/notifications')}
      />
      <ThemeSwitcher theme={theme} preference={preference} onToggle={setTheme} />
      {user != null && (
        <ProfileMenu
          user={{ name: user.name, email: user.email, role: user.role }}
          onProfile={() => onNavigate('/settings/profile')}
          onAccountSettings={() => onNavigate('/settings')}
          onSwitchWorkspace={() => onNavigate('/settings/workspaces')}
          onLogout={() => {
            // No auth yet (WS08/WS09) — logout is a stub in session 0.
          }}
        />
      )}
    </>
  );
};
