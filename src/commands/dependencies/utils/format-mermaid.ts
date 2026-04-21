/**
 * Mermaid formatter — renders the dependency tree as a left-to-right
 * flowchart diagram in Mermaid markdown syntax.
 */
import type { TreeNode, TreeNodeChild } from './types.js';

/**
 * Sanitize a package name for use as a Mermaid node ID.
 * Each special char maps to a distinct sequence to avoid collisions
 * (e.g. @foo/bar-baz vs @foo/bar_baz must produce different IDs).
 */
function toNodeId(name: string): string {
  return name
    .replace(/@/g, '')
    .replace(/\//g, '__')
    .replace(/\./g, '_dot_');
  // Hyphens and underscores are kept as-is (both are valid Mermaid ID chars)
}

/** Collect all nodes and edges from the tree, deduplicating. */
function collectGraph(
  trees: ReadonlyArray<TreeNode>,
): { nodes: Map<string, { name: string; version: string }>; edges: string[] } {
  const nodes = new Map<string, { name: string; version: string }>();
  const edgeSet = new Set<string>();
  const edges: string[] = [];

  function walk(tree: TreeNode): void {
    const parentId = toNodeId(tree.name);
    if (!nodes.has(parentId)) {
      nodes.set(parentId, { name: tree.name, version: tree.version });
    }

    for (const child of tree.children) {
      const childId = toNodeId(child.edge.name);

      if (!nodes.has(childId)) {
        const childVersion = child.subtree?.version ?? child.edge.version;
        nodes.set(childId, { name: child.edge.name, version: childVersion });
      }

      const edgeKey = `${parentId}-->${childId}:${child.edge.depType}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push(formatEdge(parentId, childId, child));
      }

      if (child.subtree && child.subtree.children.length > 0) {
        walk(child.subtree);
      }
    }
  }

  for (const tree of trees) {
    walk(tree);
  }

  return { nodes, edges };
}

/** Format a single Mermaid edge with appropriate arrow style. */
function formatEdge(parentId: string, childId: string, child: TreeNodeChild): string {
  if (child.edge.isCircular) {
    return `  ${parentId} -->|CIRCULAR| ${childId}`;
  }

  if (child.edge.depType === 'devDependency') {
    return `  ${parentId} -.->|dev| ${childId}`;
  }

  if (child.edge.depType === 'peerDependency') {
    return `  ${parentId} ==>|peer| ${childId}`;
  }

  return `  ${parentId} --> ${childId}`;
}

/** Format multiple dependency trees as Mermaid flowchart output. */
export function formatMermaid(trees: ReadonlyArray<TreeNode>): string {
  const { nodes, edges } = collectGraph(trees);

  const lines: string[] = [
    'flowchart LR',
    '',
  ];

  // Node declarations
  for (const [id, info] of nodes) {
    const label = info.name.replace(/"/g, '#quot;');
    lines.push(`  ${id}["${label}<br/>${info.version}"]`);
  }

  lines.push('');

  // Edge declarations
  lines.push(...edges);

  // Style circular edges red
  const circularNodes = new Set<string>();
  for (const tree of trees) {
    walkForCircular(tree, circularNodes);
  }
  if (circularNodes.size > 0) {
    lines.push('');
    lines.push('  classDef circular stroke:#e74c3c,stroke-width:2px');
    for (const nodeId of circularNodes) {
      lines.push(`  class ${nodeId} circular`);
    }
  }

  return lines.join('\n');
}

/** Walk the tree to find nodes that are targets of circular references. */
function walkForCircular(tree: TreeNode, circularNodes: Set<string>): void {
  for (const child of tree.children) {
    if (child.edge.isCircular) {
      circularNodes.add(toNodeId(child.edge.name));
    }
    if (child.subtree) {
      walkForCircular(child.subtree, circularNodes);
    }
  }
}
