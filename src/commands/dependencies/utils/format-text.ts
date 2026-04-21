/**
 * ASCII tree formatter — renders the dependency tree in a human-readable
 * text format using box-drawing characters.
 */
import type { TreeNode, TreeNodeChild } from './types.js';

/** Build the attribute tag shown after the version (e.g. "[devDependency, CIRCULAR]"). */
function formatAttributes(child: TreeNodeChild): string {
  const parts: string[] = [child.edge.depType];

  if (child.edge.isCircular) parts.push('CIRCULAR');
  if (!child.edge.isWorkspace) parts.push('external');

  return `[${parts.join(', ')}]`;
}

/** Recursively render a tree node's children as indented text lines. */
function renderChildren(
  children: ReadonlyArray<TreeNodeChild>,
  prefix: string,
  lines: string[],
): void {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child) continue;
    const isLast = i === children.length - 1;
    const connector = isLast
      ? '└── '
      : '├── ';
    const childPrefix = isLast
      ? '    '
      : '│   ';

    const attrs = formatAttributes(child);
    lines.push(`${prefix}${connector}${child.edge.name}@${child.edge.version} ${attrs}`);

    if (child.subtree && child.subtree.children.length > 0) {
      renderChildren(child.subtree.children, `${prefix}${childPrefix}`, lines);
    }
  }
}

/** Format a single tree node as text. */
function renderTree(tree: TreeNode): string {
  const lines: string[] = [`${tree.name}@${tree.version} (${tree.path})`];
  renderChildren(tree.children, '', lines);
  return lines.join('\n');
}

/** Format multiple dependency trees as text output. */
export function formatText(trees: ReadonlyArray<TreeNode>): string {
  return trees.map(renderTree).join('\n\n');
}
