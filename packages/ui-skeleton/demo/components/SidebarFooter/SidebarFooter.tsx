
import { LogOut, Settings, HelpCircle } from 'lucide-react';

import { useSidebar } from '@/templates/Sidebar';
import { ButtonNavItem } from '@/templates/Sidebar/components/ButtonNavItem';

import { UsageCard } from '../../components/UsageCard';

interface SidebarFooterProps {
  active: string;
  onNavigate: (id: string) => void;
}

export function SidebarFooter({
  active,
  onNavigate,
}: SidebarFooterProps) {
  const { mode } = useSidebar();
  const isCompact = mode === 'rail' || mode === 'hidden';

  return (
    <>
      {!isCompact && <UsageCard isCompact={isCompact} />}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: 0,
        margin: 0,
      }}>
        {/* Settings buttons opens a modal */}
        <ButtonNavItem
          id="settings"
          label="Settings"
          leading={<Settings size={18} />}
          active={active === 'settings'}
          onClick={() => onNavigate('settings')}
          collapsed={isCompact}
        />
        {/* Docs buttons opens a new tab with documentation page */}

        <ButtonNavItem
          id="help"
          label="Help & feedback"
          leading={<HelpCircle size={18} />}
          active={active === 'help'}
          onClick={() => onNavigate('help')}
          collapsed={isCompact}
        />
        {/* logout with pop up */}
        <ButtonNavItem
          id="logout"
          label="Logout"
          leading={<LogOut size={18} />}
          active={active === 'logout'}
          onClick={() => onNavigate('logout')}
          collapsed={isCompact}
        />
      </div>
    </>
  );
}
