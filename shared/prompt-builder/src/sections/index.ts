/**
 * Prompt section implementations for `@open-tomato/prompt-builder`.
 *
 * Each section corresponds to one block of the 10-section prompt assembly
 * pipeline and implements the {@link PromptSection} interface.
 */

export { AutoInjectedSkillsSection } from './auto-injected-skills.js';
export { CorePromptSection } from './core-prompt.js';
export { SkillIndexSection } from './skill-index.js';
export { ObjectiveSection } from './objective.js';
export { RobotGuidanceSection } from './robot-guidance.js';
export { PendingEventsSection } from './pending-events.js';
export { WorkflowSection } from './workflow.js';
export { HatsSection } from './hats.js';
export { EventWritingSection } from './event-writing.js';
export { DoneSection } from './done.js';
