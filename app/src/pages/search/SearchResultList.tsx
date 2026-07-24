import type { SearchResultRecord, SearchSuggestionKind } from '../../data';
import type { IconName } from '@open-tomato/ui-components';

import { cn, EmptyState, Icon } from '@open-tomato/ui-components';
import { Link } from 'react-router';

/**
 * SearchResultList / SearchResultRow — the double-row search results stack.
 *
 * CATALOG GAP: the WS04 `SearchResult` organism is not (yet) in the
 * published `@open-tomato/ui-components` catalog (v0.7.0). Rebuilt app-local
 * here (kind-tinted decorator puck, title over a two-line description,
 * trailing kind pill, the whole row is the click target). Flag for
 * promotion — ideally alongside SearchSuggest into one shared `searchKind`
 * module so the popover and this page can never drift apart.
 */

/** Kind → default Lucide glyph (mirrors SearchSuggest's KIND_ICON). */
const KIND_ICON: Record<SearchSuggestionKind, IconName> = {
  agent: 'bot',
  session: 'terminal',
  task: 'list',
  tool: 'cpu',
  doc: 'book',
};

/** Kind → puck / pill accent (same vocabulary SearchSuggest uses). */
const KIND_ACCENT: Record<SearchSuggestionKind, string> = {
  agent: 'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary',
  session: 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent',
  task: 'bg-[color-mix(in_oklab,var(--gold-500)_14%,transparent)] text-gold-500',
  tool: 'bg-[color-mix(in_oklab,var(--info)_14%,transparent)] text-info',
  doc: 'bg-[color-mix(in_oklab,var(--green-500)_14%,transparent)] text-green-500',
};

const ROW_CLASS = cn(
  'group flex w-full items-start gap-3.5 rounded-lg border border-transparent',
  'px-3.5 py-3 text-left text-fg1 no-underline cursor-pointer transition-colors',
  'hover:border-border-soft hover:bg-surface-sunk',
  'focus-visible:border-border-focus focus-visible:bg-surface-sunk focus-visible:outline-none',
);

interface RowProps {
  result: SearchResultRecord;
  /** Base-prefixed workspace-relative href, or the doc's absolute URL. */
  to: string;
  /** Docs open in a new tab (absolute URL); entities navigate in-app. */
  external: boolean;
}

const SearchResultRow = ({ result, to, external }: RowProps) => {
  const inner = (
    <>
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', KIND_ACCENT[result.kind])}>
        <Icon name={KIND_ICON[result.kind]} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg1">
            {result.title}
          </span>
          <span
            className={cn(
              'shrink-0 rounded-full px-[7px] py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]',
              KIND_ACCENT[result.kind],
            )}
          >
            {result.kind}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-[13px] leading-[1.45] text-fg3">
          {result.description}
        </span>
      </span>
    </>
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={ROW_CLASS}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={to} className={ROW_CLASS}>
      {inner}
    </Link>
  );
};

export interface SearchResultListProps {
  results: SearchResultRecord[];
  /** Prefix for workspace-relative hrefs (docs carry absolute URLs). */
  base: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const SearchResultList = ({
  results,
  base,
  emptyTitle = 'No matches',
  emptyDescription = 'Nothing across sessions, agents, tasks, tools, or docs matched that search.',
}: SearchResultListProps) => {
  if (results.length === 0) {
    return (
      <EmptyState
        className="py-16"
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {results.map((r) => {
        const external = r.href.startsWith('http');
        return (
          <SearchResultRow
            key={r.id}
            result={r}
            to={external
              ? r.href
              : `${base}${r.href}` || '/'}
            external={external}
          />
        );
      })}
    </div>
  );
};

SearchResultList.displayName = 'SearchResultList';
