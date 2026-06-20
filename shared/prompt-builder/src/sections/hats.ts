import type { HatDefinition, PromptContext, PromptSection } from '../types/index.js';

/**
 * Section 8 — Hats.
 *
 * Renders three blocks:
 *
 * 1. **Topology table** — Markdown table with columns Hat ID, Role, Publishes,
 *    and Subscribes listing every hat in the topology.
 * 2. **Data-flow description** — A textual summary of how information flows
 *    between hats based on matching publish/subscribe topic pairs.
 * 3. **Hat instructions** — Full instruction blocks for each hat whose id
 *    appears in {@link PromptContext.activeHatIds}.  Inactive hats are silently
 *    excluded.
 *
 * If `context.hats` is empty the section returns an empty string so the block
 * is omitted from the assembled prompt.
 *
 * **Reachability validation** — When a hat is active but has no publish topics
 * that any other hat subscribes to (and no other hat publishes to it), a
 * `> ⚠ ISOLATED` warning is appended to its row in the topology table so the
 * operator can spot misconfigured topologies at a glance.
 *
 * @example
 * ```typescript
 * const section = new HatsSection();
 * const output = section.render(context);
 * // ## HATS
 * //
 * // | Hat ID | Role | Publishes | Subscribes |
 * // | --- | --- | --- | --- |
 * // | planner | Plans tasks | task.created | goal.received |
 * // ...
 * ```
 */
export class HatsSection implements PromptSection {
  readonly name = 'hats';

  /**
   * Renders the hats block given the current prompt context.
   *
   * @param context - The current prompt assembly context.
   * @returns The rendered hats block, or an empty string when `hats` is empty.
   */
  render(context: PromptContext): string {
    if (context.hats.length === 0) {
      return '';
    }

    const activeSet = new Set(context.activeHatIds);
    const isolatedIds = findIsolatedHats(context.hats, activeSet);

    const parts: string[] = [
      '## HATS',
      '',
      renderTopologyTable(context.hats, isolatedIds),
      '',
      renderDataFlowDescription(context.hats),
    ];

    const activeHats = context.hats.filter((h) => activeSet.has(h.id));

    if (activeHats.length > 0) {
      parts.push('', renderHatInstructions(activeHats));
    }

    return parts.join('\n');
  }
}

// ─── Topology table ───────────────────────────────────────────────────────────

/**
 * Builds the Markdown topology table.
 *
 * @param hats - All hat definitions in the topology.
 * @param isolatedIds - Set of hat ids flagged as isolated (active but
 *   unreachable).
 * @returns The Markdown table string.
 */
function renderTopologyTable(hats: HatDefinition[], isolatedIds: Set<string>): string {
  const header = '| Hat ID | Role | Publishes | Subscribes |';
  const divider = '| --- | --- | --- | --- |';

  const rows = hats.map((hat) => {
    const publishes = hat.publishTopics.length > 0
      ? hat.publishTopics.join(', ')
      : '—';
    const subscribes = hat.subscribeTopics.length > 0
      ? hat.subscribeTopics.join(', ')
      : '—';
    const isolation = isolatedIds.has(hat.id)
      ? ' ⚠ ISOLATED'
      : '';
    return `| ${hat.id}${isolation} | ${hat.role} | ${publishes} | ${subscribes} |`;
  });

  return [header, divider, ...rows].join('\n');
}

// ─── Data-flow description ────────────────────────────────────────────────────

/**
 * Builds a textual description of how data flows between hats based on
 * matching publish/subscribe topic pairs.
 *
 * @param hats - All hat definitions in the topology.
 * @returns A Markdown-formatted data-flow description block.
 */
function renderDataFlowDescription(hats: HatDefinition[]): string {
  const subscribeIndex = buildSubscribeIndex(hats);
  const flowLines: string[] = [];

  for (const publisher of hats) {
    for (const topic of publisher.publishTopics) {
      const subscribers = subscribeIndex.get(topic) ?? [];
      for (const subscriber of subscribers) {
        if (subscriber !== publisher.id) {
          flowLines.push(`- \`${publisher.id}\` publishes \`${topic}\` → consumed by \`${subscriber}\``);
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
 * Builds a map from topic name to the list of hat ids that subscribe to it.
 *
 * @param hats - All hat definitions.
 * @returns A `Map<topic, hatId[]>` index.
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

// ─── Reachability validation ──────────────────────────────────────────────────

/**
 * Returns `true` when `hat` publishes to at least one topic that another hat
 * (not itself) subscribes to.
 *
 * @param hat - The hat to test.
 * @param subscribeIndex - Map from topic to subscribing hat ids.
 * @returns Whether this hat can reach any other hat via its publish topics.
 */
function canPublishToOther(
  hat: HatDefinition,
  subscribeIndex: Map<string, string[]>,
): boolean {
  return hat.publishTopics.some((topic) => {
    const subscribers = subscribeIndex.get(topic) ?? [];
    return subscribers.some((id) => id !== hat.id);
  });
}

/**
 * Returns `true` when `hat` subscribes to at least one topic that any other
 * hat publishes.
 *
 * @param hat - The hat to test.
 * @param publishedTopics - Set of all topics published across the topology.
 * @returns Whether this hat can receive from any other hat via its subscribe topics.
 */
function canReceiveFromOther(
  hat: HatDefinition,
  publishedTopics: Set<string>,
): boolean {
  return hat.subscribeTopics.some((topic) => publishedTopics.has(topic));
}

/**
 * Builds the set of all topics published by any hat in the topology.
 *
 * @param hats - All hat definitions.
 * @returns A `Set<string>` of all published topic names.
 */
function buildPublishedTopics(hats: HatDefinition[]): Set<string> {
  const topics = new Set<string>();

  for (const hat of hats) {
    for (const topic of hat.publishTopics) {
      topics.add(topic);
    }
  }

  return topics;
}

/**
 * Returns the set of active hat ids that are isolated — i.e. they neither
 * publish to any topic that another hat subscribes to, nor subscribe to any
 * topic that another hat publishes.
 *
 * @param hats - All hat definitions in the topology.
 * @param activeSet - The set of currently active hat ids.
 * @returns A `Set<string>` of isolated active hat ids.
 */
function findIsolatedHats(hats: HatDefinition[], activeSet: Set<string>): Set<string> {
  if (activeSet.size <= 1) {
    // A solo hat cannot be "isolated" in the multi-hat sense.
    return new Set();
  }

  const subscribeIndex = buildSubscribeIndex(hats);
  const publishedTopics = buildPublishedTopics(hats);
  const isolated = new Set<string>();

  for (const hat of hats) {
    if (!activeSet.has(hat.id)) {
      continue;
    }

    if (!canPublishToOther(hat, subscribeIndex) && !canReceiveFromOther(hat, publishedTopics)) {
      isolated.add(hat.id);
    }
  }

  return isolated;
}

// ─── Hat instructions ─────────────────────────────────────────────────────────

/**
 * Renders the instruction blocks for each active hat.
 *
 * @param activeHats - Hat definitions filtered to active hats only.
 * @returns The rendered instruction blocks joined by blank lines.
 */
function renderHatInstructions(activeHats: HatDefinition[]): string {
  const blocks = activeHats.map((hat) => {
    const publishConstraint =
      hat.publishTopics.length > 0
        ? `\n\n**Publish constraint:** You MAY only emit events on the following topics: ${hat.publishTopics.map((t) => `\`${t}\``).join(', ')}.`
        : '\n\n**Publish constraint:** This hat has no authorised publish topics.';

    return [`### \`${hat.id}\` — ${hat.name}`, '', hat.instructions, publishConstraint].join('\n');
  });

  return blocks.join('\n\n');
}
