import type { ReactNode } from 'react';

import { cn } from '@open-tomato/ui-components';

export interface PageHeadProps {
  title: ReactNode;
  sub: ReactNode;
  /**
   * Page tag words (spec: "Subtitle / Tags" — e.g. Overview's
   * `tokens - sessions - spend`), joined with the spec's ` - ` separator.
   */
  tags?: string[];
  /**
   * Right-aligned head toolbar/action slot. The flex classes only apply
   * when an action is present, so action-less pages keep the plain block
   * layout.
   */
  action?: ReactNode;
}

/**
 * The page heading block every shell page opens with (title + tags +
 * context, optional right-aligned toolbar). Ported from the WS04 reference
 * pages' shared PageHead so app pages read against the same head contract.
 */
export const PageHead = ({ title, sub, tags, action }: PageHeadProps) => (
  <div
    className={cn(
      'mb-[18px]',
      action != null
        && 'flex flex-wrap items-start justify-between gap-x-6 gap-y-3',
    )}
  >
    <div className="min-w-0">
      <h1 className="m-0 mb-1 font-display text-2xl font-bold tracking-[-0.015em] text-fg1">
        {title}
      </h1>
      {tags != null && tags.length > 0 && (
        <div className="mb-1 font-mono text-[11px] lowercase tracking-[0.04em] text-fg3">
          {tags.join(' - ')}
        </div>
      )}
      <p className="m-0 text-[13.5px] text-fg3">{sub}</p>
    </div>
    {action != null && (
      <div className="flex flex-wrap items-center gap-2">{action}</div>
    )}
  </div>
);

PageHead.displayName = 'PageHead';
