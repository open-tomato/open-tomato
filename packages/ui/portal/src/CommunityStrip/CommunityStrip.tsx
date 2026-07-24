import { Button } from '@open-tomato/ui-components';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { BrandGlyph } from '../BrandGlyph';
import { cn } from '../lib';

import {
  communityCta,
  portalCommunityStrip,
  quoteAvatar,
  quoteCard,
} from './CommunityStrip.variants';

export interface CommunityQuote {
  /** Handle, e.g. `@maple-dev` — its first letter seeds the avatar. */
  who: string;
  role: string;
  text: string;
}

const DEFAULT_QUOTES: CommunityQuote[] = [
  { who: '@maple-dev', role: 'agent gardener', text: 'Replaced 3 separate tools with Tomato. My terminal looks ridiculous now — in a good way.' },
  { who: '@ren-builds', role: 'ml engineer', text: 'The \'compost old context\' thing is genuinely the most useful long-session primitive I\'ve used.' },
  { who: '@cordelia', role: 'indie founder', text: 'I was worried about the learning curve. Was running my first agent within 4 minutes. Including the install.' },
];

/** The initial shown in the avatar — first letter after a leading `@`. */
const avatarInitial = (who: string): string => (who.replace(/^@/, '')[0] ?? '?').toUpperCase();

const QuoteCard = ({ who, role, text }: CommunityQuote) => (
  <div className={quoteCard()}>
    <p className="!m-0 !text-sm !leading-[1.6] !text-on-accent">&quot;{text}&quot;</p>
    <div className="mt-auto flex items-center gap-2.5">
      <div className={quoteAvatar()}>{avatarInitial(who)}</div>
      <div>
        <div className="font-mono text-xs">{who}</div>
        <div className="text-[11px] opacity-70">{role}</div>
      </div>
    </div>
  </div>
);

/** Decorative circuit pattern bleeding behind the strip. */
const CommunityCircuit = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08]">
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1200 400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M-20 200 L80 200 L100 180 L260 180 L280 220 L440 220 L460 180 L620 180 L640 220 L800 220 L820 180 L980 180 L1000 220 L1220 220" />
      {[80, 260, 440, 620, 800, 980].map((x) => (
        <circle key={x} cx={x} cy={200} r="4" fill="currentColor" />
      ))}
    </svg>
  </div>
);

export interface CommunityStripProps extends HTMLAttributes<HTMLElement> {
  eyebrow?: ReactNode;
  /** Heading — pass a highlight `<span className="text-cream-50">`. */
  heading?: ReactNode;
  lead?: ReactNode;
  quotes?: CommunityQuote[];
  /** CTA row. Defaults to the GitHub / Discord inverse pair. */
  actions?: ReactNode;
}

/**
 * CommunityStrip — the accent-filled contributor band. Headings/paragraphs
 * carry `!text-on-accent` to beat tokens.css's unlayered `h2`/`p` fg1 color
 * rule (they would otherwise render dark on the accent fill). CTAs reuse the
 * shared Button with the strip's own inverse `communityCta` tones.
 */
export const CommunityStrip = forwardRef<HTMLElement, CommunityStripProps>(
  (
    {
      className,
      eyebrow = 'built with friends',
      heading,
      lead,
      quotes = DEFAULT_QUOTES,
      actions,
      ...props
    },
    ref,
  ) => (
    <section ref={ref} className={cn(portalCommunityStrip(), className)} {...props}>
      <CommunityCircuit />
      <div className="relative mx-auto max-w-[var(--content-max)]">
        <div className="mb-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-[60px]">
          <div>
            <div className="mb-2.5 font-mono text-xs uppercase tracking-[0.12em] opacity-70">
              {eyebrow}
            </div>
            <h2 className="!m-0 !text-[48px] !font-extrabold !leading-none !tracking-[-0.025em] !text-on-accent">
              {heading ?? (
                <>
                  Come cook <span className="text-cream-50">something</span> with us.
                </>
              )}
            </h2>
          </div>
          <p className="!m-0 !text-[17px] !leading-[1.6] !text-on-accent opacity-[0.92]">
            {lead ??
              'Open Tomato is a community-run project. The roadmap is in the open. The Discord is rowdy. The PRs are welcomed. If you ship something using us — or want help shipping something — come hang out.'}
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map((q) => (
            <QuoteCard key={q.who} {...q} />
          ))}
        </div>

        {actions ?? (
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="lg"
              className={communityCta({ tone: 'solid' })}
              iconLeading={<BrandGlyph name="github" size={18} />}
            >
              Star us on GitHub
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className={communityCta({ tone: 'outline' })}
              iconLeading={<BrandGlyph name="discord" size={18} />}
            >
              Join the Discord
            </Button>
          </div>
        )}
      </div>
    </section>
  ),
);

CommunityStrip.displayName = 'CommunityStrip';
