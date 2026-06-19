import { Badge } from '@/atoms/Badge';
import { Button } from '@/atoms/Button';
export function SessionsPage({ agents, onAgentClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button variant="secondary" size="sm" icon="filter">Filter</Button>
        <Badge variant="neutral">all · {agents.length}</Badge>
        <Badge variant="success" dot>running · {agents.filter(a => a.status === 'running').length}</Badge>
        <Badge variant="info">done · {agents.filter(a => a.status === 'done').length}</Badge>
        <Badge variant="danger">failed · {agents.filter(a => a.status === 'failed').length}</Badge>
      </div>
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 110px 130px 120px 90px 90px',
          gap: 14, padding: '10px 16px',
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg3)',
          borderBottom: '1px solid var(--border-soft)',
          background: 'var(--surface-sunk)',
        }}>
          <span>session</span><span>status</span><span>model</span><span>tokens</span><span>elapsed</span><span>files</span>
        </div>
        {agents.map(a => (
          <div key={a.id} onClick={() => onAgentClick(a)} style={{
            display: 'grid', gridTemplateColumns: '1fr 110px 130px 120px 90px 90px',
            gap: 14, padding: '12px 16px',
            borderBottom: '1px solid var(--border-soft)',
            cursor: 'pointer',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>{a.id}</div>
            </div>
            <Badge variant={
              a.status === 'running'
                ? 'success' :
                a.status === 'done'
                  ? 'info' :
                  a.status === 'failed'
                    ? 'danger' :
                    a.status === 'waiting'
                      ? 'warning'
                      : 'neutral'
            } dot={a.status === 'running'}>{a.status}</Badge>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg2)' }}>{a.model}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg2)' }}>{a.tokens.toLocaleString()}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg2)' }}>{a.elapsed}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg2)' }}>{a.files}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
