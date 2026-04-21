/**
 * Graphviz DOT formatter — renders the dependency tree as a directed graph
 * in DOT language for visualization with Graphviz tools.
 */
import type { TreeNode, TreeNodeChild } from './types.js';

/** Use the package name directly as a DOT node ID (always quoted, so any string is valid). */
function toNodeId(name: string): string {
  return name;
}

/** Escape a string for use inside DOT double quotes. */
function escapeLabel(str: string): string {
  return str.replace(/"/g, '\\"');
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

      const edgeKey = `${parentId}->${childId}:${child.edge.depType}`;
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

/** Format a single DOT edge with style attributes. */
function formatEdge(parentId: string, childId: string, child: TreeNodeChild): string {
  const attrs: string[] = [];

  if (child.edge.isCircular) {
    attrs.push('color=red', 'style=bold', 'label="CIRCULAR"');
  } else if (child.edge.depType === 'devDependency') {
    attrs.push('style=dashed', 'label="dev"');
  } else if (child.edge.depType === 'peerDependency') {
    attrs.push('style=dotted', 'label="peer"');
  }

  const attrStr = attrs.length > 0
    ? ` [${attrs.join(', ')}]`
    : '';
  return `  "${parentId}" -> "${childId}"${attrStr};`;
}

/** Format multiple dependency trees as DOT output. */
export function formatDot(trees: ReadonlyArray<TreeNode>): string {
  const { nodes, edges } = collectGraph(trees);

  const lines: string[] = [
    'digraph dependencies {',
    '  rankdir=LR;',
    '  node [shape=box, fontname="Helvetica", fontsize=10];',
    '  edge [fontname="Helvetica", fontsize=8];',
    '',
  ];

  for (const [id, info] of nodes) {
    const label = escapeLabel(`${info.name}\\n${info.version}`);
    lines.push(`  "${id}" [label="${label}"];`);
  }

  lines.push('');
  lines.push(...edges);
  lines.push('}');

  return lines.join('\n');
}
