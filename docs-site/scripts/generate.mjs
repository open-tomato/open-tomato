// Docs-site content generator (WS11 milestone 1 + 3).
//
// Idempotent: aggregates a *curated allowlist* of real repo sources into a
// normalized `content/` tree, and materializes the hand-authored index/example
// pages that have no repo source. Two consecutive runs produce byte-identical
// output (no timestamps, stable ordering), so `git diff` after `npm run
// generate` is the regeneration-idempotency check.
//
// Category taxonomy (per docs/plans/poc-release/11-docs-site.md):
//   - concepts     intro, install, config, contributing
//   - api          front-facing non-contract services (Notifications, Agents)
//   - examples     hand-authored medium→advanced walkthroughs
//
// The app reads the generated `content/**/*.md` at build time (see src/content.ts).

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(SITE_DIR, '..');
const CONTENT_DIR = join(SITE_DIR, 'content');
const GITHUB_BLOB = 'https://github.com/open-tomato/open-tomato/blob/main';

/** Aggregated pages — copied + normalized from a real repo source. */
const AGGREGATED = [
  { category: 'concepts', slug: 'introduction', order: 1, title: 'Introduction', source: 'README.md' },
  { category: 'concepts', slug: 'contributing', order: 4, title: 'Contributing', source: 'CONTRIBUTING.md' },
  { category: 'api', slug: 'notifications', order: 1, title: 'Notifications', source: 'services/notifications/README.md' },
  { category: 'api', slug: 'agents-config', order: 2, title: 'Agents Config', source: 'packages/agents/config/README.md' },
];

/** Hand-authored pages — structure/onboarding content with no repo source. */
const AUTHORED = [
  {
    category: 'concepts',
    slug: 'installation',
    order: 2,
    title: 'Installation',
    lead: 'Get the Open Tomato CLI and workspace set up in a couple of minutes.',
    body: `## Prerequisites

Open Tomato targets **Bun 1.3+** and **Node 22**. The CLI is published to the
Open Tomato registry as \`@open-tomato/cli\`.

## Install the CLI

\`\`\`bash
npm install -g @open-tomato/cli
\`\`\`

Verify the install:

\`\`\`bash
tomato --version
\`\`\`

## Seed a workspace

\`\`\`bash
tomato init
\`\`\`

This writes an \`open-tomato.config.json\` to the current directory. See
[Configuration](/concepts/configuration) for what goes in it.
`,
  },
  {
    category: 'concepts',
    slug: 'configuration',
    order: 3,
    title: 'Configuration',
    lead: 'How the CLI and services read their settings.',
    body: `## The config file

\`tomato init\` creates \`open-tomato.config.json\`. It declares the models
available to a run, default budgets, and which providers are enabled.

\`\`\`json
{
  "defaultModel": "sonnet",
  "budget": "50k",
  "providers": ["anthropic"]
}
\`\`\`

## Environment overrides

Every service reads inline \`process.env\` at startup — there is no central
config service in the PoC. Secrets (API keys, database URLs) are supplied via
the environment, never committed. Services validate required variables on boot
and fail fast when one is missing.

## Related

- [Introduction](/concepts/introduction) — the overall stack.
- [Notifications](/api/notifications) — the event fan-out service.
`,
  },
  {
    category: 'examples',
    slug: 'first-agent-run',
    order: 1,
    title: 'Your first agent run',
    lead: 'Seed a run from the terminal and watch it work end to end.',
    body: `## Goal

Point an agent at a small, well-scoped task and review its diff before merging.

## Steps

\`\`\`bash
# 1. seed a run from a plain-language goal
tomato run "add a settings page" --budget 50k

# 2. follow it live in the dashboard, or stream logs in the shell
tomato logs --follow
\`\`\`

The run appears in the dashboard under **Sessions**. When it finishes, open
the session to see the files it changed.

## Reviewing the result

Every run produces a diff. Merge it with confidence, or kick it back for
another pass with more context. Nothing lands without your review.

> Runs are cheap to throw away. Seed a few in parallel and keep the one that
> lands closest to what you wanted.
`,
  },
  {
    category: 'examples',
    slug: 'roadmap-driven-runs',
    order: 2,
    title: 'Roadmap-driven runs',
    lead: 'Keep your work in one list and seed agents straight from it.',
    body: `## The idea

Keep tasks in the **Roadmap**. Seed an agent from any task, watch the diff,
and merge — the task closes itself when the work lands.

## Seeding from a task

\`\`\`bash
tomato run --from-task OPT-123
\`\`\`

The agent inherits the task's title and description as its goal, and the run
is linked back to the task so the roadmap stays in sync.

## Fan-out

Because runs are isolated, you can seed several roadmap tasks at once and
review them as they finish — no waiting for one to complete before starting
the next.
`,
  },
];

/** Strip a leading H1 (DocsLayout renders the title itself) and pull the first
 *  paragraph as the lead. Returns { lead, body }. Pure + deterministic. */
function splitSource(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^#\s/.test(lines[i])) i++; // drop leading H1
  while (i < lines.length && lines[i].trim() === '') i++;
  const leadLines = [];
  while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('---')) {
    leadLines.push(lines[i]);
    i++;
  }
  const lead = leadLines.join(' ').trim();
  const body = lines.slice(i).join('\n').trim();
  return { lead, body };
}

/** Serialize a page to markdown with a normalized frontmatter block. */
function serialize({ title, category, slug, order, lead, body, source }) {
  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `category: ${category}`,
    `slug: ${slug}`,
    `order: ${order}`,
    `lead: ${JSON.stringify(lead)}`,
    source ? `source: ${source}` : `source: null`,
    source ? `editHref: ${GITHUB_BLOB}/${source}` : 'editHref: null',
    '---',
    '',
    body,
    '',
  ];
  return fm.join('\n');
}

function main() {
  // Clean rebuild so removed sources don't leave stale files (idempotent).
  rmSync(CONTENT_DIR, { recursive: true, force: true });

  const pages = [];

  for (const entry of AGGREGATED) {
    const raw = readFileSync(join(REPO_ROOT, entry.source), 'utf8');
    const { lead, body } = splitSource(raw);
    pages.push({ ...entry, lead, body });
  }
  for (const entry of AUTHORED) {
    pages.push({ ...entry, source: null });
  }

  // Stable ordering: category, then order, then slug.
  pages.sort((a, b) =>
    a.category.localeCompare(b.category) || a.order - b.order || a.slug.localeCompare(b.slug));

  for (const page of pages) {
    const dir = join(CONTENT_DIR, page.category);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${page.slug}.md`), serialize(page), 'utf8');
  }

  const byCat = pages.reduce((acc, p) => ((acc[p.category] = (acc[p.category] ?? 0) + 1), acc), {});
  const summary = Object.entries(byCat).map(([c, n]) => `${c}: ${n}`).join(', ');
  process.stdout.write(`[docs generate] wrote ${pages.length} pages (${summary})\n`);
}

main();
