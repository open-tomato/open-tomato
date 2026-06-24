/**
 * Model preset definitions and approved registry.
 *
 * The task-worker only allows models from this approved list to prevent
 * broken states where models incompatible with tool use or coding are
 * attempted. The executor selects a preset by name; the task-worker
 * resolves it to CLI flags and environment configuration.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** How the model is accessed — Anthropic's API or a custom OpenAI-compatible endpoint. */
export type ProviderType = 'anthropic' | 'custom';

export const ProviderTypeSchema = z.enum(['anthropic', 'custom']);

export interface ModelCapabilities {
  /** Model supports tool use / function calling. */
  readonly toolUse: boolean;
  /** Model is suitable for code generation and editing. */
  readonly coding: boolean;
  /** Model supports streaming output. */
  readonly streaming: boolean;
}

export interface ModelPreset {
  /** Short name used as the preset identifier (e.g. 'sonnet', 'haiku', 'local-qwen'). */
  readonly name: string;
  /** Full model identifier passed to `claude --model` (e.g. 'claude-sonnet-4-20250514'). */
  readonly model: string;
  /** Provider type — determines env configuration. */
  readonly provider: ProviderType;
  /** Base URL for custom providers (e.g. 'http://localhost:11434/v1'). */
  readonly providerUrl?: string;
  /** Capability flags — used to validate the model is suitable for the task. */
  readonly capabilities: ModelCapabilities;
}

export const ModelPresetSchema: z.ZodType<ModelPreset> = z.object({
  name: z.string().min(1),
  model: z.string().min(1),
  provider: ProviderTypeSchema,
  providerUrl: z.string().url()
    .optional(),
  capabilities: z.object({
    toolUse: z.boolean(),
    coding: z.boolean(),
    streaming: z.boolean(),
  }),
});

// ---------------------------------------------------------------------------
// Approved Presets
// ---------------------------------------------------------------------------

/**
 * Registry of approved model presets. Only models in this list can be used
 * by the task-worker. Each preset has been verified to support tool use
 * and code generation.
 */
export const APPROVED_PRESETS: readonly ModelPreset[] = [
  // ── Anthropic remote models ──────────────────────────────────────────
  {
    name: 'opus',
    model: 'claude-opus-4-20250514',
    provider: 'anthropic',
    capabilities: { toolUse: true, coding: true, streaming: true },
  },
  {
    name: 'sonnet',
    model: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    capabilities: { toolUse: true, coding: true, streaming: true },
  },
  {
    name: 'haiku',
    model: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    capabilities: { toolUse: true, coding: true, streaming: true },
  },

  // ── Local models (via Ollama or compatible provider) ─────────────────
  {
    name: 'local-qwen-14b',
    model: 'qwen2.5-coder:14b',
    provider: 'custom',
    providerUrl: 'http://localhost:11434/v1',
    capabilities: { toolUse: true, coding: true, streaming: true },
  },
] as const;

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const presetsByName = new Map(APPROVED_PRESETS.map((p) => [p.name, p]));

/** Returns the preset matching `name`, or `undefined` if not in the approved list. */
export function getPreset(name: string): ModelPreset | undefined {
  return presetsByName.get(name);
}

/**
 * Returns the preset matching `name`.
 * @throws {Error} If the name is not in the approved list.
 */
export function validatePreset(name: string): ModelPreset {
  const preset = presetsByName.get(name);
  if (!preset) {
    const available = APPROVED_PRESETS.map((p) => p.name).join(', ');
    throw new Error(
      `Unknown model preset '${name}'. Approved presets: ${available}`,
    );
  }
  return preset;
}

/** Returns the names of all approved presets. */
export function listPresetNames(): readonly string[] {
  return APPROVED_PRESETS.map((p) => p.name);
}
