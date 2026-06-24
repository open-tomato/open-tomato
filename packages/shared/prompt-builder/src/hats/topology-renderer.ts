import type { HatDefinition, HatTopology } from '../types/index.js';

/**
 * Result returned by {@link HatTopologyRenderer.validateReachability}.
 */
export interface ValidationResult {
  /** `true` when all active hats can reach at least one other hat or terminal. */
  valid: boolean;

  /** Hat ids that are active but isolated (no incoming or outgoing connections). */
  isolatedHatIds: string[];
}

/**
 * Standalone renderer for hat topology information.
 *
 * Produces Markdown tables, data-flow descriptions, and reachability
 * validation results from {@link HatDefinition} and {@link HatTopology} data.
 * This class has no dependency on `PromptContext` and can be used independently
 * of the prompt assembly pipeline.
 *
 * @example
 * ```typescript
 * const renderer = new HatTopologyRenderer();
 * const table = renderer.renderTable(hats);
 * const flow = renderer.renderDataFlowDescription(topology);
 * const result = renderer.validateReachability(topology, ['planner', 'executor']);
 * const active = renderer.filterInstructions(hats, ['planner']);
 * ```
 */
export class HatTopologyRenderer {
  /**
   * Renders a Markdown table listing every hat in the topology with columns:
   * Hat ID, Role, Publishes, and Subscribes.
   *
   * @param hats - All hat definitions to include in the table.
   * @returns A Markdown table string.
   */
  renderTable(hats: HatDefinition[]): string {
    const header = '| Hat ID | Role | Publishes | Subscribes |';
    const divider = '| --- | --- | --- | --- |';

    const rows = hats.map((hat) => {
      const publishes =
        hat.publishTopics.length > 0
          ? hat.publishTopics.join(', ')
          : '—';
      const subscribes =
        hat.subscribeTopics.length > 0
          ? hat.subscribeTopics.join(', ')
          : '—';
      return `| ${hat.id} | ${hat.role} | ${publishes} | ${subscribes} |`;
    });

    return [header, divider, ...rows].join('\n');
  }

  /**
   * Renders a textual summary of data flow between hats based on matching
   * publish/subscribe topic pairs. Self-loops (a hat publishing a topic it
   * also subscribes to) are excluded.
   *
   * @param topology - The full hat graph including hats and edges.
   * @returns A Markdown-formatted data-flow description block.
   */
  renderDataFlowDescription(topology: HatTopology): string {
    const subscribeIndex = buildSubscribeIndex(topology.hats);
    const flowLines: string[] = [];

    for (const publisher of topology.hats) {
      for (const topic of publisher.publishTopics) {
        const subscribers = subscribeIndex.get(topic) ?? [];
        for (const subscriber of subscribers) {
          if (subscriber !== publisher.id) {
            flowLines.push(
              `- \`${publisher.id}\` publishes \`${topic}\` → consumed by \`${subscriber}\``,
            );
          }
        }
      }
    }

    if (flowLines.length === 0) {
      return '**Data flow:** No topic connections defined between hats.';
    }

    return `**Data flow:**\n\n${flowLines.join('\n')}`;
  }

  /**
   * Validates that all active hats can reach at least one other hat (via a
   * published topic that another hat subscribes to) or receive from at least
   * one other hat. A hat that has no incoming or outgoing connections to any
   * other hat is flagged as isolated.
   *
   * When `activeHatIds` contains one or fewer entries the result is always
   * `{ valid: true, isolatedHatIds: [] }` because a solo hat cannot be
   * isolated in the multi-hat sense.
   *
   * @param topology - The full hat graph.
   * @param activeHatIds - Ids of the hats currently active in the session.
   * @returns A {@link ValidationResult} describing reachability status.
   */
  validateReachability(
    topology: HatTopology,
    activeHatIds: string[],
  ): ValidationResult {
    if (activeHatIds.length <= 1) {
      return { valid: true, isolatedHatIds: [] };
    }

    const activeSet = new Set(activeHatIds);
    const subscribeIndex = buildSubscribeIndex(topology.hats);

    const publishedTopics = new Set<string>();
    for (const hat of topology.hats) {
      for (const topic of hat.publishTopics) {
        publishedTopics.add(topic);
      }
    }

    const isolatedHatIds: string[] = [];

    for (const hat of topology.hats) {
      if (!activeSet.has(hat.id)) {
        continue;
      }

      const canPublishToOther = hat.publishTopics.some((topic) => {
        const subscribers = subscribeIndex.get(topic) ?? [];
        return subscribers.some((id) => id !== hat.id);
      });

      const canReceiveFromOther = hat.subscribeTopics.some((topic) => publishedTopics.has(topic));

      if (!canPublishToOther && !canReceiveFromOther) {
        isolatedHatIds.push(hat.id);
      }
    }

    return {
      valid: isolatedHatIds.length === 0,
      isolatedHatIds,
    };
  }

  /**
   * Returns only the hat definitions whose id appears in `activeHatIds`,
   * preserving the original order from `hats`.
   *
   * @param hats - All hat definitions.
   * @param activeHatIds - Ids of the hats to include.
   * @returns Filtered array of hat definitions.
   */
  filterInstructions(
    hats: HatDefinition[],
    activeHatIds: string[],
  ): HatDefinition[] {
    const activeSet = new Set(activeHatIds);
    return hats.filter((hat) => activeSet.has(hat.id));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a map from topic name to the list of hat ids that subscribe to it.
 */
function buildSubscribeIndex(hats: HatDefinition[]): Map<string, string[]> {
  const index = new Map<string, string[]>();

  for (const hat of hats) {
    for (const topic of hat.subscribeTopics) {
      const existing = index.get(topic);
      if (existing !== undefined) {
        existing.push(hat.id);
      } else {
        index.set(topic, [hat.id]);
      }
    }
  }

  return index;
}
