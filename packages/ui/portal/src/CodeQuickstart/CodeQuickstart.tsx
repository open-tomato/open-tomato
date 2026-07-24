import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../lib';

import { portalCodeQuickstart, terminalCard } from './CodeQuickstart.variants';

/** The charcoal terminal card with a titlebar and the quickstart transcript. */
const DefaultTerminal = ({ path }: { path: string }) => (
  <div className={terminalCard()}>
    <div className="flex items-center gap-2 border-b border-char-300 bg-char-600 px-3.5 py-2.5">
      <span className="size-2.5 rounded-full bg-red-500" />
      <span className="size-2.5 rounded-full bg-gold-500" />
      <span className="size-2.5 rounded-full bg-green-500" />
      <span className="flex-1" />
      <span className="font-mono text-[11px] text-warm-400">{path}</span>
    </div>
    <pre className="!m-0 overflow-x-auto !border-0 !bg-transparent px-5 py-[18px] font-mono !text-[13px] !leading-[1.7] !text-cream-100">
      <span className="text-warm-400"># 1. install the cli</span>{'\n'}
      <span className="text-green-300">$</span> npm install -g <span className="text-red-300">@open-tomato/cli</span>{'\n'}
      {'\n'}
      <span className="text-warm-400"># 2. seed your workspace</span>{'\n'}
      <span className="text-green-300">$</span> tomato init{'\n'}
      <span className="text-warm-400">✓ workspace ready · open-tomato.config.json created</span>{'\n'}
      {'\n'}
      <span className="text-warm-400"># 3. run your first agent</span>{'\n'}
      <span className="text-green-300">$</span> tomato run <span className="text-red-300">&quot;add a settings page&quot;</span> --budget 50k{'\n'}
      <span className="text-green-300">↳ agent-7d2f started · view in dashboard</span>{'\n'}
    </pre>
  </div>
);

export interface CodeQuickstartProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  lead?: ReactNode;
  /** Terminal titlebar path label. */
  path?: string;
  /** Override the terminal card entirely. */
  terminal?: ReactNode;
}

/**
 * CodeQuickstart — copy + terminal band. Copy on the left, a charcoal
 * terminal transcript on the right. The `<pre>` overrides tokens.css's
 * unlayered `pre` element rule (code-bg fill) with `!` for the transparent
 * inverted-terminal treatment.
 */
export const CodeQuickstart = forwardRef<HTMLElement, CodeQuickstartProps>(
  (
    {
      className,
      eyebrow = 'quickstart',
      title = 'Install, seed, run. Three commands.',
      lead = 'We try really hard to keep the on-ramp short. If you\'ve used a CLI before, you\'ll be running your first agent in under five minutes. Promise.',
      path = '~/projects/auth',
      terminal,
      ...props
    },
    ref,
  ) => (
    <section ref={ref} className={cn(portalCodeQuickstart(), className)} {...props}>
      <div className="mx-auto grid max-w-[var(--content-max)] grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <div className="mb-2.5 font-mono text-xs uppercase tracking-[0.12em] text-accent">
            {eyebrow}
          </div>
          <h2 className="!m-0 !mb-3.5 !text-[36px] !font-bold !leading-[1.1] !tracking-[-0.02em]">
            {title}
          </h2>
          <p className="!m-0 max-w-[440px] !text-[15px] !leading-[1.6] !text-fg2">{lead}</p>
        </div>
        {terminal ?? <DefaultTerminal path={path} />}
      </div>
    </section>
  ),
);

CodeQuickstart.displayName = 'CodeQuickstart';
