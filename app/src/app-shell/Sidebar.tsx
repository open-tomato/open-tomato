import type { WeekSummary } from '../data';

import {
  SidebarNav,
  SidebarQuickAccess,
  SidebarWeekSummary,
  TomatoMark,
  cn,
} from '@open-tomato/ui-components';

import { DOCS_URL, NAV_ITEMS } from './nav';

export interface SidebarProps {
  collapsed: boolean;
  /** Active nav id ('overview' | 'sessions' | … | 'settings'). */
  activeId: string;
  week: WeekSummary | null;
  /** Navigate to a nav item's URL segment ('' = overview). */
  onNavigateSegment: (segment: string) => void;
}

/**
 * Sidebar per the app-shell spec: brand block matching the topbar
 * height, the data-driven SidebarNav, the week-summary stub anchored to
 * the bottom of the nav area, and the quick-access band (Docs → new
 * tab, Settings → in-app route).
 */
export const Sidebar = ({
  collapsed,
  activeId,
  week,
  onNavigateSegment,
}: SidebarProps) => (
  <>
    <div
      className={cn(
        'flex h-[60px] shrink-0 items-center gap-2.5 border-b border-border-soft',
        collapsed
          ? 'justify-center p-0'
          : 'justify-start px-[18px]',
      )}
    >
      <TomatoMark size={26} />
      {!collapsed && (
        <span className="wordmark !text-[17px]">
          <span className="wordmark-open">open</span>
          {' '}
          <span className="wordmark-tomato">tomato</span>
        </span>
      )}
    </div>
    <SidebarNav
      items={NAV_ITEMS}
      activeId={activeId}
      collapsed={collapsed}
      onNavigate={(id) => {
        const item = NAV_ITEMS.find((n) => n.id === id);
        if (item != null) onNavigateSegment(item.segment);
      }}
    />
    <div className="flex-1" />
    {week != null && (
      <SidebarWeekSummary
        status={week.status}
        used={week.tokensUsed}
        limit={week.tokenLimit}
        collapsed={collapsed}
      />
    )}
    <SidebarQuickAccess
      collapsed={collapsed}
      items={[
        { id: 'docs', label: 'Docs', icon: 'book', href: DOCS_URL },
        {
          id: 'settings',
          label: 'Settings',
          icon: 'settings',
          active: activeId === 'settings',
          onClick: () => onNavigateSegment('settings'),
        },
      ]}
    />
  </>
);
