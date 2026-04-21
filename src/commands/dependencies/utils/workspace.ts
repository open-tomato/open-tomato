/**
 * Workspace discovery — reads workspace package.json files to build
 * the dependency graph for the monorepo.
 */
import type { DepEdge, DepType, WorkspacePackage } from './types.js';

import fs from 'node:fs';
import path from 'node:path';

/** Workspace directories that contain "projects". */
const PROJECT_DIRS = ['apps', 'services', 'scripts', 'packages'] as const;

interface RawPackageJson {
  name?: string;
  version?: string;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/** Read and parse a package.json file. Returns null if it doesn't exist or is invalid. */
function readPackageJson(filePath: string): RawPackageJson | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as RawPackageJson;
  } catch {
    return null;
  }
}

/** Extract dependency edges from a raw package.json. */
function extractDeps(raw: RawPackageJson): ReadonlyArray<DepEdge> {
  const edges: DepEdge[] = [];

  const sections: ReadonlyArray<[Record<string, string> | undefined, DepType]> = [
    [raw.dependencies, 'dependency'],
    [raw.devDependencies, 'devDependency'],
    [raw.peerDependencies, 'peerDependency'],
  ];

  for (const [deps, depType] of sections) {
    if (!deps) continue;
    for (const [name, version] of Object.entries(deps)) {
      edges.push({
        name,
        version,
        depType,
        isWorkspace: version.startsWith('workspace:'),
        isCircular: false,
      });
    }
  }

  return edges;
}

/** List immediate subdirectories (non-symlink) of a directory. */
function listSubdirectories(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * Discover all workspace packages by reading package.json files
 * from workspace directories defined in the root package.json.
 *
 * Returns a Map keyed by package name → WorkspacePackage.
 */
export function discoverWorkspaces(rootDir: string): ReadonlyMap<string, WorkspacePackage> {
  const rootPkg = readPackageJson(path.join(rootDir, 'package.json'));
  if (!rootPkg) {
    throw new Error(`Could not read root package.json at ${rootDir}`);
  }

  const workspaceGlobs = rootPkg.workspaces ?? [];

  const workspaceMap = new Map<string, WorkspacePackage>();

  // Expand workspace globs (e.g. "apps/*" → scan apps/ subdirectories)
  for (const glob of workspaceGlobs) {
    const baseDir = glob.replace('/*', '');
    const fullBaseDir = path.join(rootDir, baseDir);
    const subdirs = listSubdirectories(fullBaseDir);

    for (const subdir of subdirs) {
      const pkgPath = path.join(fullBaseDir, subdir, 'package.json');
      const raw = readPackageJson(pkgPath);
      if (!raw?.name) continue;

      const relativePath = `${baseDir}/${subdir}`;
      const pkg: WorkspacePackage = {
        name: raw.name,
        version: raw.version ?? '0.0.0',
        path: relativePath,
        dependencies: extractDeps(raw),
      };

      workspaceMap.set(raw.name, pkg);
    }
  }

  return workspaceMap;
}

/**
 * Get "project" packages — those in apps/, services/, scripts/, packages/.
 * Optionally filtered to a single project by name or directory.
 */
export function getProjects(
  workspaceMap: ReadonlyMap<string, WorkspacePackage>,
  projectFilter?: string,
): WorkspacePackage[] {
  const all = [...workspaceMap.values()].filter((pkg) => {
    const category = pkg.path.split('/')[0];
    return (PROJECT_DIRS as readonly string[]).includes(category ?? '');
  });

  if (!projectFilter) return all;

  // Match by exact package name or by directory path segment
  const normalized = projectFilter.trim();
  const match = all.find(
    (pkg) => pkg.name === normalized ||
      pkg.path === normalized ||
      pkg.path.endsWith(`/${normalized}`),
  );

  if (!match) {
    const available = all.map((p) => `  ${p.name} (${p.path})`).join('\n');
    throw new Error(
      `Project "${projectFilter}" not found.\n\nAvailable projects:\n${available}`,
    );
  }

  return [match];
}

/**
 * Build a regex that matches package names belonging to the given org scopes.
 * Returns null if no orgs are specified.
 */
export function buildOrgFilter(includeOrgs: ReadonlyArray<string>): RegExp | null {
  if (includeOrgs.length === 0) return null;

  // Normalize: strip leading @ if present
  const normalized = includeOrgs.map((org) => org.replace(/^@/, ''));
  const pattern = `^@(${normalized.join('|')})/`;
  return new RegExp(pattern);
}
