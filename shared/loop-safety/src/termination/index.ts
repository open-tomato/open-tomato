export { TerminationReason, TERMINATION_EXIT_CODES } from './types.js';
export type { TerminationResult } from './types.js';

export { ThrottleTracker } from './throttle-tracker.js';
export type { ThrottleTrackerConfig } from './throttle-tracker.js';

export { StaleDetector } from './stale-detector.js';
export type { StaleDetectorConfig } from './stale-detector.js';

export { FailureTracker } from './failure-tracker.js';
export type { FailureTrackerConfig } from './failure-tracker.js';

export { BackpressureValidator } from './backpressure-validator.js';
export type { BuildEvidence } from './backpressure-validator.js';

export { BudgetTracker } from './budget-tracker.js';
export type { BudgetTrackerConfig } from './budget-tracker.js';

export { TerminationChecker } from './termination-checker.js';
export type { TerminationCheckerConfig } from './termination-checker.js';

export { BUILD_BLOCKED_TOPIC, synthesizeBlockedEvent } from './build-evidence.js';
export type { BuildBlockedEvent } from './build-evidence.js';

export { createWorkspaceExistsCheck } from './workspace-check.js';
