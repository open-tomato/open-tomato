/**
 * Shared domain types for the Bifemecanico agent system.
 *
 * Types exported from this package are consumed by multiple packages
 * (e.g. `@open-tomato/prompt-builder`, `@open-tomato/hat-system`) and live
 * here to avoid duplication.
 */

// Guardrails
export type { GuardrailLevel, GuardrailRule } from './guardrails.js';

// Hats
export type { HatDefinition, HatTopology } from './hats.js';

// Memory
export type { MemoryBlock } from './memory.js';

// Events
export type { PendingEvent } from './events.js';

// Skills
export type { SkillManifest } from './skills.js';

// Robot Service
export type { RobotService } from './robot-service.js';
export { RobotServiceConfigSchema } from './robot-service-config.js';
export type { RobotServiceConfig } from './robot-service-config.js';

// Incoming messages
export type { IncomingMessage } from './incoming-message.js';

// Instincts (hive learning)
export type { InstinctRecord, BlessedBundle, SyncPayload } from './instincts.js';

// Wave events (parallel worker dispatch)
export type { WaveEvent, WaveGroup, WaveState, WaveTrackerEntry, WaveWorkerResult, WaveDispatchOptions, SpawnWorkerOptions, SpawnFn } from './wave-events.js';

// Human-in-the-loop events
export {
  HumanInteractEventSchema,
  HumanResponseEventSchema,
  HumanGuidanceEventSchema,
  HumanEventSchema,
} from './human-events.js';
export type {
  HumanInteractEvent,
  HumanResponseEvent,
  HumanGuidanceEvent,
  HumanEvent,
} from './human-events.js';
