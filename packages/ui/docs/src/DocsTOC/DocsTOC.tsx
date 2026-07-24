import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../lib';

import {
  docsTocAside,
  docsTocLabel,
  docsTocLink,
} from './DocsTOC.variants';

export interface DocsTocAnchor {
  /** Anchor target id (rendered as `href="#{id}"`). */
  id: string;
  label: string;
}

export interface DocsTOCProps extends HTMLAttributes<HTMLElement> {
  /** On-page anchors. */
  anchors: readonly DocsTocAnchor[];
  /** Currently-active anchor id (scroll-spy owned by the consumer). */
  active?: string;
  /** Eyebrow label. */
  label?: string;
  /** "Edit this page" link target. Omit to hide the edit card. */
  editHref?: string;
}

/**
 * DocsTOC — the sticky on-page table of contents. Anchors are plain
 * `#fragment` links (in-page scroll); pass `active` if you run a scroll-spy.
 * The edit card renders when `editHref` is set.
 */
export const DocsTOC = forwardRef<HTMLElement, DocsTOCProps>(
  ({ className, anchors, active, label = 'On this page', editHref, ...props }, ref) => (
    <aside ref={ref} className={cn(docsTocAside(), className)} {...props}>
      <div className={docsTocLabel()}>{label}</div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {anchors.map((a) => (
          <li key={a.id}>
            <a
              href={`#${a.id}`}
              aria-current={active === a.id
                ? 'location'
                : undefined}
              className={docsTocLink({ active: active === a.id })}
            >
              {a.label}
            </a>
          </li>
        ))}
      </ul>
      {editHref && (
        <div className="mt-5 rounded-md border border-border-soft bg-surface-1 px-3.5 py-3">
          <div className="mb-1.5 text-xs font-semibold text-fg1">Something off?</div>
          <a href={editHref} className="text-xs text-accent !no-underline">
            Edit this page on GitHub →
          </a>
        </div>
      )}
    </aside>
  ),
);

DocsTOC.displayName = 'DocsTOC';
