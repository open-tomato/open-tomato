import {
  button,
  Icon,
  iconButton,
  ThemeSwitcher,
  TomatoMark,
  touchable,
  Wordmark,
  type ThemeName,
} from '@open-tomato/ui-components';
import { forwardRef, type HTMLAttributes, type MouseEvent } from 'react';

import { BrandGlyph } from '../BrandGlyph';
import { cn } from '../lib';

import { portalHeader, portalNavLink } from './Header.variants';

export interface PortalNavLink {
  /** Route id passed to `onNavigate`, and matched against `active`. */
  id: string;
  label: string;
  /** Explicit href; defaults to a `#{id}` fragment. */
  href?: string;
}

/**
 * The default marketing nav. Not exported from the component file
 * (react-refresh only-export-components) — pass your own `links` to override.
 */
const DEFAULT_PORTAL_NAV: readonly PortalNavLink[] = [
  { id: 'home', label: 'Home' },
  { id: 'docs', label: 'Docs' },
  { id: 'blog', label: 'Blog' },
  { id: 'tools', label: 'Tools' },
  { id: 'community', label: 'Community' },
];

export interface HeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** Primary nav links. Defaults to the marketing set. */
  links?: readonly PortalNavLink[];
  /** Id of the active route — highlights the matching link. */
  active?: string;
  /** Called with a link id and the click event when a nav link (or the brand)
   *  is clicked. Links navigate natively via their `href` by default; a SPA
   *  consumer that wants to intercept internal routes calls
   *  `event.preventDefault()` itself before routing. */
  onNavigate?: (id: string, event: MouseEvent<HTMLAnchorElement>) => void;
  /** Current theme, driving the toggle glyph. */
  theme?: ThemeName;
  /** Called with the theme to switch TO. */
  onToggleTheme?: (next: ThemeName) => void;
  /** Search-trigger placeholder. */
  searchPlaceholder?: string;
  /** Called when the search trigger is activated. */
  onSearch?: () => void;
  /** GitHub link target. */
  githubHref?: string;
  /** Primary CTA label. */
  ctaLabel?: string;
  /** Primary CTA target. */
  ctaHref?: string;
}

/**
 * Header — sticky portal chrome. Composes the shared catalog: TomatoMark +
 * Wordmark lockup, Icon-driven search trigger, IconButton for GitHub,
 * ThemeSwitcher for the theme toggle, and a primary Button CTA. Nav links
 * and brand emit `onNavigate(id)`; the app owns routing.
 */
export const Header = forwardRef<HTMLElement, HeaderProps>(
  (
    {
      className,
      links = DEFAULT_PORTAL_NAV,
      active = 'home',
      onNavigate,
      theme = 'light',
      onToggleTheme,
      searchPlaceholder = 'Search docs…',
      onSearch,
      githubHref = '#',
      ctaLabel = 'Open dashboard',
      ctaHref = '#',
      ...props
    },
    ref,
  ) => {
    const navigate = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
      onNavigate?.(id, e);
    };
    return (
      <header ref={ref} className={cn(portalHeader(), className)} {...props}>
        <a
          href="#home"
          onClick={navigate('home')}
          className="inline-flex items-center gap-2.5 !no-underline text-inherit"
        >
          <TomatoMark size={28} />
          {/* Icon-only brand on the narrowest screens keeps the right-side
              controls (search / github / theme / CTA) on one row. */}
          <span className="hidden sm:inline-flex">
            <Wordmark size={20} />
          </span>
        </a>

        <nav aria-label="Primary" className="ml-4 hidden gap-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.id}
              href={l.href ?? `#${l.id}`}
              onClick={navigate(l.id)}
              aria-current={active === l.id
                ? 'page'
                : undefined}
              className={portalNavLink({ active: active === l.id })}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onSearch}
          className="hidden min-w-[200px] cursor-pointer items-center gap-2 rounded-md border border-border-soft bg-surface-sunk px-2.5 py-1.5 text-[13px] text-fg3 md:inline-flex"
        >
          <Icon name="search" size={14} />
          <span className="flex-1 text-left">{searchPlaceholder}</span>
          <kbd className="rounded-[4px] border border-border-soft bg-cream-100 px-1.5 py-px font-mono !text-[10px] text-fg3">

            ⌘K
          </kbd>
        </button>

        <a
          href={githubHref}
          aria-label="GitHub"
          className={cn(iconButton(), '!text-fg1 !no-underline')}
        >
          <BrandGlyph name="github" size={18} />
        </a>
        <ThemeSwitcher theme={theme} onToggle={onToggleTheme} />
        {/* Anchor CTA styled with the shared button variants (not `<Button
            asChild>`: Radix Slot's single-child rule can't hold the label +
            trailing icon). `!` beats tokens.css's unlayered `a` color/underline. */}
        <a
          href={ctaHref}
          className={cn(
            touchable({ rounded: 'md', noBrightness: false }),
            button({ variant: 'primary', size: 'md' }),
            '!text-on-primary !no-underline',
          )}
        >
          {ctaLabel}
          <Icon name="arrow-right" size={16} />
        </a>
      </header>
    );
  },
);

Header.displayName = 'Header';
