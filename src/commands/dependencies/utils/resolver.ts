/**
 * Tree builder — recursively resolves workspace dependencies
 * with circular dependency detection and depth limiting.
 */
import type { DepEdge, TreeNode, TreeNodeChild, WorkspacePackage } from './types.js';

import fs from 'node:fs';
import path from 'node:path';

interface ResolveContext {
  readonly workspaceMap: ReadonlyMap<string, WorkspacePackage>;
  readonly orgFilter: RegExp | null;
  readonly rootDir: string;
  readonly full: boolean;
}

/** Determine if an edge should be expanded into a subtree. */
function shouldExpand(
  edge: DepEdge,
  ctx: ResolveContext,
): boolean {
  // Always expand workspace dependencies that exist in the map
  if (edge.isWorkspace && ctx.workspaceMap.has(edge.name)) {
    return true;
  }

  // Expand external deps matching the org include filter
  if (!edge.isWorkspace && ctx.orgFilter?.test(edge.name)) {
    return true;
  }

  return false;
}

/**
 * Try to read an external (non-workspace) package from node_modules
 * to get its dependency info for included orgs.
 *
 * Intentionally reads only `dependencies` — devDependencies and peerDependencies
 * are not relevant for installed external packages in the runtime dependency graph.
 */
function readExternalPackage(
  name: string,
  rootDir: string,
): WorkspacePackage | null {
  const pkgJsonPath = path.join(rootDir, 'node_modules', name, 'package.json');
  try {
    const content = fs.readFileSync(pkgJsonPath, 'utf-8');
    const raw = JSON.parse(content) as {
      name?: string;
      version?: string;
      dependencies?: Record<string, string>;
    };

    const deps: DepEdge[] = [];
    if (raw.dependencies) {
      for (const [depName, version] of Object.entries(raw.dependencies)) {
        deps.push({
          name: depName,
          version,
          depType: 'dependency',
          isWorkspace: false,
          isCircular: false,
        });
      }
    }

    return {
      name: raw.name ?? name,
      version: raw.version ?? '0.0.0',
      path: `node_modules/${name}`,
      dependencies: deps,
    };
  } catch {
    return null;
  }
}

/** Resolve a package for expansion — workspace first, then node_modules. */
function resolvePackage(
  edge: DepEdge,
  ctx: ResolveContext,
): WorkspacePackage | null {
  const fromWorkspace = ctx.workspaceMap.get(edge.name);
  if (fromWorkspace) return fromWorkspace;

  return readExternalPackage(edge.name, ctx.rootDir);
}

/** Recursively build a tree node. */
function buildNode(
  pkg: WorkspacePackage,
  remainingDepth: number,
  ancestors: ReadonlySet<string>,
  ctx: ResolveContext,
): TreeNode {
  if (remainingDepth <= 0) {
    return { name: pkg.name, version: pkg.version, path: pkg.path, children: [] };
  }

  const children: TreeNodeChild[] = [];

  for (const edge of pkg.dependencies) {
    // In filtered mode, skip deps that are not workspace or included-org packages
    const isRelevant = edge.isWorkspace || (ctx.orgFilter?.test(edge.name) ?? false);
    if (!isRelevant && !ctx.full) continue;

    // Circular detection: check if this dep is already in the ancestor path
    if (ancestors.has(edge.name)) {
      children.push({
        edge: { ...edge, isCircular: true },
        subtree: null,
      });
      continue;
    }

    if (!shouldExpand(edge, ctx)) {
      children.push({ edge, subtree: null });
      continue;
    }

    const target = resolvePackage(edge, ctx);
    if (!target) {
      children.push({ edge, subtree: null });
      continue;
    }

    const newAncestors = new Set([...ancestors, pkg.name]);
    const subtree = buildNode(target, remainingDepth - 1, newAncestors, ctx);
    children.push({ edge, subtree });
  }

  return {
    name: pkg.name,
    version: pkg.version,
    path: pkg.path,
    children,
  };
}

/**
 * Build dependency trees for a list of project entry points.
 *
 * @param projects     - The workspace packages to use as tree roots
 * @param workspaceMap - All discovered workspace packages
 * @param depth        - Maximum depth to resolve
 * @param orgFilter    - Optional regex to include external org packages
 * @param rootDir      - Monorepo root directory
 * @param full         - When true, show all deps; when false, only workspace + included orgs
 */
export function buildTrees(
  projects: ReadonlyArray<WorkspacePackage>,
  workspaceMap: ReadonlyMap<string, WorkspacePackage>,
  depth: number,
  orgFilter: RegExp | null,
  rootDir: string,
  full: boolean,
): TreeNode[] {
  const ctx: ResolveContext = { workspaceMap, orgFilter, rootDir, full };

  return projects.map((project) => buildNode(project, depth, new Set<string>([project.name]), ctx));
}
