/* global React, Icon, Button, IconButton, Badge */
import { useState } from 'react';

import { Button } from '@/atoms/Button';

import { IconButton } from './assets/mock-primitives';
function SessionComposer({ open, onClose, onSubmit }) {
  const [goal, setGoal] = useState('');
  const [budget, setBudget] = useState('50000');
  const [model, setModel] = useState('haiku-4-5');
  const [tools, setTools] = useState(['fs', 'shell', 'git']);

  if (!open) return null;

  const toggleTool = (t) => {
    setTools(prev => prev.includes(t)
      ? prev.filter(x => x !== t)
      : [...prev, t]);
  };

  const handleSubmit = () => {
    if (!goal.trim()) return;
    onSubmit({ goal, budget: parseInt(budget, 10), model, tools });
    setGoal('');
  };

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'color-mix(in oklab, var(--char-700) 60%, transparent)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 50,
          animation: 'fadeIn var(--dur-base) var(--ease-out)',
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, maxWidth: '92vw',
        background: 'var(--surface-2)',
        borderLeft: '1px solid var(--border-soft)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 51,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight var(--dur-base) var(--ease-out)',
      }}>
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.015em' }}>New agent session</div>
            <div style={{ fontSize: 12, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>seed a new run</div>
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="What should this agent do?" hint="Be concrete. The agent reads this verbatim.">
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="e.g. Refactor the auth flow to use the new session token format. Touch only files in src/auth/."
              rows={5}
              style={{
                width: '100%',
                background: 'var(--surface-1)',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--fg1)',
                resize: 'vertical',
                lineHeight: 1.5,
                boxSizing: 'border-box',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--green-400)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-soft)'}
            />
          </Field>

          <Field label="Token budget">
            <div style={{ display: 'flex', gap: 8 }}>
              {['10000', '50000', '200000'].map(v => (
                <button
                  key={v}
                  onClick={() => setBudget(v)}
                  style={{
                    flex: 1,
                    background: budget === v
                      ? 'var(--accent)'
                      : 'var(--surface-1)',
                    color: budget === v
                      ? 'var(--fg-on-accent)'
                      : 'var(--fg1)',
                    border: `1px solid ${budget === v
                      ? 'var(--accent)'
                      : 'var(--border-soft)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--dur-fast) var(--ease-out)',
                  }}>
                  {parseInt(v).toLocaleString()}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Model">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { id: 'haiku-4-5', name: 'claude-haiku-4-5', desc: 'Fast, light tasks · default' },
                { id: 'sonnet-4-5', name: 'claude-sonnet-4-5', desc: 'Balanced reasoning + speed' },
                { id: 'opus-4-5', name: 'claude-opus-4-5', desc: 'Deepest reasoning · slower' },
              ].map(m => (
                <label key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  background: model === m.id
                    ? 'color-mix(in oklab, var(--accent) 8%, var(--surface-1))'
                    : 'var(--surface-1)',
                  border: `1px solid ${model === m.id
                    ? 'var(--accent)'
                    : 'var(--border-soft)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}>
                  <input
                    type="radio"
                    name="model"
                    checked={model === m.id}
                    onChange={() => setModel(m.id)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg1)' }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          <Field label="Tools" hint="Pick the surface area the agent can touch.">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['fs', 'shell', 'git', 'web', 'db', 'tests'].map(t => {
                const on = tools.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTool(t)}
                    style={{
                      background: on
                        ? 'var(--accent)'
                        : 'var(--surface-1)',
                      color: on
                        ? 'var(--fg-on-accent)'
                        : 'var(--fg2)',
                      border: `1px solid ${on
                        ? 'var(--accent)'
                        : 'var(--border-soft)'}`,
                      borderRadius: 'var(--radius-full)',
                      padding: '5px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all var(--dur-fast) var(--ease-out)',
                    }}>
                    {on && <span style={{ marginRight: 4 }}>✓</span>}{t}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-soft)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          background: 'var(--surface-2)',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>
            est. cost ≈ ${(parseInt(budget, 10) * 0.000003).toFixed(2)}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon="play" onClick={handleSubmit}>Run agent</Button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg1)' }}>{label}</label>
      {hint && <div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: -2 }}>{hint}</div>}
      {children}
    </div>
  );
}

// Object.assign(window, { SessionComposer });
export { SessionComposer };
