import { Badge } from '../../assets/mock-primitives';
export function UsageCard({ isCompact }: { isCompact: boolean }) {
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
    </>
  );
}
