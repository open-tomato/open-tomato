import { useLocation, useParams } from 'react-router';

export interface PlaceholderPageProps {
  title: string;
}

/**
 * Session-0 placeholder page: the route's title plus an echo of the
 * resolved params and location, proving the URL patterns wire up before
 * the real pages land in later WS07 sessions.
 */
export const PlaceholderPage = ({ title }: PlaceholderPageProps) => {
  const params = useParams();
  const location = useLocation();
  const entries = Object.entries(params).filter(
    ([key, value]) => key !== '*' && value != null,
  );
  return (
    <section aria-labelledby="page-heading" className="flex flex-col gap-4">
      <header>
        <h1
          id="page-heading"
          className="font-display text-2xl font-bold tracking-[-0.015em] text-fg1"
        >
          {title}
        </h1>
        <p className="mt-1 text-sm text-fg3">
          Placeholder — the real page lands in a later WS07 session.
        </p>
      </header>
      <dl className="flex flex-col gap-1.5 rounded-lg border border-border-soft bg-surface-1 p-4 font-mono text-[12.5px] shadow-xs">
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 text-fg3">path</dt>
          <dd className="min-w-0 break-all text-fg1">
            {location.pathname}
            {location.search}
          </dd>
        </div>
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-3">
            <dt className="w-28 shrink-0 text-fg3">{key}</dt>
            <dd className="min-w-0 break-all text-fg1">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
