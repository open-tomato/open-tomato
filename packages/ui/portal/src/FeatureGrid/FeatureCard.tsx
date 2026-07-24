import { Icon } from '@open-tomato/ui-components';
// Pure `import type` — fully erased at build so no bare `lucide-react/dynamic`
// side-effect import lands in dist (that subpath isn't in lucide's exports map
// and breaks strict-ESM consumers; the Icon atom lazy-loads it at runtime).
import type { IconName } from 'lucide-react/dynamic';
import { forwardRef, type HTMLAttributes } from 'react';

import { BrandGlyph, type BrandGlyphName } from '../BrandGlyph';
import { cn } from '../lib';

import {
  featureCard,
  featureIconTile,
  featureTag,
  type FeatureIconTileVariants,
} from './FeatureGrid.variants';

/** Icon name — a lucide name, or one of the portal brand marks. */
export type FeatureIcon = IconName | BrandGlyphName;

export interface FeatureCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
  Required<Pick<FeatureIconTileVariants, 'tone'>> {
  /** Lucide icon name, or `github` / `discord` for a brand mark. */
  icon: FeatureIcon;
  title: string;
  desc: string;
  /** Mono tag pinned to the card foot. */
  tag: string;
}

const BRAND_NAMES: BrandGlyphName[] = ['github', 'discord'];
const isBrand = (name: FeatureIcon): name is BrandGlyphName => (BRAND_NAMES as string[]).includes(name);

/**
 * FeatureCard — the tinted-icon feature block used by FeatureGrid. Renders a
 * brand mark for `github` / `discord` (which lucide lacks), else a shared
 * lucide `Icon`.
 */
export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ className, icon, title, desc, tag, tone, ...props }, ref) => (
    <div ref={ref} className={cn(featureCard(), className)} {...props}>
      <div className={featureIconTile({ tone })}>
        {isBrand(icon)
          ? <BrandGlyph name={icon} size={22} />
          : <Icon name={icon} size={22} />}
      </div>
      <div>
        <h3 className="!m-0 !mb-2 !text-[20px] !font-bold !leading-[1.2] !tracking-[-0.01em]">
          {title}
        </h3>
        <p className="!m-0 !text-sm !leading-[1.6] !text-fg2">{desc}</p>
      </div>
      <div className="mt-auto">
        <span className={featureTag()}>{tag}</span>
      </div>
    </div>
  ),
);

FeatureCard.displayName = 'FeatureCard';
