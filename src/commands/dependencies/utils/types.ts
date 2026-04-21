/** Dependency relationship type. */
export type DepType = 'dependency' | 'devDependency' | 'peerDependency';

/** Supported output formats. */
export type OutputFormat = 'text' | 'json' | 'dot' | 'mermaid';

/** Valid output format values for validation. */
export const OUTPUT_FORMATS: readonly OutputFormat[] = ['text', 'json', 'dot', 'mermaid'] as const;

/** Maximum tree depth to prevent runaway recursion. */
export const MAX_DEPTH = 7;

/** Default depth when showing all projects (no --project flag). */
export const DEFAULT_DEPTH_ALL = 1;

/** Default depth when showing a single project (--project flag). */
export const DEFAULT_DEPTH_SINGLE = MAX_DEPTH;

/** A single dependency edge in the tree. */
export interface DepEdge {
  readonly name: string;
  readonly version: string;
  readonly depType: DepType;
  readonly isWorkspace: boolean;
  readonly isCircular: boolean;
}

/** A child node in the tree: an edge plus an optional expanded subtree. */
export interface TreeNodeChild {
  readonly edge: DepEdge;
  readonly subtree: TreeNode | null;
}

/** A node in the dependency tree. */
export interface TreeNode {
  readonly name: string;
  readonly version: string;
  readonly path: string;
  readonly children: ReadonlyArray<TreeNodeChild>;
}

/** Parsed info from a workspace package.json. */
export interface WorkspacePackage {
  readonly name: string;
  readonly version: string;
  readonly path: string;
  readonly dependencies: ReadonlyArray<DepEdge>;
}

/** CLI options parsed from argv. */
export interface TreeOptions {
  readonly project: string | undefined;
  readonly depth: number;
  readonly includeOrgs: ReadonlyArray<string>;
  readonly output: OutputFormat;
}

/** Formatter function signature. */
export type TreeFormatter = (trees: ReadonlyArray<TreeNode>) => string;
