import { forwardRef, type HTMLAttributes, type MouseEvent } from 'react';

import { cn } from '../lib';

import {
  docsSidebarLink,
  docsSidebarNav,
  docsSidebarSection,
} from './DocsSidebar.variants';

export interface DocsNavItem {
  /** Page id passed to `onNavigate`, matched against `active`. */
  id: string;
  label: string;
  /** Explicit href; defaults to a `#{id}` fragment. */
  href?: string;
}

export interface DocsNavSection {
  section: string;
  items: readonly DocsNavItem[];
}

/**
 * The default docs tree. Not exported from the component file
 * (react-refresh only-export-components) — pass your own `sections`.
 */
const DEFAULT_DOCS_NAV: readonly DocsNavSection[] = [
  {
    section: 'Getting started',
    items: [
      { id: 'intro', label: 'Welcome' },
      { id: 'install', label: 'Install' },
      { id: 'quickstart', label: 'Quickstart' },
      { id: 'concepts', label: 'Core concepts' },
    ],
  },
  {
    section: 'The CLI',
    items: [
      { id: 'tomato-run', label: 'tomato run' },
      { id: 'tomato-seed', label: 'tomato seed' },
      { id: 'tomato-replay', label: 'tomato replay' },
      { id: 'config', label: 'Configuration' },
    ],
  },
  {
    section: 'Dashboard',
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'sessions', label: 'Sessions' },
      { id: 'roadmap', label: 'Roadmap' },
    ],
  },
  {
    section: 'Experiments',
    items: [
      { id: 'compost', label: 'Context compost' },
      { id: 'swarms', label: 'Agent swarms' },
    ],
  },
];

export interface DocsSidebarProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** Section-grouped nav. Defaults to the marketing docs tree. */
  sections?: readonly DocsNavSection[];
  /** Id of the active page — highlights the matching link. */
  active?: string;
  /** Called with a page id when a link is clicked. */
  onNavigate?: (id: string) => void;
}

/**
 * DocsSidebar — the sticky, section-grouped docs nav. Links emit
 * `onNavigate(id)`; the docs app owns routing. Reused by DocsLayout.
 */
export const DocsSidebar = forwardRef<HTMLElement, DocsSidebarProps>(
  ({ className, sections = DEFAULT_DOCS_NAV, active, onNavigate, ...props }, ref) => {
    const navigate = (id: string) => (e: MouseEvent) => {
      e.preventDefault();
      onNavigate?.(id);
    };
    return (
      <nav
        ref={ref}
        aria-label="Docs navigation"
        className={cn(docsSidebarNav(), className)}
        {...props}
      >
        {sections.map((group) => (
          <div key={group.section} className="mb-[18px]">
            <div className={docsSidebarSection()}>{group.section}</div>
            <ul className="m-0 flex list-none flex-col gap-px p-0">
              {group.items.map((it) => (
                <li key={it.id}>
                  <a
                    href={it.href ?? `#${it.id}`}
                    onClick={navigate(it.id)}
                    aria-current={active === it.id
                      ? 'page'
                      : undefined}
                    className={docsSidebarLink({ active: active === it.id })}
                  >
                    {it.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    );
  },
);

DocsSidebar.displayName = 'DocsSidebar';
