/**
 * Trigger names reserved by the orchestrator runtime.
 * Hat definitions must not use any of these names as triggers.
 */
export const RESERVED_TRIGGER_NAMES = new Set([
  '__start__',
  '__stop__',
  '__error__',
  '__timeout__',
  '__tick__',
  '__init__',
  '__teardown__',
]);
