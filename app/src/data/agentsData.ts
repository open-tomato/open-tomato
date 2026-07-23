/**
 * Agent editor option sources (WS07 session 2).
 *
 * The model catalog and grouped tool surface behind the New/Edit/Clone
 * Agent form. Config-level fixtures (deterministic, workspace-independent):
 * capability groups gate which tools a model unlocks, and the blended rate
 * sizes the token-budget slider. Kept UI-free — icons are lucide glyph
 * names the page maps onto the Icon atom.
 */

import type { AgentEditorOptions, AgentModelDef, AgentToolGroup } from './types';

const MODELS: AgentModelDef[] = [
  {
    id: 'haiku-4-5',
    name: 'claude-haiku-4-5',
    speed: 'fast',
    caps: ['chat', 'web'],
    blendedUsdPerMTok: 0.75,
    description: 'Fast, light tasks. Web + content tools.',
    cost: '$0.25/MTok in · $1.25/MTok out',
  },
  {
    id: 'sonnet-4-5',
    name: 'claude-sonnet-4-5',
    speed: 'medium',
    caps: ['chat', 'web', 'code', 'db'],
    blendedUsdPerMTok: 9,
    description: 'Balanced reasoning. Full code-exec surface.',
    cost: '$3/MTok in · $15/MTok out',
  },
  {
    id: 'opus-4-1',
    name: 'claude-opus-4-1',
    speed: 'slow',
    caps: ['chat', 'web', 'code', 'db', 'browser', 'parallel'],
    blendedUsdPerMTok: 45,
    description: 'Deepest reasoning. Browser + parallel exec.',
    cost: '$15/MTok in · $75/MTok out',
  },
];

/** Capability group → tools it unlocks (display order preserved). */
const TOOL_GROUPS: AgentToolGroup[] = [
  {
    cap: 'code',
    tools: [
      { id: 'fs', icon: 'folder', label: 'fs', description: 'Read & write project files' },
      { id: 'shell', icon: 'terminal', label: 'shell', description: 'Execute shell commands' },
      { id: 'git', icon: 'git-branch', label: 'git', description: 'Branch, commit, push' },
      { id: 'tests', icon: 'shield-check', label: 'tests', description: 'Run the test suite' },
    ],
  },
  {
    cap: 'web',
    tools: [
      { id: 'web.fetch', icon: 'globe', label: 'web.fetch', description: 'Fetch URLs' },
      { id: 'web.search', icon: 'search', label: 'web.search', description: 'Run search queries' },
    ],
  },
  {
    cap: 'db',
    tools: [
      { id: 'db.read', icon: 'database', label: 'db.read', description: 'Read queries only' },
      { id: 'db.write', icon: 'database', label: 'db.write', description: 'Mutating queries (review-gated)' },
    ],
  },
  {
    cap: 'browser',
    tools: [
      { id: 'browser', icon: 'layout', label: 'browser', description: 'Headless browser + screenshots' },
    ],
  },
  {
    cap: 'parallel',
    tools: [
      { id: 'subagent', icon: 'users', label: 'subagent', description: 'Spawn child agents' },
    ],
  },
  {
    cap: 'chat',
    tools: [
      { id: 'chat.summarize', icon: 'message-square', label: 'chat.summarize', description: 'Summarise long context' },
      { id: 'chat.draft', icon: 'pencil', label: 'chat.draft', description: 'Compose replies & posts' },
    ],
  },
];

export const buildAgentEditorOptions = (): AgentEditorOptions => ({
  models: MODELS,
  toolGroups: TOOL_GROUPS,
});
