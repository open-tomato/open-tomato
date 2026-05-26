import { sidebarNavLinkVariants, useSidebar } from '@/templates/Sidebar';

import { TomatoMark, Icon, Badge } from './assets/mock-primitives';

interface MockNavItem {
  id: string;
  label: string;
  icon: string;
}

/**
 * Composite header slot for the demo. Renders the brand mark + wordmark,
 * and (when the rail is `expanded`) a workspace switcher tile. Branches
 * on `mode` via `useSidebar` so the brand row centers + workspace switcher
 * hides in the rail / hidden modes.
 */
export function SidebarHeader() {
  const { mode } = useSidebar();
  const isCompact = mode === 'rail' || mode === 'hidden';

  return (
    <>

      <TomatoMark size={28} />
      {!isCompact && (
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 18,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          <span style={{ color: 'var(--wordmark-open)' }}>open</span>{' '}
          <span style={{ color: 'var(--wordmark-tomato)' }}>tomato</span>
        </span>
      )}
    </>
  );
}

interface SidebarFooterProps {
  secondary: MockNavItem[];
  active: string;
  onNavigate: (id: string) => void;
  onToggleMode: () => void;
}

/**
 * Composite footer slot for the demo. Stacks a token-budget mini-card
 * (only when expanded), the secondary nav links, and the rail collapse-
 * toggle button. Renders the secondary nav with the template's exported
 * `sidebarNavLinkVariants` so visual treatment matches the primary nav
 * inside the rail.
 */
export function SidebarFooter({
  secondary,
  active,
  onNavigate,
  onToggleMode,
}: SidebarFooterProps) {
  const { mode, density } = useSidebar();
  const isCompact = mode === 'rail' || mode === 'hidden';

  return (
    <>
      {!isCompact && (
        <div style={{
          background: 'var(--surface-sunk)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--fg3)',
            }}>this week</span>
            <Badge variant="success" dot>healthy</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '-0.01em',
            }}>1.2M</span>
            <span style={{ color: 'var(--fg3)', fontSize: 12 }}>/ 4M tokens</span>
          </div>
          <div style={{
            height: 4,
            background: 'var(--cream-300)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              width: '30%',
              height: '100%',
              background: 'var(--accent)',
              borderRadius: 2,
            }} />
          </div>
        </div>
      )}
      <ul style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        listStyle: 'none',
        padding: 0,
        margin: 0,
      }}>
        {secondary.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(item.id);
                }}
                data-active={isActive
                  ? ''
                  : undefined}
                aria-current={isActive
                  ? 'page'
                  : undefined}
                className={sidebarNavLinkVariants({ density })}
              >
                <span aria-hidden className="inline-flex size-4 shrink-0">
                  <Icon name={item.icon as Parameters<typeof Icon>[0]['name']} size={18} />
                </span>
                {!isCompact && <span className="flex-1 truncate">{item.label}</span>}
              </a>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onToggleMode}
            className={sidebarNavLinkVariants({ density })}
          >
            <span aria-hidden className="inline-flex size-4 shrink-0">
              <Icon name="chevronRight" size={18} />
            </span>
            {/* Label only renders in `expanded` mode (the `isCompact`
                guard hides it in rail / hidden). The visible label is
                always 'Collapse' because clicking it takes the rail
                from expanded → rail. */}
            {!isCompact && <span className="flex-1 truncate">Collapse</span>}
          </button>
        </li>
      </ul>
    </>
  );
}
