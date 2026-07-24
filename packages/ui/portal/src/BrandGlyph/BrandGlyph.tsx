import { forwardRef, type SVGAttributes } from 'react';

/**
 * BrandGlyph — the two social/brand marks the portal needs that the shared
 * `Icon` (lucide-by-name) cannot supply: lucide dropped its brand icons, so
 * `github` / `discord` no longer resolve there. The glyphs paint with
 * `currentColor`, matching Icon's stroke treatment (viewBox 0 0 24 24, round
 * caps/joins, 1.75 stroke).
 *
 * Catalog gap: if more brand marks are needed later, this is the home for
 * them.
 */
export type BrandGlyphName = 'github' | 'discord';

const PATHS: Record<BrandGlyphName, string> = {
  github:
    'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22',
  discord:
    'M19 5a16 16 0 00-4-1l-.2.4a13 13 0 00-3.8 0L11 4a16 16 0 00-4 1c-2 3-3 6-2 9 1 1 3 2 5 2l1-2c-1 0-2-1-2-1l.4-.2c2 1 4 1 6 0L15 13s-1 1-2 1l1 2c2 0 4-1 5-2 1-3 0-6-2-9zM10 13c-1 0-1.5-1-1.5-2S9 9 10 9s1.5 1 1.5 2-.5 2-1.5 2zM14 13c-1 0-1.5-1-1.5-2S13 9 14 9s1.5 1 1.5 2-.5 2-1.5 2z',
};

export interface BrandGlyphProps extends Omit<SVGAttributes<SVGSVGElement>, 'name'> {
  name: BrandGlyphName;
  /** Glyph size in px. */
  size?: number;
  /** Stroke width forwarded to the glyph. */
  strokeWidth?: number;
  /** Accessible label. Without it the glyph is decorative (aria-hidden). */
  label?: string;
}

export const BrandGlyph = forwardRef<SVGSVGElement, BrandGlyphProps>(
  ({ name, size = 18, strokeWidth = 1.75, label, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      role={label != null
        ? 'img'
        : undefined}
      aria-label={label}
      aria-hidden={label == null || undefined}
      {...props}
    >
      {PATHS[name]
        .split('M')
        .filter(Boolean)
        .map((seg, i) => (
          <path key={i} d={`M${seg}`} />
        ))}
    </svg>
  ),
);

BrandGlyph.displayName = 'BrandGlyph';
