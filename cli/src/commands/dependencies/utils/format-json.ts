/**
 * JSON formatter — serializes the dependency tree into a structured
 * JSON format for programmatic consumption.
 */
import type { TreeNode, TreeNodeChild } from './types.js';

interface JsonDep {
  readonly name: string;
  readonly version: string;
  readonly type: string;
  readonly isWorkspace: boolean;
  readonly isCircular: boolean;
  readonly dependencies: readonly JsonDep[];
}

interface JsonTree {
  readonly name: string;
  readonly version: string;
  readonly path: string;
  readonly dependencies: readonly JsonDep[];
}

/** Convert a tree node child into the JSON output shape. */
function serializeChild(child: TreeNodeChild): JsonDep {
  return {
    name: child.edge.name,
    version: child.edge.version,
    type: child.edge.depType,
    isWorkspace: child.edge.isWorkspace,
    isCircular: child.edge.isCircular,
    dependencies: child.subtree
      ? child.subtree.children.map(serializeChild)
      : [],
  };
}

/** Convert a tree node into the JSON output shape. */
function serializeTree(tree: TreeNode): JsonTree {
  return {
    name: tree.name,
    version: tree.version,
    path: tree.path,
    dependencies: tree.children.map(serializeChild),
  };
}

/** Format multiple dependency trees as JSON output. */
export function formatJson(trees: ReadonlyArray<TreeNode>): string {
  const first = trees[0];
  const output = trees.length === 1 && first
    ? serializeTree(first)
    : trees.map(serializeTree);

  return JSON.stringify(output, null, 2);
}
