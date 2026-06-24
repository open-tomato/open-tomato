import type { SkillManifest } from '@open-tomato/types';

/**
 * Source of active skills available for injection into the prompt.
 */
export interface SkillSource {
  /**
   * Returns the list of skills currently active for the agent loop iteration.
   */
  getActiveSkills(): Promise<SkillManifest[]>;
}
