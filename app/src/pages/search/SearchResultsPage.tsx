import type { SearchResultRecord } from '../../data';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

import { api, DEFAULT_WORKSPACE_ID } from '../../data';
import { workspaceBase } from '../../routes/paths';
import { PageHead } from '../shared/PageHead';

import { SearchResultList } from './SearchResultList';

/**
 * SearchResultsPage (`/search?q=…`) — WS07 session 3. Spec: the WS04
 * reference SearchResultsPage + the POC-RELEASE-PLANS search-results
 * guidelines. The full-page fall-through target of the topbar
 * SearchSuggest (⌘K → Enter with no selection).
 *
 * Reads the `?q=` param (the SearchSuggest enter-fallthrough target), a
 * "Results for '…'" header over the double-row SearchResultList — results
 * come from `api.search.results`, re-fetched whenever the query changes
 * (an empty query returns nothing → the empty state). Rows navigate on
 * click; docs open in a new tab.
 */
export const SearchResultsPage = () => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const [searchParams] = useSearchParams();
  const base = workspaceBase(workspaceId);
  const activeWorkspaceId = workspaceId ?? DEFAULT_WORKSPACE_ID;
  const query = searchParams.get('q') ?? '';

  const [results, setResults] = useState<SearchResultRecord[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void api.search.results(query, activeWorkspaceId)
      .then((rows) => { if (!cancelled) setResults(rows); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('search results load failed', error);
      });
    return () => { cancelled = true; };
  }, [query, activeWorkspaceId]);

  const rows = results ?? [];

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      <PageHead
        title={(
          <>
            Results for{' '}
            <span className="text-accent">&ldquo;{query}&rdquo;</span>
          </>
        )}
        sub={`${rows.length} ${rows.length === 1
          ? 'match'
          : 'matches'} across sessions, agents, tasks, tools and docs.`}
      />
      {results != null && (
        <SearchResultList
          results={rows}
          base={base}
          emptyTitle={`No matches for “${query}”`}
          emptyDescription="Try a different term, or open the surface you're after from the sidebar."
        />
      )}
    </div>
  );
};

SearchResultsPage.displayName = 'SearchResultsPage';
