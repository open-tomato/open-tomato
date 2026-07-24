import type { SettingsNavItem } from './SettingsNav';
import type { User } from '../../data';

import { Icon } from '@open-tomato/ui-components';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { api } from '../../data';
import { withBase, workspaceBase } from '../../routes/paths';
import { PageHead } from '../shared/PageHead';

import { SettingsNav } from './SettingsNav';

/** The default section (Profile) — always present, never admin-gated. */
const PROFILE_SECTION: SettingsNavItem = {
  id: 'profile',
  label: 'Your profile',
  description: 'Identity, account, security',
  icon: 'user',
};

const SETTINGS_SECTIONS: SettingsNavItem[] = [
  PROFILE_SECTION,
  { id: 'workspaces', label: 'Workspaces', description: 'Active spaces, defaults, danger zone', icon: 'layers' },
  { id: 'members', label: 'Members & groups', description: 'People and the groups they sit in', icon: 'users' },
  { id: 'notifications', label: 'Notifications', description: 'Per-event channel routing', icon: 'bell' },
  { id: 'integrations', label: 'Integrations', description: 'Slack, GitHub, Linear, PagerDuty…', icon: 'plug-zap', adminOnly: true },
];

/**
 * SettingsPage (`/settings/*`) — WS07 session 3. Spec: the WS04 reference
 * SettingsPage (UI-Settings.md).
 *
 * SHELL ONLY (spec: "full settings is a separate future effort"): a left
 * column of SettingsNav buttons driving a placeholder content panel per
 * section. The real settings forms are intentionally STUBBED. The active
 * section is URL state — the `/settings/:section` splat — so the panel is
 * deep-linkable (notification hrefs point at `/settings/members`,
 * `/settings/notifications`). Integrations is admin-only, gated on the
 * current user's role.
 */
export const SettingsPage = () => {
  const { workspaceId, '*': splat } = useParams<{ workspaceId?: string; '*': string }>();
  const navigate = useNavigate();
  const base = workspaceBase(workspaceId);

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let cancelled = false;
    void api.users.me()
      .then((me) => { if (!cancelled) setUser(me); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('settings user load failed', error);
      });
    return () => { cancelled = true; };
  }, []);

  const isAdmin = user == null || user.role === 'owner' || user.role === 'admin';
  const items = SETTINGS_SECTIONS.filter((s) => isAdmin || s.adminOnly !== true);

  const sectionId = (splat ?? '').split('/')[0] || 'profile';
  const active = items.find((s) => s.id === sectionId) ?? PROFILE_SECTION;

  const select = (id: string): void => {
    void navigate(withBase(base, `/settings/${id}`));
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title="Settings"
        sub="You, the workspace, the team, and how everything talks to everything else."
      />
      <div className="grid grid-cols-1 items-start gap-7 md:grid-cols-[240px_1fr]">
        <SettingsNav items={items} activeId={active.id} onSelect={select} />
        <section aria-labelledby="settings-section-title" className="min-w-0">
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-soft bg-surface-1 px-6 py-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent)_12%,var(--surface-sunk))] text-accent">
              <Icon name={active.icon} size={20} />
            </span>
            <h4
              id="settings-section-title"
              className="m-0 font-display text-[15px] font-bold text-fg1"
            >
              {active.label}
            </h4>
            <p className="m-0 max-w-[340px] text-[13px] leading-normal text-fg3">
              {active.description}. This section is a placeholder — the full
              Settings surface is a separate effort and lands in a later
              session.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

SettingsPage.displayName = 'SettingsPage';
