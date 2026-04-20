/**
 * Describes an agent persona (hat) within the topology, including its
 * pub/sub contracts and behavioural instructions.
 */
export interface HatDefinition {
  /** Unique identifier matching the runtime hat id. */
  id: string;

  /** Human-readable display name. */
  name: string;

  /** One-line description of the hat's responsibility. */
  role: string;

  /** Topics this hat is allowed to publish. */
  publishTopics: string[];

  /** Topics this hat subscribes to. */
  subscribeTopics: string[];

  /** Prompt content injected when this hat is active. */
  instructions: string;
}

/**
 * Full hat graph used to validate reachability and render topology tables.
 */
export interface HatTopology {
  /** All hats participating in this orchestration session. */
  hats: HatDefinition[];

  /**
   * Adjacency map: hat id → set of hat ids it can directly delegate to.
   * Derived from matching publish/subscribe topic pairs.
   */
  edges: Record<string, string[]>;
}
