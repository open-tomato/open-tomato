
import '../src/styles/globals.css';
import './styles.css';
import type { Theme } from '../src/particles/theme';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { Sidebar, type SidebarNavItem } from '@/templates/Sidebar';

import { SidebarFooter, SidebarHeader, WorkspaceSelector, ToggleSidebar } from './components';
import { SEED_AGENTS, NAV_ITEMS, TITLE_MAP } from './mock-data';
import { SessionsPage } from './pages';
import { PlaceholderPage } from './PlaceHolderPage';
import { SessionComposer } from './SessionComposer';
import { Topbar } from './Topbar';
import { useViewport, type Viewport } from './useViewport';
type Mode = NonNullable<Parameters<typeof Sidebar>[0]['mode']>;
interface HandleNewSessionParams {
  goal: string;
  budget: string;
  model: string;
}
function naturalModeFor(viewport: Viewport): Mode {
  if (viewport === 'mobile') return 'hidden';
  if (viewport === 'tablet') return 'rail';
  return 'expanded';
}

export function DemoApp() {

  const [theme, setTheme] = useState<Theme>('light');
  const [active, setActive] = useState('overview');
  const [composerOpen, setComposerOpen] = useState(false);
  const [, setLogsAgent] = useState(null);
  const [agents, setAgents] = useState(SEED_AGENTS);

  const viewport = useViewport();
  const [mode, setMode] = useState<Mode>(() => naturalModeFor(viewport));

  // Adjust mode when viewport crosses a breakpoint — but only auto-shrink
  // (expanded → rail/hidden when the new viewport's natural mode is
  // narrower). Anything else preserves the user's manual toggle.
  //
  // Pattern: compute during render with a stored previous-viewport so
  // the adjustment happens in the same render as the viewport change,
  // without an effect-roundtrip.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const naturalMode = naturalModeFor(viewport);
  const [prevViewport, setPrevViewport] = useState(viewport);
  if (prevViewport !== viewport) {
    setPrevViewport(viewport);
    if (mode === 'expanded' && naturalMode !== 'expanded') {
      setMode(naturalMode);
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const isMobile = viewport === 'mobile';
  const isOverlayOpen = isMobile && mode === 'expanded';

  const handleNewSession = ({ goal, budget, model }: HandleNewSessionParams) => {
    const id = 'agent-' + Math.random().toString(36)
      .slice(2, 6);
    const name = goal.split(' ').slice(0, 3)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    setAgents(a => [{
      id, name: name || 'new-session',
      status: 'running',
      goal,
      model, tokens: 0, tokensMax: parseInt(budget, 10), tools: 3, elapsed: '0s', files: 0,
      color: 'var(--accent)',
    }, ...a]);
    setComposerOpen(false);
  };

  const toggleMode = useCallback(() => {
    if (isMobile) {
      setMode(m => (m === 'hidden'
        ? 'expanded'
        : 'hidden'));
      return;
    }
    setMode(m => (m === 'expanded'
      ? 'rail'
      : 'expanded'));
  }, [isMobile]);

  const openMobileMenu = useCallback(() => setMode('expanded'), []);
  const closeMobileMenu = useCallback(() => setMode('hidden'), []);

  const handleNavigate = useCallback((id: string) => {
    setActive(id);
    if (isMobile) closeMobileMenu();
  }, [isMobile, closeMobileMenu]);

  const navItems = useMemo<SidebarNavItem[]>(() => NAV_ITEMS.map(({
    id, label, Icon,
  }) => ({
    id,
    label,
    href: `#${id}`,
    active: active === id,
    leading: <Icon size={24} />,
    onClick: (event) => {
      event.preventDefault();
      handleNavigate(id);
    },
  })), [active, handleNavigate]);
  
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <Sidebar
        mode={mode}
        floating={isMobile}
        header={<SidebarHeader />}
        nav={navItems}
        footer={(
          <SidebarFooter
            active={active}
            onNavigate={handleNavigate}
          />
        )}
        aria-label="Application navigation"
      >
        <WorkspaceSelector isCompact={mode !== 'expanded'} />
      </Sidebar>
      {isOverlayOpen && (
        <div
          role="button"
          aria-label="Close navigation"
          tabIndex={0}
          onClick={closeMobileMenu}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') closeMobileMenu();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'color-mix(in oklab, var(--char-500) 50%, transparent)',
            zIndex: 40,
            cursor: 'pointer',
          }}
        />
      )}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar
          title={TITLE_MAP[active as keyof typeof TITLE_MAP].t}
          subtitle={TITLE_MAP[active as keyof typeof TITLE_MAP].s}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'light'
            ? 'dark'
            : 'light')}
          onNewSession={() => setComposerOpen(true)}
          onOpenMenu={isMobile
            ? openMobileMenu
            : undefined}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 'var(--dashboard-max)', margin: '0 auto', padding: '24px 28px 80px' }}>
            {(active === 'tools' || active === 'usage' || active === 'docs' || active === 'settings') && (
              <PlaceholderPage label={TITLE_MAP[active as keyof typeof TITLE_MAP].t} />
            )}
            {active === 'sessions' && <SessionsPage agents={agents} onAgentClick={setLogsAgent} />}

          </div>
        </div>
      </main>
      <ToggleSidebar isCompact={mode === 'rail'} onToggleMode={toggleMode} size="sm" />
      <SessionComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSubmit={handleNewSession}
      />
    </div>

  );
}
