import { Badge, Button, Icon, TomatoMark } from '@open-tomato/ui-components';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { BrandGlyph } from '../BrandGlyph';
import { cn } from '../lib';

import { heroGlow, portalHero } from './Hero.variants';

/** Decorative accent circuit-vine bleed behind the hero. */
const HeroCircuit = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 flex items-center justify-center text-accent opacity-[0.06]"
  >
    <svg
      viewBox="0 0 1200 600"
      className="w-full max-w-[1400px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M0 300 L150 300 L180 280 L340 280 L360 320 L520 320 L540 280 L700 280 L720 320 L860 320 L880 290 L1040 290 L1060 320 L1200 320" />
      <path d="M0 360 L120 360 L140 380 L280 380 L300 360 L460 360 L480 400 L640 400 L660 360 L820 360 L840 380 L1000 380 L1020 360 L1200 360" />
      {[150, 340, 520, 700, 860, 1040, 120, 280, 460, 640, 820, 1000].map((x, i) => (
        <circle key={x} cx={x} cy={i < 6
          ? 280
          : 380} r="4" fill="currentColor" />
      ))}
    </svg>
  </div>
);

const DefaultActions = () => (
  <div className="mt-1.5 flex flex-wrap gap-3">
    <Button variant="primary" size="lg" iconTrailing={<Icon name="arrow-right" size={18} />}>
      Start a session
    </Button>
    <Button variant="secondary" size="lg" iconLeading={<BrandGlyph name="github" size={18} />}>
      Read the source
    </Button>
  </div>
);

const DefaultStats = () => (
  <div className="mt-2.5 flex gap-[18px] font-mono text-xs text-fg3">
    <span className="inline-flex items-center gap-1.5">
      <Icon name="star" size={13} className="text-gold-500" /> 4.2k stars
    </span>
    <span className="inline-flex items-center gap-1.5">
      <Icon name="heart" size={13} className="text-primary" /> 312 contributors
    </span>
    <span className="inline-flex items-center">MIT license</span>
  </div>
);

export interface HeroProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Release / status pill above the headline. */
  badge?: ReactNode;
  /** Display headline — pass a highlight `<span className="text-primary">`. */
  title?: ReactNode;
  /** Supporting lead paragraph. */
  lead?: ReactNode;
  /** CTA row. Defaults to the "Start a session" / "Read the source" pair. */
  actions?: ReactNode;
  /** Social-proof stats row. */
  stats?: ReactNode;
  /**
   * Right-column media. Defaults to the mascot mark in the glow — the
   * published library ships no bespoke hero art, so consumers pass their own
   * here.
   */
  media?: ReactNode;
}

/**
 * Hero — composes the shared Badge / Button / Icon catalog. All content is
 * slotted with marketing defaults so it renders complete out of the box and
 * deterministically in stories.
 */
export const Hero = forwardRef<HTMLElement, HeroProps>(
  (
    {
      className,
      badge,
      title,
      lead,
      actions,
      stats,
      media,
      ...props
    },
    ref,
  ) => (
    <section ref={ref} className={cn(portalHero(), className)} {...props}>
      <HeroCircuit />
      <div className="relative mx-auto grid max-w-[var(--content-max)] grid-cols-1 items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-[22px]">
          <span className="self-start">
            {badge ?? (
              <Badge tone="leaf">
                <Icon name="leaf" size={12} />
                v0.4.2 — fresh from the garden
              </Badge>
            )}
          </span>
          <h1 className="!m-0 !text-[44px] !font-extrabold !leading-none !tracking-[-0.025em] sm:!text-[56px] lg:!text-[72px]">
            {title ?? (
              <>
                Cook with your agents. <span className="text-primary">Compost</span> the rest.
              </>
            )}
          </h1>
          <p className="!m-0 max-w-[540px] !text-[18px] !leading-[1.6] !text-fg2">
            {lead ??
              'Open Tomato is an experimental set of tools for agentic development. A dashboard for your runs. A CLI for your shell. A community to share what works. Free, open source, and a little bit weird — on purpose.'}
          </p>
          {actions ?? <DefaultActions />}
          {stats ?? <DefaultStats />}
        </div>

        <div className="flex items-center justify-center">
          <div className="relative">
            <div className={heroGlow()} />
            {media ?? (
              <div className="relative flex aspect-square w-[min(360px,72vw)] items-center justify-center [&>svg]:h-auto [&>svg]:w-[83%]">
                <TomatoMark size={300} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  ),
);

Hero.displayName = 'Hero';
