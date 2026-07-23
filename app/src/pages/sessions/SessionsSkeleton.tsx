/**
 * Loading placeholder for the Sessions page — mirrors the stat row, the
 * detached filter toolbar and the table so the page doesn't reflow when
 * data lands. Quiet skeleton, consistent with the shell (error UI deferred
 * past the PoC).
 */
const Block = ({ className }: { className: string }) => (
  <div
    className={`animate-pulse rounded-lg border border-border-soft bg-surface-sunk ${className}`}
    aria-hidden
  />
);

export const SessionsSkeleton = () => (
  <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading sessions">
    <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
      <Block className="h-[86px]" />
      <Block className="h-[86px]" />
      <Block className="h-[86px]" />
      <Block className="h-[86px]" />
    </div>
    <Block className="h-[58px]" />
    <Block className="h-[420px]" />
  </div>
);

SessionsSkeleton.displayName = 'SessionsSkeleton';
