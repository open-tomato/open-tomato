/**
 * Loading placeholder for the Agents grid — a filter toolbar bar over a
 * responsive card grid, matching the loaded layout's rhythm so nothing
 * reflows when data lands.
 */
const Block = ({ className }: { className: string }) => (
  <div
    className={`animate-pulse rounded-lg border border-border-soft bg-surface-sunk ${className}`}
    aria-hidden
  />
);

export const AgentsSkeleton = () => (
  <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading agents">
    <Block className="h-[58px]" />
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
      {Array.from({ length: 6 }, (_, i) => (
        <Block key={i} className="h-[196px]" />
      ))}
    </div>
  </div>
);

AgentsSkeleton.displayName = 'AgentsSkeleton';
