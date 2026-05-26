
import { Icon } from './assets/mock-primitives';

interface WorkspaceSelectorProps {
  isCompact: boolean;
}

function WorkspaceSelector({ isCompact }: WorkspaceSelectorProps) {
  return (
    !isCompact ?
      <button style={{
        width: '100%',
        background: 'var(--surface-sunk)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        textAlign: 'left',
      }}>
        {/* this should be an avatar or icon-badge for the worskpace */}
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-on-accent)',
          fontWeight: 700,
          fontSize: 11,
          fontFamily: 'var(--font-display)',
        }}>OG</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600,
            fontSize: 13,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>open-garden</div>
          <div style={{
            color: 'var(--fg3)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
          }}>workspace</div>
        </div>
        <Icon name="chevronDown" size={14} style={{ color: 'var(--fg3)' }} />
      </button>
      : null
  );
}

export { WorkspaceSelector };
