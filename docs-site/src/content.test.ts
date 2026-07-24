import { describe, expect, it } from 'vitest';

import { FIRST_PAGE, NAV_SECTIONS, PAGES, pageById, slugify } from './content';

describe('docs content layer', () => {
  it('loads the generated pages with parsed frontmatter', () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(8);
    for (const page of PAGES) {
      expect(page.title).toBeTruthy();
      expect(page.id).toBe(`${page.category}/${page.slug}`);
      expect(page.body.length).toBeGreaterThan(0);
    }
  });

  it('groups nav into the three categories in order', () => {
    expect(NAV_SECTIONS.map((s) => s.section)).toEqual([
      'Concepts',
      'API Reference',
      'Examples',
    ]);
    for (const section of NAV_SECTIONS) {
      expect(section.items.length).toBeGreaterThan(0);
    }
  });

  it('resolves pages by id and exposes a first page', () => {
    expect(pageById(FIRST_PAGE.id)).toBe(FIRST_PAGE);
    expect(pageById('does/not-exist')).toBeUndefined();
  });

  it('derives TOC anchors whose ids match the slugify used by the renderer', () => {
    const withAnchors = PAGES.find((p) => p.anchors.length > 0);
    expect(withAnchors).toBeDefined();
    for (const anchor of withAnchors!.anchors) {
      expect(anchor.id).toBe(slugify(anchor.label));
    }
  });

  it('keeps aggregated pages traceable to their repo source', () => {
    const intro = pageById('concepts/introduction');
    expect(intro?.source).toBe('README.md');
    expect(intro?.editHref).toContain('github.com/open-tomato');
  });
});
