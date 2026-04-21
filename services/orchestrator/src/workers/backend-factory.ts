import type { BackendDescriptor } from './backend-descriptor.js';

/** Named backends with pre-configured descriptors. */
type NamedBackend = 'claude' | 'gemini' | 'codex';

const CLAUDE_DESCRIPTOR: BackendDescriptor = {
  name: 'claude',
  command: 'claude',
  args: ['--output-format', 'stream-json', '--dangerously-skip-permissions'],
  promptMode: 'flag',
  outputFormat: 'stream-json',
  envVars: {},
};

/**
 * OQ-4 (resolved): `--yolo` is the Gemini CLI equivalent of Claude's
 * `--dangerously-skip-permissions`. Validated via `npx @google/gemini-cli
 * --help` (v0.35.3) — described as "Automatically accept all actions".
 */
const GEMINI_DESCRIPTOR: BackendDescriptor = {
  name: 'gemini',
  command: 'gemini',
  args: ['--yolo'],
  promptMode: 'flag',
  outputFormat: 'text',
  envVars: {},
};

const CODEX_DESCRIPTOR: BackendDescriptor = {
  name: 'codex',
  command: 'codex',
  args: [],
  promptMode: 'flag',
  outputFormat: 'text',
  envVars: {},
};

const NAMED_DESCRIPTORS: Record<NamedBackend, BackendDescriptor> = {
  claude: CLAUDE_DESCRIPTOR,
  gemini: GEMINI_DESCRIPTOR,
  codex: CODEX_DESCRIPTOR,
};

/** Factory for creating backend descriptors from named presets or custom configs. */
export const BackendFactory = {
  /** Returns a pre-configured descriptor for a known backend. */
  create(name: NamedBackend): BackendDescriptor {
    return NAMED_DESCRIPTORS[name];
  },

  /** Validates and returns an operator-supplied descriptor as-is. */
  createCustom(descriptor: BackendDescriptor): BackendDescriptor {
    return { ...descriptor };
  },
} as const;
