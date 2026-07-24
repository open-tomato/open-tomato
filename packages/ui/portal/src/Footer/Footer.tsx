import { TomatoMark, Wordmark } from '@open-tomato/ui-components';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { BrandGlyph, type BrandGlyphName } from '../BrandGlyph';
import { cn } from '../lib';

import { footerHeading, portalFooter, socialPill } from './Footer.variants';

export interface FooterLink {
  label: string;
  href?: string;
}

export interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

export interface FooterSocial {
  name: BrandGlyphName;
  label: string;
  href?: string;
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  { heading: 'Product', links: ['Dashboard', 'CLI', 'API reference', 'Pricing', 'Changelog'].map((label) => ({ label })) },
  { heading: 'Learn', links: ['Docs', 'Examples', 'Cookbook', 'Blog', 'Glossary'].map((label) => ({ label })) },
  { heading: 'Community', links: ['GitHub', 'Discord', 'Mastodon', 'Bluesky', 'Contribute'].map((label) => ({ label })) },
  { heading: 'Open Tomato', links: ['About', 'Manifesto', 'Roadmap', 'Brand kit', 'License (MIT)'].map((label) => ({ label })) },
];

const DEFAULT_SOCIAL: FooterSocial[] = [
  { name: 'github', label: 'GitHub' },
  { name: 'discord', label: 'Discord' },
];

const DEFAULT_BLURB =
  'An experimental set of tools and frameworks for agentic development. Play. Explore. Learn by doing.';

export interface FooterProps extends HTMLAttributes<HTMLElement> {
  columns?: FooterColumn[];
  /** Brand-column blurb. */
  blurb?: ReactNode;
  social?: FooterSocial[];
  /** Left side of the legal bar. */
  legal?: ReactNode;
  /** Right side of the legal bar. */
  tagline?: ReactNode;
}

/**
 * Footer — brand column (mark + wordmark + blurb + social pills), four link
 * columns, and a mono legal bar. Composes the shared TomatoMark / Wordmark
 * and the portal BrandGlyph for the social marks.
 */
export const Footer = forwardRef<HTMLElement, FooterProps>(
  (
    {
      className,
      columns = DEFAULT_COLUMNS,
      blurb = DEFAULT_BLURB,
      social = DEFAULT_SOCIAL,
      legal = '© 2026 open tomato · MIT licensed · made with friends',
      tagline,
      ...props
    },
    ref,
  ) => (
    <footer ref={ref} className={cn(portalFooter(), className)} {...props}>
      <div className="mx-auto max-w-[var(--content-max)]">
        <div className="mb-12 grid grid-cols-[1.4fr_repeat(4,1fr)] gap-10">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <TomatoMark size={32} />
              <Wordmark size={22} />
            </div>
            <p className="!m-0 max-w-[280px] text-sm leading-relaxed !text-fg2">{blurb}</p>
            <div className="mt-4.5 flex gap-1.5">
              {social.map((s) => (
                <a
                  key={s.name}
                  href={s.href ?? '#'}
                  aria-label={s.label}
                  className={socialPill()}
                >
                  <BrandGlyph name={s.name} size={16} />
                </a>
              ))}
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.heading}>
              <div className={footerHeading()}>{col.heading}</div>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href ?? '#'} className="text-sm !text-fg1 !no-underline hover:!text-primary">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border-soft pt-6 font-mono text-xs text-fg3">
          <span>{legal}</span>
          <span className="inline-flex items-center gap-1.5">
            {tagline ?? (
              <>
                grown in <span className="text-accent">open</span> source
              </>
            )}
          </span>
        </div>
      </div>
    </footer>
  ),
);

Footer.displayName = 'Footer';
