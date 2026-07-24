// Docs-site internal link checker (WS11 verification).
//
// Scans the generated content tree for internal doc links (`](/category/slug)`)
// and asserts each resolves to a generated page. Exits non-zero on any broken
// link so it can gate CI / the WS12 build. External links (http, mailto) and
// pure `#anchor` links are out of scope.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(SCRIPT_DIR, '..', 'content');

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const files = walk(CONTENT_DIR).filter((f) => f.endsWith('.md'));

/** Set of valid route ids — `category/slug` derived from the file tree. */
const routes = new Set(
  files.map((f) => {
    const rel = f.slice(CONTENT_DIR.length + 1).replace(/\.md$/, '');
    return rel;
  }),
);

const LINK_RE = /\]\((\/[^)\s]+)\)/g;
const broken = [];

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  let m;
  while ((m = LINK_RE.exec(raw)) !== null) {
    const target = m[1].split('#')[0].replace(/^\/|\/$/g, '');
    if (target === '') continue; // link to site root
    if (!routes.has(target)) {
      broken.push({ file: file.slice(CONTENT_DIR.length + 1), link: m[1] });
    }
  }
}

if (broken.length > 0) {
  process.stderr.write(`[check-links] ${broken.length} broken internal link(s):\n`);
  for (const b of broken) process.stderr.write(`  ${b.file} → ${b.link}\n`);
  process.exit(1);
}

process.stdout.write(`[check-links] OK — all internal doc links resolve (${routes.size} routes).\n`);
