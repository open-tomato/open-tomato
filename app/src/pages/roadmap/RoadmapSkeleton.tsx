/**
 * Loading placeholder for the Roadmap — a filter toolbar bar over a table
 * frame, matching the loaded layout's rhythm so nothing reflows when data
 * lands.
 */
const Block = ({ className }: { className: string }) => (
  <div
    className={`animate-pulse rounded-lg border border-border-soft bg-surface-sunk ${className}`}
    aria-hidden
  />
);

export const RoadmapSkeleton = () => (
  <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading roadmap">
    <Block className="h-[58px]" />
    <Block className="h-[420px]" />
  </div>
);

RoadmapSkeleton.displayName = 'RoadmapSkeleton';
