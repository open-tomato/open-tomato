import type React from 'react';
// Lucide-style stroke icons. We use inline SVG so the kit is self-contained.
const ICONS = {
  home: 'M3 12L12 3l9 9M5 10v10h14V10',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  terminal: 'M4 17l6-6-6-6M12 19h8',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H2a2 2 0 110-4h.09A1.65 1.65 0 004.6 8a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V2a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H22a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z',
  bell: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  sun: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 100 10 5 5 0 000-10z',
  moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  bot: 'M12 8V4H8M4 20h16a2 2 0 002-2v-8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2zM2 14h2M20 14h2M15 13v2M9 13v2',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  leaf: 'M11 20A7 7 0 014 13C4 8 11 3 20 4c1 9-3 16-9 16zM2 22c4-4 5-8 7-12',
  play: 'M5 3l14 9-14 9V3z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  square: 'M3 3h18v18H3z',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  arrowUp: 'M5 12l7-7 7 7M12 5v14',
  arrowDown: 'M19 12l-7 7-7-7M12 19V5',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  cpu: 'M4 4h16v16H4zM9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M20 9h3M1 15h3M20 15h3',
  more: 'M12 13a1 1 0 100-2 1 1 0 000 2zM12 6a1 1 0 100-2 1 1 0 000 2zM12 20a1 1 0 100-2 1 1 0 000 2z',
  github: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22',
  book: 'M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z',
};

function TomatoMark({ size = 22, color = 'var(--primary)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ color, flexShrink: 0 }} fill="currentColor">
      <path d="M32 6 C28 8 26 11 26 14 C23 12 20 13 19 15 C20 17 23 18 26 17 C25 20 27 22 30 22 L34 22 C37 22 39 20 38 17 C41 18 44 17 45 15 C44 13 41 12 38 14 C38 11 36 8 32 6 Z" style={{ fill: 'var(--accent)' }} />
      <circle cx="32" cy="38" r="20" />
    </svg>
  );
}
interface IconProps {
  name: keyof typeof ICONS;
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}
function Icon({ name, size = 18, strokeWidth = 1.75, style }: IconProps) {
  const path = ICONS[name];
  if (!path) return <span style={{ display: 'inline-block', width: size, height: size, ...style }} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {path.split('M').filter(Boolean)
        .map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  );
}
interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';
  children: React.ReactNode;
  dot?: boolean;
  style?: React.CSSProperties;
}
function Badge({ variant = 'neutral', children, dot = false, style }: BadgeProps) {
  const variants = {
    success: { bg: 'color-mix(in oklab, var(--success) 18%, transparent)', fg: 'var(--success)', bd: 'var(--border-success)' },
    warning: { bg: 'color-mix(in oklab, var(--warning) 22%, transparent)', fg: 'var(--gold-500)', bd: 'var(--border-gold-500)' },
    danger: { bg: 'color-mix(in oklab, var(--danger) 18%, transparent)', fg: 'var(--danger)', bd: 'var(--border-danger)' },
    info: { bg: 'color-mix(in oklab, var(--info) 18%, transparent)', fg: 'var(--info)', bd: 'var(--border-info)' },
    accent: { bg: 'var(--accent)', fg: 'var(--fg-on-accent)', bd: 'var(--border-accent)' },
    neutral: { bg: 'var(--surface-1)', fg: 'var(--fg2)', bd: 'var(--border-soft)' },
  };
  const v = variants[variant];
  return (
    <span style={{
      background: v.bg,
      color: v.fg,
      border: v.bd
        ? `1px solid ${v.bd}`
        : 'none',
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      fontSize: 12,
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      lineHeight: 1.3,
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {children}
    </span>
  );
}

interface IconButtonProps {
  icon: keyof typeof ICONS;
  label: string;
  onClick: () => void;
  active?: boolean;
  style?: React.CSSProperties;
}
function IconButton({ icon, onClick, label, active = false, style }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        background: active
          ? 'var(--surface-sunk)'
          : 'transparent',
        color: 'var(--fg1)',
        border: 'none',
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background var(--dur-fast) var(--ease-out)',
        ...style,
      }}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

export {
  TomatoMark,
  Icon,
  Badge,
  IconButton,
};
