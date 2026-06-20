export function normalizePriority(priority: number): number {
  return priority === 0
    ? 5
    : priority;
}

export async function collectAllNodes<T extends { id: string }>(
  connectionPromise: Promise<{
    nodes: T[];
    pageInfo: { hasNextPage: boolean };
    fetchNext(): Promise<unknown>;
  }>,
): Promise<T[]> {
  const connection = await connectionPromise;

  while (connection.pageInfo.hasNextPage) {
    await connection.fetchNext();
  }

  return connection.nodes;
}

export function relationTypeToEdge(
  type: string,
  sourceId: string | undefined,
  targetId: string | undefined,
): [string, string] | null {
  if (!sourceId || !targetId) {
    return null;
  }

  const normalizedType = type.toLowerCase();
  if (!normalizedType.includes('block')) {
    return null;
  }

  if (normalizedType.includes('blocked')) {
    return [targetId, sourceId];
  }

  return [sourceId, targetId];
}

export function topologicalSort<T>(
  items: T[],
  getId: (item: T) => string,
  edges: Array<[string, string]>,
  compare: (a: T, b: T) => number,
): T[] {
  const byId = new Map(items.map((item) => [getId(item), item]));
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();

  for (const item of items) {
    const id = getId(item);
    indegree.set(id, 0);
    adjacency.set(id, new Set());
  }

  for (const [blockerId, blockedId] of edges) {
    if (blockerId === blockedId || !byId.has(blockerId) || !byId.has(blockedId)) {
      continue;
    }

    const neighbors = adjacency.get(blockerId);
    if (!neighbors || neighbors.has(blockedId)) {
      continue;
    }

    neighbors.add(blockedId);
    indegree.set(blockedId, (indegree.get(blockedId) ?? 0) + 1);
  }

  const ready = items
    .filter((item) => (indegree.get(getId(item)) ?? 0) === 0)
    .sort(compare);
  const ordered: T[] = [];
  const seen = new Set<string>();

  while (ready.length > 0) {
    const current = ready.shift();
    if (!current) {
      break;
    }

    const currentId = getId(current);
    if (seen.has(currentId)) {
      continue;
    }

    seen.add(currentId);
    ordered.push(current);

    for (const neighborId of adjacency.get(currentId) ?? []) {
      indegree.set(neighborId, (indegree.get(neighborId) ?? 0) - 1);
      if ((indegree.get(neighborId) ?? 0) === 0) {
        const neighbor = byId.get(neighborId);
        if (neighbor && !seen.has(neighborId)) {
          ready.push(neighbor);
          ready.sort(compare);
        }
      }
    }
  }

  if (ordered.length === items.length) {
    return ordered;
  }

  const remaining = items
    .filter((item) => !seen.has(getId(item)))
    .sort(compare);

  return [...ordered, ...remaining];
}

export function summarizeDependencies<T extends { id: string }>(
  items: T[],
  edges: Array<[string, string]>,
): Map<string, { blockedByIds: string[]; blockingIds: string[] }> {
  const itemIds = new Set(items.map((item) => item.id));
  const summary = new Map<string, { blockedByIds: string[]; blockingIds: string[] }>();

  for (const item of items) {
    summary.set(item.id, { blockedByIds: [], blockingIds: [] });
  }

  for (const [blockerId, blockedId] of edges) {
    if (!itemIds.has(blockerId) || !itemIds.has(blockedId) || blockerId === blockedId) {
      continue;
    }

    const blocker = summary.get(blockerId);
    const blocked = summary.get(blockedId);

    if (!blocker || !blocked) {
      continue;
    }

    if (!blocker.blockingIds.includes(blockedId)) {
      blocker.blockingIds.push(blockedId);
    }

    if (!blocked.blockedByIds.includes(blockerId)) {
      blocked.blockedByIds.push(blockerId);
    }
  }

  return summary;
}
