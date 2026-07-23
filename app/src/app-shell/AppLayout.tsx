import {
  AppShell,
  AppShellContent,
  AppShellMain,
  AppShellSidebar,
  AppShellTopbar,
} from '@open-tomato/ui-components';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';

import { DEFAULT_WORKSPACE_ID } from '../data';
import { searchPath, withBase, workspaceBase } from '../routes/paths';

import { navIdForSegment, titleForSegment } from './nav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useShellData } from './useShellData';

/**
 * The app frame: AppShell around the routed page (Outlet). Mounted at
 * both bases — `/` (single-workspace) and `/workspace/:workspaceId` —
 * so all shell wiring is expressed against the active base.
 */
export const AppLayout = () => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const activeWorkspaceId = workspaceId ?? DEFAULT_WORKSPACE_ID;
  const base = workspaceBase(workspaceId);
  const subPath = location.pathname.slice(base.length) || '/';
  const [, firstSegment = ''] = subPath.split('/');

  const shell = useShellData(activeWorkspaceId);

  const goTo = (relative: string): void => {
    void navigate(withBase(base, relative));
  };

  return (
    <AppShell>
      <AppShellSidebar collapsed={collapsed}>
        <Sidebar
          collapsed={collapsed}
          activeId={navIdForSegment(firstSegment) ?? firstSegment}
          week={shell.usage?.week ?? null}
          onNavigateSegment={(segment) => goTo(segment === ''
            ? '/'
            : `/${segment}`)}
        />
      </AppShellSidebar>
      <AppShellMain>
        <AppShellTopbar
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        >
          <Topbar
            title={titleForSegment(firstSegment)}
            workspaces={shell.workspaces}
            activeWorkspaceId={activeWorkspaceId}
            user={shell.user}
            notifications={shell.notifications}
            suggestions={shell.suggestions}
            onSwitchWorkspace={(nextId) => {
              // Keep the current sub-path when hopping workspaces.
              void navigate(withBase(workspaceBase(nextId), subPath));
            }}
            onNavigate={goTo}
            onSearchAll={(query) => {
              void navigate(searchPath(base, query));
            }}
            onMarkAllNotificationsRead={shell.markAllNotificationsRead}
          />
        </AppShellTopbar>
        <AppShellContent>
          <Outlet />
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  );
};
