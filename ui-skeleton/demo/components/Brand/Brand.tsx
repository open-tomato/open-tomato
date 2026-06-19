import { TomatoMark } from '../../assets/mock-primitives';

export function Brand({ isCompact }: { isCompact: boolean }) {
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
