import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../lib';

import { FeatureCard, type FeatureCardProps } from './FeatureCard';
import { portalFeatureGrid } from './FeatureGrid.variants';

export type Feature = FeatureCardProps;

const DEFAULT_FEATURES: Feature[] = [
  {
    icon: 'bot',
    title: 'One pane for every agent',
    desc: 'Watch what every run is doing, what it\'s spending, and what it touched. Tomato Dashboard keeps an eye on the whole fleet so you don\'t have to.',
    tag: 'dashboard',
    tone: 'primary',
  },
  {
    icon: 'terminal',
    title: 'A CLI that gets out of the way',
    desc: 'Seed a run from your terminal. Pipe goals in from a script. Replay any session. Plays nicely with whatever editor or shell you already love.',
    tag: 'cli',
    tone: 'accent',
  },
  {
    icon: 'zap',
    title: 'Bring your own model',
    desc: 'Haiku for fast turns. Sonnet for balance. Opus for the deep stuff. Configure per-session, or set a default and forget it.',
    tag: 'providers',
    tone: 'gold',
  },
  {
    icon: 'leaf',
    title: 'Compost stale context',
    desc: 'Long-running sessions go off the rails. We\'re experimenting with new ways to gracefully forget — keep what matters, drop what doesn\'t.',
    tag: 'experiment',
    tone: 'green',
  },
  {
    icon: 'book',
    title: 'Roadmap-driven runs',
    desc: 'Keep your tasks in one list. Seed an agent from any of them. Watch the diff. Merge with confidence — or kick it back for another pass.',
    tag: 'workflow',
    tone: 'info',
  },
  {
    icon: 'github',
    title: 'Open source, MIT, forever',
    desc: 'Every line of code, every config decision, every weird experiment — in the open. Fork it, fix it, send a PR. Or just steal the bits you like.',
    tag: 'community',
    tone: 'red',
  },
];

export interface FeatureGridProps extends HTMLAttributes<HTMLElement> {
  eyebrow?: ReactNode;
  heading?: ReactNode;
  features?: Feature[];
}

/**
 * FeatureGrid — a section heading over a three-column grid of FeatureCards.
 * Content defaults to the marketing kit; pass `features` to drive it from
 * data.
 */
export const FeatureGrid = forwardRef<HTMLElement, FeatureGridProps>(
  (
    {
      className,
      eyebrow = 'what\'s in the patch',
      heading = 'A small toolkit, lovingly tended.',
      features = DEFAULT_FEATURES,
      ...props
    },
    ref,
  ) => (
    <section ref={ref} className={cn(portalFeatureGrid(), className)} {...props}>
      <div className="mb-9 max-w-[640px]">
        <div className="mb-2.5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-accent">
          {eyebrow}
        </div>
        <h2 className="!m-0 !text-[44px] !font-bold !leading-[1.05] !tracking-[-0.02em]">
          {heading}
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {features.map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </section>
  ),
);

FeatureGrid.displayName = 'FeatureGrid';
