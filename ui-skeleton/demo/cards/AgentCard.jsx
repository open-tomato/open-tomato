/* global React, Icon, Badge, IconButton */
import { Icon, IconButton, Badge } from './Primitives';

function AgentCard({ agent, onClick }) {
  const { id, name, status, goal, model, tokens, tokensMax, tools, elapsed, files, color } = agent;
  const statusMap = {
    running: { variant: 'success', dot: true, label: 'running' },
    waiting: { variant: 'warning', dot: false, label: 'waiting' },
    failed: { variant: 'danger', dot: false, label: 'failed' },
    done: { variant: 'info', dot: false, label: 'done' },
    idle: { variant: 'neutral', dot: false, label: 'idle' },
  };
  const s = statusMap[status] || statusMap.idle;
  const tokPct = Math.min(100, Math.round((tokens / tokensMax) * 100));
  const isRunning = status === 'running';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        boxShadow: 'var(--shadow-xs)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
        transition: 'box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: color || 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFF8EE', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
            position: 'relative',
          }}>
            {name[0].toUpperCase()}
            {isRunning && (
              <span style={{
                position: 'absolute', inset: -3,
                borderRadius: '50%',
                border: '2px solid var(--success)',
                opacity: 0.6,
                animation: 'pulseRing 1.6s ease-out infinite',
              }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg1)', lineHeight: 1.2 }}>{name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>{id}</div>
          </div>
        </div>
        <Badge variant={s.variant} dot={s.dot}>{s.label}</Badge>
      </div>

      <div style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.5, textWrap: 'pretty' }}>{goal}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: 'var(--fg3)' }}>tokens</span>
          <span style={{ color: 'var(--fg1)' }}>{tokens.toLocaleString()} <span style={{ color: 'var(--fg3)' }}>/ {tokensMax.toLocaleString()}</span></span>
        </div>
        <div style={{ height: 4, background: 'var(--cream-300)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: tokPct + '%', height: '100%', background: tokPct > 80
            ? 'var(--warning)'
            : 'var(--accent)', borderRadius: 2, transition: 'width var(--dur-slow) var(--ease-out)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 4, borderTop: '1px dashed var(--border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="cpu" size={11} /> {model}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="layers" size={11} /> {tools}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="clock" size={11} /> {elapsed}</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>{files} files</span>
      </div>
    </div>
  );
}

export { AgentCard };
