/* global React, IconButton, Badge */
import React from 'react';
import { useState, useEffect, useRef } from 'react';
const LOG_LINES = [
  { t: '12:04:21', level: 'info', text: 'Session started · agent-7d2f · model=haiku-4-5' },
  { t: '12:04:22', level: 'tool', text: 'fs.read src/auth/index.ts (1,284 tokens)' },
  { t: '12:04:23', level: 'tool', text: 'fs.read src/auth/session.ts (812 tokens)' },
  { t: '12:04:25', level: 'think', text: 'Identified 3 call-sites depending on legacy token shape.' },
  { t: '12:04:26', level: 'tool', text: 'fs.edit src/auth/session.ts (+42 −18)' },
  { t: '12:04:29', level: 'tool', text: 'shell.exec npm test -- auth' },
  { t: '12:04:31', level: 'ok', text: 'all 14 auth tests passing' },
  { t: '12:04:32', level: 'think', text: 'Updating 2 dependent modules…' },
  { t: '12:04:34', level: 'tool', text: 'fs.edit src/auth/middleware.ts (+8 −12)' },
  { t: '12:04:36', level: 'tool', text: 'git.commit "refactor: new session token shape"' },
];

function LogStream({ open, onClose, agentId }) {
  const [visible, setVisible] = useState(0);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (!open) { setVisible(0); return; }
    setVisible(1);
    const iv = setInterval(() => {
      setVisible(v => {
        if (v >= LOG_LINES.length) { clearInterval(iv); return v; }
        return v + 1;
      });
    }, 380);
    return () => clearInterval(iv);
  }, [open]);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [visible]);

  if (!open) return null;

  const levelColor = {
    info: 'var(--info)',
    tool: 'var(--accent)',
    think: 'var(--fg2)',
    ok: 'var(--success)',
    err: 'var(--danger)',
  };

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      width: 560, maxWidth: '92vw',
      maxHeight: 380,
      background: 'var(--char-500)',
      color: 'var(--cream-100)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--char-200)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 40,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      animation: 'slideInUp var(--dur-base) var(--ease-out)',
    }}>
      <div style={{
        padding: '10px 14px',
        background: 'var(--char-600)',
        borderBottom: '1px solid var(--char-300)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-300)', boxShadow: '0 0 8px var(--green-300)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cream-100)' }}>logs · <span style={{ color: 'var(--warm-400)' }}>{agentId}</span></span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: 'var(--cream-200)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 14,
            padding: '2px 8px', borderRadius: 4,
          }}>×</button>
        </div>
      </div>
      <div ref={scrollerRef} style={{
        flex: 1, overflowY: 'auto',
        padding: '10px 14px',
        fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6,
      }}>
        {LOG_LINES.slice(0, visible).map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 2 }}>
            <span style={{ color: 'var(--warm-400)', flexShrink: 0 }}>{l.t}</span>
            <span style={{ color: levelColor[l.level], width: 46, flexShrink: 0, fontWeight: 600 }}>{l.level}</span>
            <span style={{ color: 'var(--cream-100)' }}>{l.text}</span>
          </div>
        ))}
        {visible < LOG_LINES.length && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--warm-400)' }}>
            <span style={{ width: 8, height: 14, background: 'var(--green-300)', display: 'inline-block', animation: 'blink 1s steps(2) infinite' }} />
          </div>
        )}
      </div>
    </div>
  );
}

export { LogStream };
