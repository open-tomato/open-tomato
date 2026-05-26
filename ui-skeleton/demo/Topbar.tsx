import type { Theme } from '../src/particles/theme';

import { Avatar } from '../src/atoms/Avatar';
import { Button } from '../src/atoms/Button';

import { Icon } from './assets/mock-primitives';
interface TopbarProps {
  title: string;
  subtitle?: string;
  theme: Theme;
  onToggleTheme: () => void;
  onNewSession: () => void;
  /**
   * Optional menu-open trigger. When provided, the Topbar renders a
   * hamburger button at the start that calls this on click. Pass
   * `undefined` (or omit) on tablet/desktop where the rail is
   * persistently visible.
   */
  onOpenMenu?: () => void;
}
function Topbar({ title, subtitle, theme, onToggleTheme, onNewSession, onOpenMenu }: TopbarProps) {
  return (
    <header style={{
      height: 'var(--header-h)',
      borderBottom: '1px solid var(--border-soft)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 24px',
      background: 'color-mix(in oklab, var(--bg) 80%, transparent)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {onOpenMenu && (
        <Button
          leadingIcon="list"
          aria-label="Open navigation menu"
          onClick={onOpenMenu}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.015em', color: 'var(--fg1)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{subtitle}</div>}
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface-sunk)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)',
        padding: '6px 12px',
        width: 320,
        maxWidth: '30%',
      }}>
        <Icon name="search" size={14} style={{ color: 'var(--fg3)' }} />
        <input
          placeholder="Search sessions, agents, tools…"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--fg1)',
            flex: 1,
            minWidth: 0,
          }}
        />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg3)',
          background: 'var(--cream-200)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border-soft)',
        }}>⌘K</span>
      </div>

      <Button variant="primary" size="md" leadingIcon="plus" onClick={onNewSession}>New session</Button>
      <Button leadingIcon="bell" aria-label="Notifications" />
      <Button leadingIcon={theme === 'dark'
        ? 'sun'
        : 'moon'} aria-label="Toggle theme" onClick={onToggleTheme} />
      <Avatar fallback="Sam Lin" color="var(--accent)" />
    </header>
  );
}

// Object.assign(window, { Topbar });
export { Topbar };
