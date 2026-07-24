import type { DocsNavSection } from '@open-tomato/ui-docs';

/**
 * Build-time content layer. Vite eagerly inlines every generated markdown file
 * under `content/` as a raw string; we parse the normalized frontmatter (see
 * scripts/generate.mjs) into typed `DocPage`s and derive the sidebar nav and
 * per-page TOC from them. No network, no runtime fetch.
 */

export interface DocPage {
  category: string;
  slug: string;
  /** Route id — `${category}/${slug}`, matched against DocsLayout `active`. */
  id: string;
  path: string;
  title: string;
  lead: string;
  order: number;
  source: string | null;
  editHref: string | null;
  body: string;
  anchors: readonly { id: string; label: string }[];
}

/** Category display order + labels. Categories not listed fall to the end. */
const CATEGORY_META: Record<string, { label: string; order: number }> = {
  concepts: { label: 'Concepts', order: 1 },
  api: { label: 'API Reference', order: 2 },
  examples: { label: 'Examples', order: 3 },
};

/** Deterministic heading→anchor id. Shared with the markdown renderer so TOC
 *  links resolve. */
export const slugify = (text: string): string => text
  .toLowerCase()
  .replace(/`/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

const parseFrontmatter = (raw: string): { data: Record<string, string>; body: string } => {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  const frontmatter = match[1] ?? '';
  for (const line of frontmatter.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value) as string;
      } catch {
        value = value.replace(/^"|"$/g, '');
      }
    }
    data[key] = value;
  }
  return { data, body: raw.slice(match[0].length) };
};

/** Extract h2/h3 headings as TOC anchors ( atx headings only, skip fenced code). */
const extractAnchors = (body: string): { id: string; label: string }[] => {
  const anchors: { id: string; label: string }[] = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.*)$/.exec(line);
    if (m) {
      const label = (m[2] ?? '').replace(/`/g, '').trim();
      anchors.push({ id: slugify(label), label });
    }
  }
  return anchors;
};

const modules = import.meta.glob('../content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const PAGES: readonly DocPage[] = Object.entries(modules)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw);
    return {
      category: data.category ?? 'concepts',
      slug: data.slug ?? 'untitled',
      id: `${data.category ?? 'concepts'}/${data.slug ?? 'untitled'}`,
      path,
      title: data.title ?? data.slug ?? 'Untitled',
      lead: data.lead ?? '',
      order: Number(data.order ?? 0),
      source: data.source && data.source !== 'null'
        ? data.source
        : null,
      editHref: data.editHref && data.editHref !== 'null'
        ? data.editHref
        : null,
      body,
      anchors: extractAnchors(body),
    };
  })
  .sort((a, b) => (CATEGORY_META[a.category]?.order ?? 99) - (CATEGORY_META[b.category]?.order ?? 99) ||
    a.order - b.order ||
    a.slug.localeCompare(b.slug));

/** Sidebar sections grouped by category, in category order. */
export const NAV_SECTIONS: readonly DocsNavSection[] = Object.entries(CATEGORY_META)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([category, meta]) => ({
    section: meta.label,
    items: PAGES.filter((p) => p.category === category).map((p) => ({
      id: p.id,
      label: p.title,
      href: `/${p.id}`,
    })),
  }))
  .filter((s) => s.items.length > 0);

export const pageById = (id: string): DocPage | undefined => PAGES.find((p) => p.id === id);

/** First page in nav order — the docs landing target. */
const firstPage = PAGES[0];
if (!firstPage) {
  throw new Error('No docs content found — run `npm run generate` to build the content tree.');
}
export const FIRST_PAGE: DocPage = firstPage;
