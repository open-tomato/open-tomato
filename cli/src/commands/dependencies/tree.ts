#!/usr/bin/env bun
/**
 * tomato dependencies tree
 *
 * Displays the internal dependency tree for workspace projects.
 *
 * Usage:
 *   tomato dependencies tree [options]
 *
 * Options:
 *   -p, --project <name>   Restrict to a single project (by name or path)
 *   -d, --depth <N>        Tree depth (default: 1 for all, 7 for single project)
 *   -i, --include <orgs>   Comma-separated org scopes to include (@ optional)
 *   -o, --output <format>  Output format: text | json | dot | mermaid (default: text)
 *   -h, --help             Show this help message
 */
import type {
  OutputFormat,
  TreeFormatter,
} from './utils/types.js';

import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { getBoolFlag, getStringFlag, parseArgs, usageError } from './utils/args.js';
import { formatDot } from './utils/format-dot.js';
import { formatJson } from './utils/format-json.js';
import { formatMermaid } from './utils/format-mermaid.js';
import { formatText } from './utils/format-text.js';
import { buildTrees } from './utils/resolver.js';
import {
  WorkspacePackage,
  DEFAULT_DEPTH_ALL,
  DEFAULT_DEPTH_SINGLE,
  MAX_DEPTH,
  OUTPUT_FORMATS,

} from './utils/types.js';
import { buildOrgFilter, discoverWorkspaces, getProjects } from './utils/workspace.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const HELP = `
Usage: tomato dependencies tree [options]

Displays the internal dependency tree for workspace projects.
By default only workspace and included-org dependencies are shown.

Options:
  -p, --project <name>   Restrict to a single project (by package name or path)
  -d, --depth <N>        Tree depth limit
                           - No flag: 1 (all projects) or 7 (single project)
                           - Bare --depth: full tree (max ${MAX_DEPTH})
                           - --depth=N: exactly N levels (max ${MAX_DEPTH})
  -f, --full             Show all dependencies including external packages.
                         Without this flag, only workspace and --include org deps are listed.
  -i, --include <orgs>   Comma-separated org scopes to also include in the tree.
                         The @ prefix is optional (e.g. --include=open-tomato,linear)
  -o, --output <format>  Output format: text (default), json, dot, mermaid
  -h, --help             Show this help message

Examples:
  tomato dependencies tree
  tomato dependencies tree -p @open-tomato/executor
  tomato dependencies tree -p executor --full
  tomato dependencies tree -d 3 -o json
  tomato dependencies tree --project executor --depth 2 --output mermaid
  tomato dependencies tree --include=open-tomato,tanstack
`;

const FORMATTERS: Record<OutputFormat, TreeFormatter> = {
  text: formatText,
  json: formatJson,
  dot: formatDot,
  mermaid: formatMermaid,
};

/**
 * Resolve the depth flag, handling three states:
 * - absent → default (depends on hasProject)
 * - bare (--depth with no value) → MAX_DEPTH
 * - explicit value → parsed number (capped at MAX_DEPTH)
 */
function resolveDepth(
  flags: Record<string, string | boolean>,
  hasProject: boolean,
): number {
  const raw = flags['depth'] ?? flags['d'];

  // Flag not present at all → use context-dependent default
  if (raw === undefined) {
    return hasProject
      ? DEFAULT_DEPTH_SINGLE
      : DEFAULT_DEPTH_ALL;
  }

  // Bare flag (--depth with no value) → full tree
  if (raw === true) return MAX_DEPTH;

  // String value → parse as integer
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) {
      usageError(`--depth must be a non-negative integer, got "${raw}"`, HELP);
    }
    return Math.min(n, MAX_DEPTH);
  }

  return hasProject
    ? DEFAULT_DEPTH_SINGLE
    : DEFAULT_DEPTH_ALL;
}

/** Parse the --include flag into an array of normalized org prefixes. */
function parseIncludeOrgs(raw: string | undefined): string[] {
  if (!raw) return [];

  return raw
    .split(',')
    .map((org) => org.trim())
    .filter((org) => org.length > 0)
    .map((org) => org.replace(/^@/, ''));
}

/** Validate the output format flag. */
function resolveOutputFormat(raw: string | undefined): OutputFormat {
  if (!raw) return 'text';

  if (!(OUTPUT_FORMATS as readonly string[]).includes(raw)) {
    usageError(
      `Unknown output format "${raw}". Valid formats: ${OUTPUT_FORMATS.join(', ')}`,
      HELP,
    );
  }

  return raw as OutputFormat;
}

export default async function tree(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);

  if (getBoolFlag(flags, 'h', 'help')) {
    console.log(HELP);
    return;
  }

  const project = getStringFlag(flags, 'project', 'p');
  const depth = resolveDepth(flags, project !== undefined);
  const full = getBoolFlag(flags, 'full', 'f');
  const includeOrgs = parseIncludeOrgs(getStringFlag(flags, 'include', 'i'));
  const output = resolveOutputFormat(getStringFlag(flags, 'output', 'o'));

  // Discover all workspace packages
  let workspaceMap: ReadonlyMap<string, WorkspacePackage>;
  try {
    workspaceMap = discoverWorkspaces(ROOT);
  } catch (err: unknown) {
    const message = err instanceof Error
      ? err.message
      : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }

  if (workspaceMap.size === 0) {
    console.error('No workspace packages found.');
    process.exit(1);
  }

  // Filter to target projects
  let projects: WorkspacePackage[];
  try {
    projects = getProjects(workspaceMap, project);
  } catch (err: unknown) {
    const message = err instanceof Error
      ? err.message
      : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }

  if (projects.length === 0) {
    console.error('No projects found matching the criteria.');
    process.exit(1);
  }

  // Build dependency trees
  const orgFilter = buildOrgFilter(includeOrgs);
  const trees = buildTrees(projects, workspaceMap, depth, orgFilter, ROOT, full);

  // Format and output
  const formatter = FORMATTERS[output];
  const result = formatter(trees);
  console.log(result);
}
