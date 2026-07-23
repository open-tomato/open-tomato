/**
 * Loading placeholder for the Overview dashboard — mirrors the real
 * layout's block rhythm (stat row, budget row, two chart rows, table) so
 * the page doesn't reflow when data lands. Consistent with the shell's
 * approach, this is a quiet skeleton; error UI is deferred past the PoC.
 */
const Block = ({ className }: { className: string }) => (
  <div
    className={`animate-pulse rounded-lg border border-border-soft bg-surface-sunk ${className}`}
    aria-hidden
  />
);

export const OverviewSkeleton = () => (
  <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading overview">
    <div className="grid grid-cols-4 gap-3.5 max-lg:grid-cols-2">
      <Block className="h-[104px]" />
      <Block className="h-[104px]" />
      <Block className="h-[104px]" />
      <Block className="h-[104px]" />
    </div>
    <Block className="h-[92px]" />
    <div className="grid grid-cols-[1.7fr_1fr] gap-4 max-lg:grid-cols-1">
      <Block className="h-[260px]" />
      <Block className="h-[260px]" />
    </div>
    <div className="grid grid-cols-[1.4fr_1fr] gap-4 max-lg:grid-cols-1">
      <Block className="h-[240px]" />
      <Block className="h-[240px]" />
    </div>
    <Block className="h-[280px]" />
  </div>
);

OverviewSkeleton.displayName = 'OverviewSkeleton';
