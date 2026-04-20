/**
 * Metadata and content for a single skill available to the agent.
 */
export interface SkillManifest {
  /** Unique skill identifier. */
  id: string;

  /** Display name. */
  name: string;

  /** One-sentence description used in the skill index table. */
  description: string;

  /** XML tag name wrapping the skill docs in Section 1 (e.g. `memory-data`). */
  xmlTag: string;

  /** Full skill documentation injected inside the XML tag. */
  docs: string;
}
