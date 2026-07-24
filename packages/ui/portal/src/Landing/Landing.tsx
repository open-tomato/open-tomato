import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { CodeQuickstart } from '../CodeQuickstart';
import { CommunityStrip } from '../CommunityStrip';
import { FeatureGrid } from '../FeatureGrid';
import { Hero } from '../Hero';
import { cn } from '../lib';

import { portalLanding } from './Landing.variants';

export interface LandingProps extends HTMLAttributes<HTMLDivElement> {
  /** Override the hero section. */
  hero?: ReactNode;
  /** Override the quickstart band. */
  codeQuickstart?: ReactNode;
  /** Override the feature grid. */
  featureGrid?: ReactNode;
  /** Override the community strip. */
  communityStrip?: ReactNode;
}

/**
 * Landing — the marketing home composition: Hero, CodeQuickstart,
 * FeatureGrid, and CommunityStrip stacked. This is the page body only — the
 * app frames it with the portal Header + Footer (see the WithChrome story).
 * Each section is slottable so consumers can swap content without
 * re-stacking.
 */
export const Landing = forwardRef<HTMLDivElement, LandingProps>(
  ({ className, hero, codeQuickstart, featureGrid, communityStrip, ...props }, ref) => (
    <div ref={ref} className={cn(portalLanding(), className)} {...props}>
      {hero ?? <Hero />}
      {codeQuickstart ?? <CodeQuickstart />}
      {featureGrid ?? <FeatureGrid />}
      {communityStrip ?? <CommunityStrip />}
    </div>
  ),
);

Landing.displayName = 'Landing';
