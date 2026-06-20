import { TomatoMark } from './assets/mock-primitives';
interface PlaceholderPageProps {
  label: string;
}
function PlaceholderPage({ label }: PlaceholderPageProps ) {
  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--radius-lg)',
      padding: 60,
      textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    }}>
      <TomatoMark size={56} />
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>{label}</div>
      <div style={{ color: 'var(--fg3)', fontSize: 14, maxWidth: 380, lineHeight: 1.5 }}>
        This page is part of the UI kit but not built out in this preview. Come back when we've planted it 🍅
      </div>
    </div>
  );
}

export { PlaceholderPage };
